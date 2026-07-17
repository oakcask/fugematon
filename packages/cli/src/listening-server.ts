import { createHash } from "node:crypto";
import { access, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  PAIRWISE_RESPONSE_SCHEMA,
  type PairwiseBundleManifest,
  type PairwiseHiddenMapping,
  type PairwiseResponse,
  type PairwiseResponseSet,
  validatePairwiseBundle,
  validatePairwiseResponses,
} from "@fugematon/evaluation";

type ListeningCoverage = {
  a: { playCount: number; listenedTicks: [number, number][]; accumulatedListenedSeconds: number };
  b: { playCount: number; listenedTicks: [number, number][]; accumulatedListenedSeconds: number };
  sideSwitchCount: number;
  usedFocusedLoop: boolean;
  usedFullScore: boolean;
  requestedRenderer: "oscillator";
  activeRenderer: "oscillator" | "failed";
  performanceProfile: string;
  sessionSchemaVersion: typeof LISTENING_SESSION_SCHEMA;
};

type ListeningResponse = PairwiseResponse & {
  listeningResponseSchema: typeof LISTENING_RESPONSE_SCHEMA;
  blindMappingRevision: 1;
  focusedRegion?: { startTick: number; endTick: number };
  listeningCoverage: ListeningCoverage;
  responseStatus: "blind" | "revealed" | "analysis-assisted";
  responseRevision: number;
  auditEvents: { type: "choice-saved" | "revealed" | "analysis-assisted-revision"; sequence: number }[];
};

const LISTENING_SESSION_SCHEMA = "fugematon-listening-session/v1" as const;
const LISTENING_RESPONSE_SCHEMA = "fugematon-listening-response/v1" as const;

type ListeningResponseSet = Omit<PairwiseResponseSet, "responses"> & {
  revision: number;
  lastComparisonId?: string;
  responses: ListeningResponse[];
};

type ListeningSession = {
  bundle: PairwiseBundleManifest;
  hiddenMapping?: PairwiseHiddenMapping & {
    models?: unknown;
    analysis?: { comparisonId: string; baseline: unknown; variant: unknown }[];
  };
  root: string;
  responseFile: string;
  responses: ListeningResponseSet;
  readOnly: boolean;
  playbackContexts: Map<string, PlaybackContext>;
};

type PlaybackContext = {
  ticksPerQuarter: number;
  meter: { numerator: number; denominator: number };
  bpm: number;
  comparableEndTick: number;
  allowedFocusedRegions: { id: string; label: string; startTick: number; endTick: number }[];
};

export async function startListeningServer(input: {
  bundleDirectory: string;
  responseFile?: string;
  readOnly?: boolean;
  startComparison?: string;
  port?: number;
}): Promise<{ server: Server; url: string; close: () => Promise<void> }> {
  const session = await loadListeningSession(input);
  const server = createServer((request, response) => {
    routeRequest(session, request, response, input.startComparison).catch((error: unknown) => {
      const message = evaluationMessage(
        "listening.server.internal",
        "The local listening request could not be completed.",
        "Retry the request; if it repeats, restart the local session.",
      );
      sendJson(response, 500, { error: message, cause: error instanceof Error ? error.name : "unknown" });
    });
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(input.port ?? 0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("listening.server.address: Loopback address was unavailable. Action: retry the listen command.");
  return {
    server,
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose()))),
  };
}

async function loadListeningSession(input: {
  bundleDirectory: string;
  responseFile?: string;
  readOnly?: boolean;
}): Promise<ListeningSession> {
  const root = await realpath(input.bundleDirectory);
  const bundle = JSON.parse(await readFile(join(root, "blind-session.json"), "utf8")) as PairwiseBundleManifest;
  let hiddenMapping: ListeningSession["hiddenMapping"];
  try {
    hiddenMapping = JSON.parse(
      await readFile(join(root, "hidden-side-mapping.json"), "utf8"),
    ) as ListeningSession["hiddenMapping"];
  } catch (error: unknown) {
    if (!isMissing(error)) throw error;
  }
  validatePairwiseBundle(bundle, hiddenMapping);
  await validateAssets(root, bundle);
  const playbackContexts = await loadPlaybackContexts(root, bundle);
  const responseFile = resolve(input.responseFile ?? join(root, "pairwise-responses.json"));
  if (!inside(root, responseFile) && input.responseFile === undefined) {
    throw new Error(
      evaluationMessage(
        "listening.response.unsafe-path",
        "The response target is outside the allowlisted session boundary.",
        "Choose an explicit response file or keep the generated default inside the bundle.",
      ),
    );
  }
  const responses = await loadResponses(bundle, responseFile);
  return {
    bundle,
    hiddenMapping,
    root,
    responseFile,
    responses,
    readOnly: input.readOnly ?? false,
    playbackContexts,
  };
}

async function validateAssets(root: string, bundle: PairwiseBundleManifest): Promise<void> {
  for (const comparison of bundle.comparisons) {
    for (const side of [comparison.sides.a, comparison.sides.b]) {
      for (const [asset, expected] of [
        [side.midiAsset, side.midiSha256],
        [side.scoreAsset, side.scoreSha256],
      ] as const) {
        if (asset === undefined || expected === undefined) continue;
        const resolved = resolve(root, asset);
        if (!inside(root, resolved)) {
          throw new Error(
            evaluationMessage(
              "listening.asset.unsafe-path",
              "A source asset escapes the allowlisted bundle root.",
              "Regenerate the bundle with relative immutable asset paths.",
            ),
          );
        }
        let canonical: string;
        try {
          canonical = await realpath(resolved);
        } catch (error: unknown) {
          if (isMissing(error)) {
            throw new Error(
              evaluationMessage(
                "listening.asset.missing",
                "A blinded comparison cannot be played because an immutable asset is missing.",
                "Regenerate the bundle or restore its generated assets.",
              ),
            );
          }
          throw error;
        }
        if (!inside(root, canonical)) {
          throw new Error(
            evaluationMessage(
              "listening.asset.symlink-escape",
              "A source asset resolves outside the allowlisted bundle root.",
              "Replace the symlink with an immutable in-bundle asset.",
            ),
          );
        }
        const bytes = await readFile(canonical);
        if (sha256(bytes) !== expected) {
          throw new Error(
            evaluationMessage(
              "listening.asset.hash-mismatch",
              "A source asset changed after bundle generation, so blind comparison identity is invalid.",
              "Regenerate the bundle and start a new response session.",
            ),
          );
        }
      }
    }
  }
}

