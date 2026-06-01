import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const webPublicDir = path.join(repoRoot, "packages/web/public");
const webAppDistDir = path.join(repoRoot, "packages/web/app-dist");
const noticesModulePath = path.join(repoRoot, "packages/web/dist/notices.js");
const soundFontModulePath = path.join(repoRoot, "packages/web/dist/soundfont.js");

export function verifyPlaybackAssets({
  noticesData,
  noticeText,
  soundFontAssets,
  publicDir,
  appDistDir,
  appDistExists = existsSync(appDistDir),
}) {
  const errors = [];
  const noticePath = path.join(publicDir, "NOTICE.txt");
  if (!existsSync(noticePath)) {
    errors.push(
      "web.notices.artifact-missing: NOTICE.txt is missing; why=release bundles need a route-addressable notice artifact; action=run the web notice artifact generator before bundling",
    );
  } else if (readFileSync(noticePath, "utf8") !== noticeText) {
    errors.push(
      "web.notices.artifact-stale: NOTICE.txt does not match notices data; why=release notices must stay deterministic; action=regenerate the web notice artifact",
    );
  }

  const noticeByAssetId = new Map(noticesData.audioAssets.map((notice) => [notice.assetId, notice]));
  for (const asset of soundFontAssets) {
    if (!asset.distributed) {
      continue;
    }

    const notice = noticeByAssetId.get(asset.assetId);
    if (
      notice === undefined ||
      !notice.distributed ||
      notice.license !== asset.license ||
      notice.sourceUrl !== asset.sourceUrl
    ) {
      errors.push(
        "web.soundfont.asset-notice-mismatch: distributed SoundFont asset is missing matching notice metadata; why=audio asset delivery must stay tied to source and license notices; action=add matching audio asset notice metadata for the configured SoundFont asset",
      );
    }

    errors.push(...verifyDistributedSoundFontAsset(asset, publicDir, appDistDir, appDistExists));
  }

  return errors;
}

export function verifyDistributedSoundFontAsset(asset, publicDir, appDistDir, appDistExists) {
  const errors = [];
  const localAssetPath = localPathFromUrl(asset.url);
  if (localAssetPath === undefined) {
    if (isBlank(asset.integrity)) {
      errors.push(
        "web.soundfont.external-integrity-missing: distributed external SoundFont asset lacks an integrity record; why=external audio asset delivery needs stable verification metadata; action=add a checksum or equivalent integrity value to the asset descriptor",
      );
    }
    return errors;
  }

  if (path.basename(localAssetPath) !== asset.fileName) {
    errors.push(
      "web.soundfont.asset-filename-mismatch: distributed SoundFont URL does not match its declared file name; why=asset notices and deployed files must describe the same file; action=align the descriptor file name and URL",
    );
  }

  const publicAssetPath = path.join(publicDir, localAssetPath);
  if (!existsSync(publicAssetPath)) {
    errors.push(
      "web.soundfont.asset-delivery-missing: distributed SoundFont asset is missing from web public assets; why=the SoundFont pilot cannot be enabled for deployment without the configured SF3 file; action=place the file at the configured public URL or switch to an external asset descriptor with integrity metadata",
    );
  }

  if (appDistExists && !existsSync(path.join(appDistDir, localAssetPath))) {
    errors.push(
      "web.soundfont.asset-dist-missing: distributed SoundFont asset is missing from the web deploy artifact; why=the configured public SF3 file must be copied into the release bundle; action=run the web bundle build and verify the asset is present",
    );
  }

  return errors;
}

export function localPathFromUrl(url) {
  if (/^https?:\/\//u.test(url)) {
    return undefined;
  }

  const withoutQuery = url.split(/[?#]/u, 1)[0];
  const normalized = withoutQuery.replace(/^\.?\//u, "");
  if (normalized.length === 0 || normalized.startsWith("../")) {
    return undefined;
  }

  return normalized;
}

async function main() {
  const command = process.argv[2];
  if (command !== "write-notice" && command !== "verify") {
    throw new Error(
      "web.playback-assets.invalid-command: expected write-notice or verify; why=asset checks need an explicit mode; action=run node workflow-scripts/web-playback-assets.mjs write-notice or verify",
    );
  }

  const noticesModule = await import(pathToFileURL(noticesModulePath));
  if (command === "write-notice") {
    mkdirSync(webPublicDir, { recursive: true });
    writeFileSync(
      path.join(webPublicDir, noticesModule.NOTICE_TEXT_ARTIFACT),
      noticesModule.formatNoticesText(),
      "utf8",
    );
    return;
  }

  const soundFontModule = await import(pathToFileURL(soundFontModulePath));
  const errors = verifyPlaybackAssets({
    noticesData: noticesModule.noticesData,
    noticeText: noticesModule.formatNoticesText(),
    soundFontAssets: soundFontModule.soundFontAssets,
    publicDir: webPublicDir,
    appDistDir: webAppDistDir,
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
