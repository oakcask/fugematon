import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startListeningServer } from "./listening-server.js";
import { writeAbReviewBundle } from "./review.js";

test("listening server validates blind assets and atomically saves conflict-aware responses", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-listening-"));
  try {
    await writeAbReviewBundle(
      directory,
      960,
      "baseline-label",
      "variant-label",
      "baseline",
      "section-local-planner",
      undefined,
      undefined,
      undefined,
      ["fugue-smoke", "minor-entry"],
    );
    const bundleBefore = await readFile(join(directory, "blind-session.json"), "utf8");
    const listening = await startListeningServer({ bundleDirectory: directory });
    try {
      const page = await fetch(listening.url);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Blind Listening Review/);

      const session = (await fetchJson(`${listening.url}api/session`)) as {
        responseRevision: number;
        comparisons: {
          id: string;
          allowedFocusedRegions: { id: string; startTick: number; endTick: number }[];
          sides: { a: { assetToken: string }; b: { assetToken: string } };
        }[];
        modelVersion?: string;
      };
      assert.equal(session.modelVersion, undefined);
      assert.equal(session.comparisons.length, 2);
      const comparison = session.comparisons[0]!;
      assert.ok(
        comparison.allowedFocusedRegions.some(
          (region) => region.id === "full" && region.startTick === 0 && region.endTick > region.startTick,
        ),
      );
      assert.doesNotMatch(JSON.stringify(session), /baseline-label|variant-label|section-local-planner/);
      const score = (await fetchJson(`${listening.url}api/asset/${comparison.sides.a.assetToken}`)) as unknown[];
      assert.ok(score.length > 0);

      const response = {
        listeningResponseSchema: "fugematon-listening-response/v1",
        comparisonId: comparison.id,
        preferredSide: "a",
        confidence: 4,
        compositionReasonTags: ["entry-clarity"],
        blindMappingRevision: 1,
        listeningCoverage: {
          a: { playCount: 1, listenedTicks: [[0, 480]], accumulatedListenedSeconds: 1 },
          b: { playCount: 1, listenedTicks: [[0, 480]], accumulatedListenedSeconds: 1 },
          sideSwitchCount: 1,
          usedFocusedLoop: false,
          usedFullScore: true,
          requestedRenderer: "oscillator",
          activeRenderer: "oscillator",
          performanceProfile: "organ-default",
          sessionSchemaVersion: "fugematon-listening-session/v1",
        },
        responseStatus: "blind",
        revisionKind: "blind",
        responseRevision: 1,
        auditEvents: [{ type: "choice-saved", sequence: 1 }],
      };
      const saved = (await fetchJson(`${listening.url}api/responses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: 0, response, lastComparisonId: comparison.id }),
      })) as { revision: number; responses: unknown[] };
      assert.equal(saved.revision, 1);
      assert.equal(saved.responses.length, 1);

      const conflict = await fetch(`${listening.url}api/responses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: 0, response }),
      });
      assert.equal(conflict.status, 409);
      assert.match(await conflict.text(), /listening\.response\.revision-conflict/);

      const invalidProvenance = await fetch(`${listening.url}api/responses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 1,
          response: { ...response, listeningResponseSchema: "fugematon-listening-response/v99", responseRevision: 2 },
        }),
      });
      assert.equal(invalidProvenance.status, 400);
      assert.match(await invalidProvenance.text(), /listening\.response\.provenance-mismatch/);

      const reveal = await fetch(`${listening.url}api/reveal/${comparison.id}`, { method: "POST" });
      assert.equal(reveal.status, 200);
      assert.match(await reveal.text(), /baseline|variant/);
      assert.equal(await readFile(join(directory, "blind-session.json"), "utf8"), bundleBefore);
    } finally {
      await listening.close();
    }

    const resumed = await startListeningServer({ bundleDirectory: directory });
    try {
      const responses = (await fetchJson(`${resumed.url}api/responses`)) as { revision: number; responses: unknown[] };
      assert.equal(responses.revision, 2);
      assert.equal(responses.responses.length, 1);
    } finally {
      await resumed.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("listening server rejects score-level A/B timing context mismatch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-listening-context-"));
  try {
    await writeAbReviewBundle(
      directory,
      960,
      "baseline-label",
      "variant-label",
      "baseline",
      "section-local-planner",
      undefined,
      undefined,
      undefined,
      ["fugue-smoke"],
    );
    const bundleFile = join(directory, "blind-session.json");
    const bundle = JSON.parse(await readFile(bundleFile, "utf8")) as {
      comparisons: { sides: { b: { scoreAsset: string; scoreSha256: string } } }[];
    };
    const side = bundle.comparisons[0]!.sides.b;
    const scoreFile = join(directory, side.scoreAsset);
    const events = JSON.parse(await readFile(scoreFile, "utf8")) as Array<{
      kind?: string;
      type?: string;
      payload?: Record<string, unknown>;
    }>;
    const meter = events.find((event) => event.kind === "meta" && event.type === "time-signature");
    assert.ok(meter?.payload);
    meter.payload.denominator = 8;
    const bytes = Buffer.from(`${JSON.stringify(events, null, 2)}\n`);
    await writeFile(scoreFile, bytes);
    side.scoreSha256 = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    await writeFile(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`);
    await assert.rejects(startListeningServer({ bundleDirectory: directory }), /listening\.context\.mismatch/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("listening server rejects unsafe and changed immutable assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-listening-invalid-"));
  try {
    await writeAbReviewBundle(
      directory,
      960,
      "baseline-label",
      "variant-label",
      "baseline",
      "section-local-planner",
      undefined,
      undefined,
      undefined,
      ["fugue-smoke"],
    );
    const bundleFile = join(directory, "blind-session.json");
    const bundleText = await readFile(bundleFile, "utf8");
    const unsafe = JSON.parse(bundleText) as {
      comparisons: { sides: { a: { midiAsset: string }; b: { midiAsset: string } } }[];
    };
    unsafe.comparisons[0]!.sides.a.midiAsset = "../outside.mid";
    await writeFile(bundleFile, `${JSON.stringify(unsafe, null, 2)}\n`);
    await assert.rejects(
      startListeningServer({ bundleDirectory: directory }),
      /evaluation\.pairwise\.unsafe-asset-path/,
    );

    await writeFile(bundleFile, bundleText);
    const restored = JSON.parse(bundleText) as {
      comparisons: { sides: { a: { midiAsset: string } } }[];
    };
    await writeFile(join(directory, restored.comparisons[0]!.sides.a.midiAsset), "changed");
    await assert.rejects(startListeningServer({ bundleDirectory: directory }), /listening\.asset\.hash-mismatch/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    assert.fail(await response.text());
  }
  return response.json();
}