async function loadPlaybackContexts(
  root: string,
  bundle: PairwiseBundleManifest,
): Promise<Map<string, PlaybackContext>> {
  const result = new Map<string, PlaybackContext>();
  for (const comparison of bundle.comparisons) {
    const [a, b] = await Promise.all(
      (["a", "b"] as const).map(async (side) => {
        const asset = comparison.sides[side].scoreAsset;
        if (asset === undefined) return undefined;
        const events = JSON.parse(await readFile(join(root, asset), "utf8")) as Array<{
          kind?: string;
          type?: string;
          tick?: number;
          startTick?: number;
          durationTicks?: number;
          payload?: Record<string, unknown>;
        }>;
        const meta = (type: string) => events.find((event) => event.kind === "meta" && event.type === type)?.payload;
        const timebase = meta("timebase")?.ticksPerQuarter;
        const meter = meta("time-signature");
        const tempo = meta("tempo-change")?.bpm ?? 84;
        const end = Math.max(
          0,
          ...events.map((event) =>
            event.kind === "note"
              ? (event.startTick ?? 0) + (event.durationTicks ?? 0)
              : event.type === "score-end"
                ? Number(event.payload?.lengthTicks ?? event.tick ?? 0)
                : 0,
          ),
        );
        if (
          !Number.isSafeInteger(timebase) ||
          !(Number(timebase) > 0) ||
          !Number.isSafeInteger(meter?.numerator) ||
          !(Number(meter?.numerator) > 0) ||
          !Number.isSafeInteger(meter?.denominator) ||
          !(Number(meter?.denominator) > 0) ||
          !Number.isFinite(tempo) ||
          !(Number(tempo) > 0) ||
          !Number.isSafeInteger(end) ||
          end <= 0
        )
          throw new Error(
            evaluationMessage(
              "listening.context.missing-score-metadata",
              "A score asset lacks timing metadata needed for controlled A/B playback.",
              "Regenerate both score assets with timebase, meter, tempo, and score-end metadata.",
            ),
          );
        return {
          ticksPerQuarter: Number(timebase),
          numerator: Number(meter?.numerator),
          denominator: Number(meter?.denominator),
          bpm: Number(tempo),
          end,
        };
      }),
    );
    if (
      a === undefined ||
      b === undefined ||
      a.ticksPerQuarter !== b.ticksPerQuarter ||
      a.numerator !== b.numerator ||
      a.denominator !== b.denominator ||
      a.bpm !== b.bpm
    )
      throw new Error(
        evaluationMessage(
          "listening.context.mismatch",
          "A and B do not share the same timebase, meter, tempo, and renderer timing context.",
          "Regenerate both sides from one controlled performance context.",
        ),
      );
    const comparableEndTick = Math.min(a.end, b.end, comparison.context.lengthTicks);
    const barTicks = (a.ticksPerQuarter * 4 * a.numerator) / a.denominator;
    if (!Number.isSafeInteger(barTicks) || barTicks <= 0)
      throw new Error(
        evaluationMessage(
          "listening.context.unsupported-meter",
          "Bar-aligned focused regions cannot be represented with integer ticks.",
          "Regenerate the score with a compatible timebase or meter.",
        ),
      );
    const openingEnd = Math.min(comparableEndTick, barTicks * 4);
    const terminalStart = Math.max(0, comparableEndTick - barTicks * 4);
    const regions = [
      { id: "full", label: "Full comparable score", startTick: 0, endTick: comparableEndTick },
      { id: "opening-four-bars", label: "Opening four bars", startTick: 0, endTick: openingEnd },
      { id: "terminal-four-bars", label: "Terminal four bars", startTick: terminalStart, endTick: comparableEndTick },
    ].filter(
      (region, index, all) =>
        region.endTick > region.startTick &&
        all.findIndex(
          (candidate) => candidate.startTick === region.startTick && candidate.endTick === region.endTick,
        ) === index,
    );
    result.set(comparison.id, {
      ticksPerQuarter: a.ticksPerQuarter,
      meter: { numerator: a.numerator, denominator: a.denominator },
      bpm: a.bpm,
      comparableEndTick,
      allowedFocusedRegions: regions,
    });
  }
  return result;
}

async function loadResponses(bundle: PairwiseBundleManifest, responseFile: string): Promise<ListeningResponseSet> {
  try {
    const value = JSON.parse(await readFile(responseFile, "utf8")) as ListeningResponseSet;
    validatePairwiseResponses(bundle, value);
    return { ...value, revision: value.revision ?? 0 };
  } catch (error: unknown) {
    if (!isMissing(error)) throw error;
    return { schema: PAIRWISE_RESPONSE_SCHEMA, bundleId: bundle.bundleId, revision: 0, responses: [] };
  }
}

async function routeRequest(
  session: ListeningSession,
  request: IncomingMessage,
  response: ServerResponse,
  startComparison?: string,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  setSecurityHeaders(response);
  if (request.method === "GET" && url.pathname === "/") {
    sendText(response, 200, LISTENING_HTML, "text/html; charset=utf-8");
    return;
  }
  if (request.method === "GET" && url.pathname === "/app.js") {
    sendText(response, 200, LISTENING_APP, "text/javascript; charset=utf-8");
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/session") {
    sendJson(response, 200, publicSession(session, startComparison));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/responses") {
    sendJson(response, 200, session.responses);
    return;
  }
  const assetMatch = url.pathname.match(/^\/api\/asset\/([^/]+)\/(a|b)$/);
  if (request.method === "GET" && assetMatch !== null) {
    const comparison = session.bundle.comparisons.find((candidate) => candidate.id === assetMatch[1]);
    const side = assetMatch[2] as "a" | "b";
    if (comparison === undefined || comparison.sides[side].scoreAsset === undefined) {
      sendJson(response, 404, {
        error: evaluationMessage(
          "listening.asset.unknown-token",
          "The blinded playback token does not identify a score asset.",
          "Reload the validated session manifest.",
        ),
      });
      return;
    }
    sendText(
      response,
      200,
      await readFile(join(session.root, comparison.sides[side].scoreAsset), "utf8"),
      "application/json; charset=utf-8",
    );
    return;
  }
  const revealMatch = url.pathname.match(/^\/api\/reveal\/([^/]+)$/);
  if (request.method === "POST" && revealMatch !== null) {
    const saved = session.responses.responses.find(
      (candidate) => candidate.comparisonId === revealMatch[1] && candidate.preferredSide !== "not-reviewed",
    );
    const mapping = session.hiddenMapping?.comparisons.find((candidate) => candidate.comparisonId === revealMatch[1]);
    if (saved === undefined || mapping === undefined) {
      sendJson(response, 409, {
        error: evaluationMessage(
          "listening.reveal.choice-required",
          "Model identity cannot be revealed before a blind response is saved.",
          "Save A, B, tie, or cannot-judge before opening analysis.",
        ),
      });
      return;
    }
    if (session.readOnly) {
      sendJson(response, 403, {
        error: evaluationMessage(
          "listening.reveal.read-only",
          "Preview mode cannot persist the reveal audit boundary.",
          "Restart without read-only preview before revealing model identity.",
        ),
      });
      return;
    }
    const body = (await readOptionalBody(request)) as { expectedRevision?: number };
    if (body.expectedRevision !== undefined && body.expectedRevision !== session.responses.revision) {
      sendJson(response, 409, {
        error: evaluationMessage(
          "listening.response.revision-conflict",
          "Another tab or process saved a newer response revision.",
          "Reload responses, review the newer value, and retry explicitly.",
        ),
        currentRevision: session.responses.revision,
      });
      return;
    }
    const listeningSaved = saved as ListeningResponse;
    if (listeningSaved.responseStatus === "blind") {
      listeningSaved.responseStatus = "revealed";
      listeningSaved.responseRevision += 1;
      listeningSaved.auditEvents = [
        ...listeningSaved.auditEvents,
        { type: "revealed", sequence: listeningSaved.auditEvents.length + 1 },
      ];
      session.responses = { ...session.responses, revision: session.responses.revision + 1 };
      await atomicWrite(session.responseFile, `${JSON.stringify(session.responses, null, 2)}\n`);
    }
    const comparison = session.bundle.comparisons.find((candidate) => candidate.id === revealMatch[1])!;
    const hiddenAnalysis = session.hiddenMapping?.analysis?.find(
      (candidate) => candidate.comparisonId === revealMatch[1],
    );
    sendJson(response, 200, {
      comparisonId: revealMatch[1],
      mapping,
      models: session.hiddenMapping?.models,
      responseRevision: session.responses.revision,
      sides: {
        a: { assetToken: `${comparison.id}/a`, featureVector: comparison.sides.a.featureVector },
        b: { assetToken: `${comparison.id}/b`, featureVector: comparison.sides.b.featureVector },
      },
      analysis:
        hiddenAnalysis === undefined
          ? undefined
          : {
              a: mapping.a === "baseline" ? hiddenAnalysis.baseline : hiddenAnalysis.variant,
              b: mapping.b === "baseline" ? hiddenAnalysis.baseline : hiddenAnalysis.variant,
            },
    });
    return;
  }
  if (request.method === "PUT" && url.pathname === "/api/responses") {
    if (session.readOnly) {
      sendJson(response, 403, {
        error: evaluationMessage(
          "listening.response.read-only",
          "Preview mode cannot modify the response artifact.",
          "Restart without read-only preview to save responses.",
        ),
      });
      return;
    }
    const body = (await readBody(request)) as {
      expectedRevision?: number;
      response?: ListeningResponse;
      lastComparisonId?: string;
    };
    if (body.expectedRevision !== session.responses.revision) {
      sendJson(response, 409, {
        error: evaluationMessage(
          "listening.response.revision-conflict",
          "Another tab or process saved a newer response revision.",
          "Reload responses, review the newer value, and retry explicitly.",
        ),
        currentRevision: session.responses.revision,
      });
      return;
    }
    if (body.response === undefined || body.response.preferredSide === "not-reviewed") {
      sendJson(response, 400, {
        error: evaluationMessage(
          "listening.response.invalid-choice",
          "A saved response must distinguish a final choice from an unanswered state.",
          "Choose A, B, tie, or cannot-judge; use navigation to skip without saving.",
        ),
      });
      return;
    }
    try {
      validateListeningResponse(session, body.response);
    } catch (error: unknown) {
      sendJson(response, 400, {
        error:
          error instanceof Error
            ? error.message
            : evaluationMessage(
                "listening.response.invalid",
                "The response does not satisfy the listening contract.",
                "Reload the session and save the response again.",
              ),
      });
      return;
    }
    const nextResponses = session.responses.responses.filter(
      (candidate) => candidate.comparisonId !== body.response!.comparisonId,
    );
    nextResponses.push(body.response);
    const next: ListeningResponseSet = {
      schema: PAIRWISE_RESPONSE_SCHEMA,
      bundleId: session.bundle.bundleId,
      revision: session.responses.revision + 1,
      lastComparisonId: body.lastComparisonId,
      responses: nextResponses.sort((a, b) => a.comparisonId.localeCompare(b.comparisonId)),
    };
    try {
      validatePairwiseResponses(session.bundle, next);
    } catch (error: unknown) {
      sendJson(response, 400, {
        error:
          error instanceof Error
            ? error.message
            : evaluationMessage(
                "listening.response.invalid",
                "The response does not satisfy the pairwise label contract.",
                "Correct the named response field and retry.",
              ),
      });
      return;
    }
    await atomicWrite(session.responseFile, `${JSON.stringify(next, null, 2)}\n`);
    session.responses = next;
    sendJson(response, 200, next);
    return;
  }
  sendJson(response, 404, {
    error: evaluationMessage(
      "listening.server.unknown-route",
      "The requested local session route does not exist.",
      "Reload the listening application entry point.",
    ),
  });
}

function publicSession(session: ListeningSession, startComparison?: string): unknown {
  return {
    schema: LISTENING_SESSION_SCHEMA,
    sessionId: `session-${session.bundle.bundleId.slice(-12)}`,
    bundleId: session.bundle.bundleId,
    bundleHash: sha256(JSON.stringify(session.bundle)),
    responseSchema: PAIRWISE_RESPONSE_SCHEMA,
    responseRevision: session.responses.revision,
    startComparison: startComparison ?? session.responses.lastComparisonId,
    readOnly: session.readOnly,
    comparisons: session.bundle.comparisons.map((comparison) => ({
      id: comparison.id,
      lengthTicks: session.playbackContexts.get(comparison.id)!.comparableEndTick,
      ticksPerQuarter: session.playbackContexts.get(comparison.id)!.ticksPerQuarter,
      meter: session.playbackContexts.get(comparison.id)!.meter,
      allowedFocusedRegions: session.playbackContexts.get(comparison.id)!.allowedFocusedRegions,
      performanceProfile: comparison.context.performanceProfile,
      writingProfile: comparison.context.writingProfile,
      sides: {
        a: { id: comparison.sides.a.id, assetToken: `${comparison.id}/a` },
        b: { id: comparison.sides.b.id, assetToken: `${comparison.id}/b` },
      },
    })),
  };
}

function validateListeningResponse(session: ListeningSession, response: ListeningResponse): void {
  const comparison = session.bundle.comparisons.find((candidate) => candidate.id === response.comparisonId);
  if (comparison === undefined) return;
  const previous = session.responses.responses.find((candidate) => candidate.comparisonId === response.comparisonId);
  if (
    response.listeningResponseSchema !== LISTENING_RESPONSE_SCHEMA ||
    response.blindMappingRevision !== 1 ||
    response.responseRevision !== (previous?.responseRevision ?? 0) + 1 ||
    response.listeningCoverage?.sessionSchemaVersion !== LISTENING_SESSION_SCHEMA ||
    response.listeningCoverage?.performanceProfile !== comparison.context.performanceProfile
  ) {
    throw new Error(
      evaluationMessage(
        "listening.response.provenance-mismatch",
        "Listening provenance or response revision does not match the validated session.",
        "Reload the session and save a response produced by the current listening UI.",
      ),
    );
  }
  for (const side of [response.listeningCoverage.a, response.listeningCoverage.b]) {
    if (
      !Number.isSafeInteger(side.playCount) ||
      side.playCount < 0 ||
      !Number.isFinite(side.accumulatedListenedSeconds) ||
      side.accumulatedListenedSeconds < 0 ||
      side.listenedTicks.some(
        (range) =>
          !Array.isArray(range) ||
          range.length !== 2 ||
          !Number.isSafeInteger(range[0]) ||
          !Number.isSafeInteger(range[1]) ||
          range[0] < 0 ||
          range[1] <= range[0] ||
          range[1] > comparison.context.lengthTicks,
      )
    ) {
      throw new Error(
        evaluationMessage(
          "listening.response.invalid-coverage",
          "Listening coverage is outside the bounded comparison timeline.",
          "Reload the session and replay the comparison before saving.",
        ),
      );
    }
  }
  if (
    response.listeningCoverage.activeRenderer === "failed" &&
    (response.preferredSide !== "cannot-judge" || !response.renderingReasonTags?.includes("renderer-mismatch"))
  ) {
    throw new Error(
      evaluationMessage(
        "listening.response.renderer-mismatch",
        "A failed renderer cannot produce a composition preference label.",
        "Save cannot-judge with the renderer-mismatch rendering reason.",
      ),
    );
  }
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    length += bytes.length;
    if (length > 1_000_000) throw new Error("listening.server.body-too-large");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readOptionalBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
  if (chunks.length === 0) return {};
  const value = Buffer.concat(chunks).toString("utf8");
  return value.length === 0 ? {} : JSON.parse(value);
}

async function atomicWrite(file: string, value: string): Promise<void> {
  await access(dirname(file));
  const temporary = `${file}.tmp`;
  await writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, file);
}

function inside(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return local === "" || (!local.startsWith(`..${sep}`) && local !== ".." && !isAbsolute(local));
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  sendText(response, status, `${JSON.stringify(value)}\n`, "application/json; charset=utf-8");
}

function sendText(response: ServerResponse, status: number, value: string, contentType: string): void {
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.end(value);
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function evaluationMessage(id: string, why: string, action: string): string {
  return `${id}: ${why} Action: ${action}`;
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

const LISTENING_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fugematon Blind Listening</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #111718; color: #edf2ed; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top, #223638, #111718 55%); }
    main { width: min(920px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; }
    header, section { background: #172123ee; border: 1px solid #385052; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 12px 30px #0005; }
    h1 { margin: 0 0 6px; font-size: clamp(1.55rem, 4vw, 2.4rem); }
    p { color: #b9c9c6; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    button, select, textarea, input { font: inherit; color: inherit; background: #101819; border: 1px solid #587578; border-radius: 10px; padding: 10px 13px; }
    button { cursor: pointer; min-height: 44px; }
    button:hover, button:focus-visible { border-color: #f0c66a; outline: 3px solid #f0c66a55; }
    button[aria-pressed="true"], .choice.selected { background: #845a22; border-color: #ffd778; }
    .side { flex: 1 1 220px; min-height: 72px; font-size: 1.2rem; }
    .choices button { flex: 1 1 130px; }
    .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .metric { background: #101819; border-radius: 10px; padding: 10px; }
    .metric span { display: block; color: #9fb4b1; font-size: .78rem; }
    label { display: grid; gap: 6px; margin-top: 12px; }
    textarea { width: 100%; min-height: 80px; resize: vertical; }
    #error { color: #ffb4a8; white-space: pre-wrap; }
    #save-status { min-height: 1.5em; color: #f0c66a; }
    #analysis[hidden] { display: none; }
    canvas { width: 100%; height: 180px; background: #0a1011; border: 1px solid #385052; border-radius: 8px; }
    .loop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
    kbd { background: #090d0e; border: 1px solid #526365; border-radius: 4px; padding: 2px 5px; }
    @media (max-width: 560px) { main { width: min(100% - 18px, 920px); padding-top: 10px; } header, section { padding: 14px; border-radius: 12px; } .status-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition: none !important; } }
  </style>
</head>
<body>
<main>
  <header><h1>Blind Listening Review</h1><p>Compare A and B before revealing model details.</p></header>
  <section aria-labelledby="progress-heading">
    <h2 id="progress-heading">Session</h2>
    <div class="status-grid">
      <div class="metric"><span>Progress</span><strong id="progress">Loading…</strong></div>
      <div class="metric"><span>Answered</span><strong id="answered">0</strong></div>
      <div class="metric"><span>Unanswered</span><strong id="unanswered">0</strong></div>
      <div class="metric"><span>Cannot judge</span><strong id="cannot-judge">0</strong></div>
      <div class="metric"><span>Conflicts</span><strong id="conflicts">0</strong></div>
      <div class="metric"><span>Renderer</span><strong id="renderer">oscillator</strong></div>
    </div>
    <label>Queue filter <select id="filter"><option value="unanswered">Unanswered first</option><option value="flagged">Flagged</option><option value="all">All</option></select></label>
  </section>
  <section aria-labelledby="listen-heading">
    <h2 id="listen-heading">Listen</h2>
    <div class="row">
      <button class="side" id="play-a" aria-label="Play or switch to side A"><strong>A</strong><br><small>Play / switch · 1</small></button>
      <button class="side" id="play-b" aria-label="Play or switch to side B"><strong>B</strong><br><small>Play / switch · 2</small></button>
    </div>
    <div class="row" style="margin-top:12px">
      <button id="pause">Play / pause · Space</button><button id="stop">Stop</button><button id="restart">Restart · R</button><button id="loop" aria-pressed="false">Focused loop · L</button>
      <input id="seek" aria-label="Shared playback position" type="range" min="0" max="1" value="0" />
    </div>
    <div class="loop-grid">
      <label>Focused region <select id="focused-region"></select></label>
      <label>Loop start tick <input id="loop-start" type="number" min="0" value="0" /></label>
      <label>Loop end tick <input id="loop-end" type="number" min="1" value="1" /></label>
    </div>
    <p id="comparable-range"></p>
    <p id="playback-status" role="status" aria-live="polite">Ready at tick 0.</p>
  </section>
  <section aria-labelledby="response-heading">
    <h2 id="response-heading">Response</h2>
    <div class="row choices"><button data-choice="a">Prefer A · A</button><button data-choice="b">Prefer B · B</button><button data-choice="tie">Tie · T</button><button data-choice="cannot-judge">Cannot judge · J</button></div>
    <label>Confidence <select id="confidence"><option value="">Not set</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
    <label>Composition reason <select id="composition-tag"><option value="">Not set</option><option value="subject-identity">Subject identity</option><option value="counter-subject-recognition">Counter-subject recognition</option><option value="line-agency">Line agency</option><option value="entry-clarity">Entry clarity</option><option value="harmony-resolution">Harmony / resolution</option><option value="episode-direction">Episode direction</option><option value="stretto-clarity">Stretto clarity</option><option value="rhythmic-independence">Rhythmic independence</option><option value="texture-continuity">Texture continuity</option><option value="repetition-interest">Repetition / interest</option><option value="cadence-closure">Cadence / closure</option></select></label>
    <label>Rendering issue <select id="rendering-tag"><option value="">None</option><option value="renderer-mismatch">Renderer mismatch</option><option value="attack-envelope">Attack / envelope</option><option value="balance-masking">Balance / masking</option><option value="latency-interruption">Latency / interruption</option><option value="distortion-clipping">Distortion / clipping</option></select></label>
    <label>Optional note <textarea id="note" maxlength="1000"></textarea></label>
    <div class="row"><button id="previous">Previous · P</button><button id="save-next">Save and next · N</button><button id="skip">Skip</button><button id="reveal">Reveal analysis</button></div>
    <p id="save-status" role="status" aria-live="polite"></p><p id="error" role="alert"></p>
  </section>
  <section id="analysis" hidden><h2>Post-choice analysis</h2><p id="analysis-mapping"></p><h3>Side A score</h3><canvas id="piano-a" aria-label="Side A synchronized piano roll"></canvas><h3>Side B score</h3><canvas id="piano-b" aria-label="Side B synchronized piano roll"></canvas><h3>Contextual feature delta</h3><pre id="analysis-content"></pre></section>
  <section><h2>Shortcuts</h2><p><kbd>1</kbd>/<kbd>2</kbd> sides · <kbd>Space</kbd> pause · <kbd>R</kbd> restart · <kbd>L</kbd> loop · <kbd>A</kbd>/<kbd>B</kbd>/<kbd>T</kbd>/<kbd>J</kbd> choice · <kbd>N</kbd> save/next · <kbd>P</kbd> previous</p></section>
</main>
<script type="module" src="/app.js"></script>
</body></html>`;

const LISTENING_APP = `
const state = { session:null, responses:null, index:0, choice:null, audio:null, activeSide:null, lastSide:'a', sources:[], scoreCache:new Map(), positionTick:0, startedAt:0, startTick:0, secPerTick:0, switches:0, conflicts:0, coverage:{a:{playCount:0,listenedTicks:[],accumulatedListenedSeconds:0},b:{playCount:0,listenedTicks:[],accumulatedListenedSeconds:0}}, usedFullScore:false, sequence:0, loop:false, saveTimer:null };
const $ = (id) => document.getElementById(id);
async function init(){
  try {
    state.session = await json('/api/session'); state.responses = await json('/api/responses');
    const start = state.session.startComparison; if(start){ const i=state.session.comparisons.findIndex(c=>c.id===start); if(i>=0) state.index=i; }
    render();
  } catch(error){ showError(error); }
}
function current(){ return state.session.comparisons[state.index]; }
function saved(){ return state.responses.responses.find(r=>r.comparisonId===current().id); }
function render(){
  clearTimeout(state.saveTimer); stopAudio(false); const c=current(); const r=saved(); state.choice=r?.preferredSide ?? null; state.positionTick=0; state.switches=0; state.coverage={a:{playCount:0,listenedTicks:[],accumulatedListenedSeconds:0},b:{playCount:0,listenedTicks:[],accumulatedListenedSeconds:0}}; state.usedFullScore=false;
  const defaultRegion=c.allowedFocusedRegions.find(region=>region.id==='opening-four-bars')??c.allowedFocusedRegions[0]; $('seek').max=String(c.lengthTicks); $('seek').value='0'; $('loop-start').max=String(Math.max(0,c.lengthTicks-1)); $('loop-start').value=String(defaultRegion.startTick); $('loop-end').max=String(c.lengthTicks); $('loop-end').value=String(defaultRegion.endTick); $('focused-region').innerHTML=c.allowedFocusedRegions.map(region=>'<option value="'+region.id+'">'+region.label+'</option>').join(''); $('focused-region').value=defaultRegion.id; $('comparable-range').textContent='Comparable range: ticks 0–'+c.lengthTicks+' · meter '+c.meter.numerator+'/'+c.meter.denominator+'.'; $('progress').textContent=(state.index+1)+' / '+state.session.comparisons.length;
  $('answered').textContent=String(state.responses.responses.length); $('unanswered').textContent=String(state.session.comparisons.length-state.responses.responses.length); $('cannot-judge').textContent=String(state.responses.responses.filter(x=>x.preferredSide==='cannot-judge').length); $('conflicts').textContent=String(state.conflicts);
  document.querySelectorAll('[data-choice]').forEach(b=>{ const selected=b.dataset.choice===state.choice; b.classList.toggle('selected',selected); b.setAttribute('aria-pressed',String(selected)); });
  $('confidence').value=r?.confidence ? String(r.confidence) : ''; $('composition-tag').value=r?.compositionReasonTags?.[0] ?? ''; $('rendering-tag').value=r?.renderingReasonTags?.[0] ?? ''; $('note').value=r?.note ?? '';
  $('analysis').hidden=true; $('error').textContent=''; $('save-status').textContent=r?'Saved response loaded.':'Unanswered.'; $('playback-status').textContent='Ready at tick 0.';
}
async function loadScore(side){ const key=current().id+'/'+side; if(!state.scoreCache.has(key)) state.scoreCache.set(key, json('/api/asset/'+key)); return state.scoreCache.get(key); }
async function play(side){
  try {
    const score=await loadScore(side); if(!state.audio) state.audio=new AudioContext(); await state.audio.resume();
    if(state.activeSide && state.activeSide!==side) state.switches++; stopAudio(false); state.activeSide=side; state.lastSide=side; state.coverage[side].playCount++;
    const notes=score.filter(e=>e.kind==='note'); const timebase=score.find(e=>e.kind==='meta'&&e.type==='timebase')?.payload.ticksPerQuarter ?? 480; const bpm=score.find(e=>e.kind==='meta'&&e.type==='tempo-change')?.payload.bpm ?? 84; const secPerTick=60/bpm/timebase; state.secPerTick=secPerTick; if(!state.loop) state.usedFullScore=true;
    const loopStart=Number($('loop-start').value); const loopEnd=Number($('loop-end').value); if(state.loop&&(loopStart<0||loopEnd<=loopStart||loopEnd>Number($('seek').max))) throw new Error('listening.playback.invalid-loop: Focused loop bounds are invalid. Action: choose a start before end inside the comparable range.'); if(state.loop&&(state.positionTick<loopStart||state.positionTick>=loopEnd)) state.positionTick=loopStart;
    state.startTick=state.positionTick; state.startedAt=state.audio.currentTime; const now=state.audio.currentTime+0.03; const endTick=state.loop?loopEnd:Number($('seek').max);
    for(const note of notes){ const noteEnd=note.startTick+note.durationTicks; if(noteEnd<=state.positionTick||note.startTick>=endTick) continue; const start=Math.max(note.startTick,state.positionTick); const osc=state.audio.createOscillator(); const gain=state.audio.createGain(); osc.frequency.value=440*Math.pow(2,(note.pitch-69)/12); gain.gain.setValueAtTime(0.0001,now+(start-state.positionTick)*secPerTick); gain.gain.exponentialRampToValueAtTime(0.035,now+(start-state.positionTick)*secPerTick+0.01); gain.gain.setValueAtTime(0.035,now+(noteEnd-state.positionTick)*secPerTick-0.01); gain.gain.exponentialRampToValueAtTime(0.0001,now+(noteEnd-state.positionTick)*secPerTick); osc.connect(gain).connect(state.audio.destination); osc.start(now+(start-state.positionTick)*secPerTick); osc.stop(now+(noteEnd-state.positionTick)*secPerTick); state.sources.push(osc); }
    $('play-a').setAttribute('aria-pressed',String(side==='a')); $('play-b').setAttribute('aria-pressed',String(side==='b')); $('playback-status').textContent='Playing '+side.toUpperCase()+' from tick '+state.positionTick+'.'; tickClock(secPerTick,endTick);
  } catch(error){ $('renderer').textContent='failed'; $('rendering-tag').value='renderer-mismatch'; choose('cannot-judge'); showError(error); stopAudio(false); }
}
function tickClock(secPerTick,endTick){ const token=state.startedAt; const frame=()=>{ if(!state.activeSide||state.startedAt!==token)return; state.positionTick=Math.min(endTick,Math.round(state.startTick+(state.audio.currentTime-state.startedAt)/secPerTick)); $('seek').value=String(state.positionTick); $('playback-status').textContent='Playing '+state.activeSide.toUpperCase()+' at tick '+state.positionTick+'.'; if(state.positionTick>=endTick){ if(state.loop){ const side=state.activeSide; state.positionTick=Number($('loop-start').value); play(side); } else stopAudio(false); } else requestAnimationFrame(frame); }; requestAnimationFrame(frame); }
function stopAudio(reset){ if(state.activeSide&&state.audio){ const end=Math.max(state.startTick,state.positionTick); state.coverage[state.activeSide].listenedTicks.push([state.startTick,end]); state.coverage[state.activeSide].accumulatedListenedSeconds+=Math.max(0,end-state.startTick)*state.secPerTick; } for(const source of state.sources){ try{source.stop();}catch{} } state.sources=[]; state.activeSide=null; $('play-a').setAttribute('aria-pressed','false'); $('play-b').setAttribute('aria-pressed','false'); if(reset) state.positionTick=0; }
function choose(value){ state.choice=value; document.querySelectorAll('[data-choice]').forEach(b=>{ const selected=b.dataset.choice===value; b.classList.toggle('selected',selected); b.setAttribute('aria-pressed',String(selected)); }); $('save-status').textContent='Draft not saved.'; scheduleAutosave(); }
function boundedRanges(ranges){ const sorted=ranges.filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]); const union=[]; for(const range of sorted){ const last=union.at(-1); if(last&&range[0]<=last[1]) last[1]=Math.max(last[1],range[1]); else union.push([...range]); } return union.slice(-32); }
async function saveResponse(goNext){ clearTimeout(state.saveTimer); if(!state.choice){ $('error').textContent='Choose A, B, tie, or cannot judge before saving.'; return; } $('save-status').textContent='Saving…'; stopAudio(false); const confidence=$('confidence').value; const composition=$('composition-tag').value; const rendering=$('rendering-tag').value; const prior=saved(); const coverage={a:{...state.coverage.a,listenedTicks:boundedRanges(state.coverage.a.listenedTicks)},b:{...state.coverage.b,listenedTicks:boundedRanges(state.coverage.b.listenedTicks)},sideSwitchCount:state.switches,usedFocusedLoop:state.loop,usedFullScore:state.usedFullScore,requestedRenderer:'oscillator',activeRenderer:$('renderer').textContent==='failed'?'failed':'oscillator',performanceProfile:current().performanceProfile,sessionSchemaVersion:'fugematon-listening-session/v1'}; const response={ listeningResponseSchema:'fugematon-listening-response/v1', comparisonId:current().id, preferredSide:state.choice, labelSource:'human', ...(confidence?{confidence:Number(confidence)}:{}), ...(composition?{compositionReasonTags:[composition]}:{}), ...(rendering?{renderingReasonTags:[rendering]}:{}), ...($('note').value?{note:$('note').value}:{}), ...(state.loop?{focusedRegion:{startTick:Number($('loop-start').value),endTick:Number($('loop-end').value)}}:{}), blindMappingRevision:1, listeningCoverage:coverage, responseStatus:prior?.responseStatus==='revealed'?'analysis-assisted':'blind', revisionKind:prior?.responseStatus==='revealed'?'analysis-assisted':'blind', responseRevision:(prior?.responseRevision??0)+1, auditEvents:[...(prior?.auditEvents??[]),{type:prior?.responseStatus==='revealed'?'analysis-assisted-revision':'choice-saved',sequence:(prior?.auditEvents?.length??0)+1}] };
  try{ state.responses=await json('/api/responses',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:state.responses.revision,response,lastComparisonId:current().id})}); $('save-status').textContent='Saved.'; updateCounts(); if(goNext) next(true); }catch(error){ if(String(error).includes('revision-conflict')){state.conflicts++;$('conflicts').textContent=String(state.conflicts);} showError(error); $('save-status').textContent='Save failed; draft retained. Reload to reconcile, then retry.'; }
}
function saveAndNext(){ return saveResponse(true); }
function scheduleAutosave(){ clearTimeout(state.saveTimer); if(!state.choice)return; state.saveTimer=setTimeout(()=>saveResponse(false),500); }
function updateCounts(){ $('answered').textContent=String(state.responses.responses.length); $('unanswered').textContent=String(state.session.comparisons.length-state.responses.responses.length); $('cannot-judge').textContent=String(state.responses.responses.filter(x=>x.preferredSide==='cannot-judge').length); }
function eligibleIndexes(){ const filter=$('filter').value; return state.session.comparisons.map((comparison,index)=>({comparison,index,response:state.responses.responses.find(r=>r.comparisonId===comparison.id)})).filter(item=>filter==='all'||(filter==='unanswered'&&!item.response)||(filter==='flagged'&&(item.response?.preferredSide==='cannot-judge'||item.response?.renderingReasonTags?.length))).map(item=>item.index); }
function next(savedOnly=false){ if(!savedOnly&&!state.choice&&!confirm('Skip this unanswered comparison?'))return; const eligible=eligibleIndexes(); const after=eligible.find(index=>index>state.index); state.index=after??eligible[0]??((state.index+1)%state.session.comparisons.length); render(); }
async function reveal(){ try{ const data=await json('/api/reveal/'+current().id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:state.responses.revision})}); state.responses.revision=data.responseRevision; const r=saved(); if(r){r.responseStatus='revealed';r.responseRevision++;r.auditEvents.push({type:'revealed',sequence:r.auditEvents.length+1});} $('analysis').hidden=false; $('analysis-mapping').textContent='A: '+data.mapping.a+' · B: '+data.mapping.b+' · models: '+JSON.stringify(data.models); const [a,b]=await Promise.all([loadScore('a'),loadScore('b')]); drawPianoRoll('piano-a',a); drawPianoRoll('piano-b',b); const deltas=featureDelta(data.sides.a.featureVector,data.sides.b.featureVector); $('analysis-content').textContent=JSON.stringify({contextualFeatureDelta:deltas,automaticEvidence:data.analysis??'not available',reviewerReasonTags:{composition:r?.compositionReasonTags??[],rendering:r?.renderingReasonTags??[]},agreementReview:'Review reason tags against the localized feature and diagnostics evidence; no automatic agreement claim is made.'},null,2); }catch(error){showError(error);} }
function featureDelta(a,b){ const right=new Map(b.features.map(f=>[f.id,f])); return a.features.map(f=>({id:f.id,a:f.value,b:right.get(f.id)?.value,deltaAminusB:f.value-(right.get(f.id)?.value??0),evidenceA:f.evidence?.slice(0,2),evidenceB:right.get(f.id)?.evidence?.slice(0,2)})).sort((x,y)=>Math.abs(y.deltaAminusB)-Math.abs(x.deltaAminusB)).slice(0,12); }
function drawPianoRoll(id,score){ const canvas=$(id); const ratio=devicePixelRatio||1; canvas.width=canvas.clientWidth*ratio;canvas.height=180*ratio; const context=canvas.getContext('2d');context.scale(ratio,ratio);const notes=score.filter(e=>e.kind==='note');const end=Math.max(1,...notes.map(n=>n.startTick+n.durationTicks));const pitches=notes.map(n=>n.pitch);const low=Math.min(...pitches),high=Math.max(...pitches,low+1);context.fillStyle='#8ecdc4';for(const note of notes){const x=note.startTick/end*canvas.clientWidth;const width=Math.max(1,note.durationTicks/end*canvas.clientWidth);const y=(high-note.pitch)/(high-low)*164+8;context.fillRect(x,y,width,3);} }
async function json(url,options){ const response=await fetch(url,options); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Request failed'); return data; }
function showError(error){ $('error').textContent=error instanceof Error?error.message:String(error); }
$('play-a').onclick=()=>play('a'); $('play-b').onclick=()=>play('b'); $('pause').onclick=()=>{if(state.activeSide){stopAudio(false);$('playback-status').textContent='Paused at tick '+state.positionTick+'.';}else play(state.lastSide);}; $('stop').onclick=()=>{stopAudio(true);$('seek').value='0';$('playback-status').textContent='Stopped at tick 0.';}; $('restart').onclick=()=>{stopAudio(true);state.positionTick=state.loop?Number($('loop-start').value):0;$('seek').value=String(state.positionTick);}; $('loop').onclick=()=>{state.loop=!state.loop;$('loop').setAttribute('aria-pressed',String(state.loop));$('playback-status').textContent=state.loop?'Focused loop '+$('loop-start').value+'–'+$('loop-end').value+' ticks.':'Full-score playback.';}; $('seek').oninput=e=>{stopAudio(false);state.positionTick=Number(e.target.value);$('playback-status').textContent='Ready at tick '+state.positionTick+'.';}; document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(b.dataset.choice)); $('save-next').onclick=saveAndNext; $('skip').onclick=()=>next(false); $('previous').onclick=()=>{state.index=(state.index-1+state.session.comparisons.length)%state.session.comparisons.length;render();}; $('reveal').onclick=reveal; $('filter').onchange=()=>next(true); for(const id of ['confidence','composition-tag','rendering-tag','note']) $(id).addEventListener('change',scheduleAutosave);
$('focused-region').onchange=()=>{ const region=current().allowedFocusedRegions.find(candidate=>candidate.id===$('focused-region').value); if(region){ stopAudio(false); $('loop-start').value=String(region.startTick); $('loop-end').value=String(region.endTick); state.positionTick=region.startTick; $('seek').value=String(region.startTick); } };
window.addEventListener('keydown',event=>{ if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return; const key=event.key.toLowerCase(); if(key==='1')play('a'); else if(key==='2')play('b'); else if(key===' '){event.preventDefault();$('pause').click();} else if(key==='r')$('restart').click(); else if(key==='l')$('loop').click(); else if(key==='a'||key==='b')choose(key); else if(key==='t')choose('tie'); else if(key==='j')choose('cannot-judge'); else if(key==='n')saveAndNext(); else if(key==='p')$('previous').click(); });
window.addEventListener('beforeunload',()=>stopAudio(false)); init();
`;
