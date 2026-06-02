import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const webPublicDir = path.join(repoRoot, "packages/web/public");
const webAppDistDir = path.join(repoRoot, "packages/web/app-dist");
const noticesModulePath = path.join(repoRoot, "packages/web/dist/notices.js");
const soundFontModulePath = path.join(repoRoot, "packages/web/dist/soundfont.js");
const ubuntuSoundFontPackageName = "musescore-general-soundfont-small";
const ubuntuSoundFontCopyrightPath = path.join(
  path.sep,
  "usr",
  "share",
  "doc",
  ubuntuSoundFontPackageName,
  "copyright",
);
const deployedMuseScoreGeneralFileName = "MuseScore_General.sf3";
const deployedMuseScoreGeneralPublicPath = path.join(webPublicDir, "soundfonts", deployedMuseScoreGeneralFileName);

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
  if (path.basename(urlPathname(asset.url)) !== asset.fileName) {
    errors.push(
      "web.soundfont.asset-filename-mismatch: distributed SoundFont URL does not match its declared file name; why=asset notices and deployed files must describe the same file; action=align the descriptor file name and URL",
    );
  }

  const localAssetPath = localPathFromUrl(asset.url);
  if (localAssetPath === undefined) {
    if (isBlank(asset.integrity)) {
      errors.push(
        "web.soundfont.external-integrity-missing: distributed external SoundFont asset lacks an integrity record; why=external audio asset delivery needs stable verification metadata; action=add a checksum or equivalent integrity value to the asset descriptor",
      );
    } else if (!isValidSubresourceIntegrity(asset.integrity)) {
      errors.push(
        "web.soundfont.external-integrity-invalid: distributed external SoundFont asset integrity is not a supported Subresource Integrity value; why=browser fetch integrity checks require a sha256, sha384, or sha512 SRI token; action=set VITE_FUGEMATON_SOUNDFONT_INTEGRITY to a value like sha256-<base64-digest>",
      );
    }
    return errors;
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
  if (
    command !== "write-notice" &&
    command !== "verify" &&
    command !== "verify-ubuntu-soundfont-license" &&
    command !== "prepare-ubuntu-soundfont"
  ) {
    throw new Error(
      "web.playback-assets.invalid-command: expected write-notice, verify, verify-ubuntu-soundfont-license, or prepare-ubuntu-soundfont; why=asset checks need an explicit mode; action=run node workflow-scripts/web-playback-assets.mjs write-notice, verify, verify-ubuntu-soundfont-license, or prepare-ubuntu-soundfont",
    );
  }

  if (command === "verify-ubuntu-soundfont-license" || command === "prepare-ubuntu-soundfont") {
    const errors = verifyInstalledUbuntuSoundFontPackageLicense();
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
    if (command === "prepare-ubuntu-soundfont") {
      prepareUbuntuSoundFontPublicAsset();
    }
    return;
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

export function verifyInstalledUbuntuSoundFontPackageLicense({
  packageName = ubuntuSoundFontPackageName,
  copyrightPath = ubuntuSoundFontCopyrightPath,
} = {}) {
  const errors = [];
  const packageDescription = queryInstalledPackageDescription(packageName);
  if (packageDescription === undefined) {
    errors.push(
      "web.soundfont.ubuntu-package-missing: MuseScore General SoundFont Ubuntu package is not installed; why=GitHub Pages SoundFont deployment must verify the packaged asset license before bundling it; action=install musescore-general-soundfont-small before running the playback asset checks",
    );
  }

  const copyrightText = existsSync(copyrightPath) ? readFileSync(copyrightPath, "utf8") : undefined;
  if (copyrightText === undefined) {
    errors.push(
      "web.soundfont.ubuntu-package-copyright-missing: MuseScore General SoundFont package copyright file is missing; why=deployment must verify the asset license before copying the SF3 into the release artifact; action=install musescore-general-soundfont-small and check its package copyright file",
    );
  }

  if (packageDescription !== undefined && copyrightText !== undefined) {
    errors.push(...verifyUbuntuSoundFontPackageLicense({ packageDescription, copyrightText }));
  }

  return errors;
}

export function verifyUbuntuSoundFontPackageLicense({ packageDescription, copyrightText }) {
  const errors = [];

  if (!/\bMIT licen[cs]e\b/iu.test(packageDescription)) {
    errors.push(
      "web.soundfont.ubuntu-package-license-description-changed: MuseScore General SoundFont package description no longer states MIT license; why=deployment must not bundle the Ubuntu SF3 if its advertised license changed; action=review the package copyright file and update asset notices before deploying",
    );
  }

  if (!/MuseScore_General SoundFont \(MIT\b/u.test(copyrightText)) {
    errors.push(
      "web.soundfont.ubuntu-package-license-header-changed: MuseScore General SoundFont copyright header no longer identifies the SoundFont as MIT; why=deployment must not copy the SF3 into the release artifact under stale license assumptions; action=review the package copyright file and update asset notices before deploying",
    );
  }

  if (
    !copyrightText.includes("Permission is hereby granted, free of charge") ||
    !copyrightText.includes('THE SOFTWARE IS PROVIDED "AS IS"')
  ) {
    errors.push(
      "web.soundfont.ubuntu-package-mit-text-missing: MuseScore General SoundFont copyright file no longer includes the MIT license text; why=release notices need the actual MIT permission and warranty text for the bundled SF3; action=review the package copyright file and update asset notices before deploying",
    );
  }

  return errors;
}

export function findUbuntuSoundFontPath(packageFileList) {
  return packageFileList
    .split("\n")
    .map((line) => line.trim())
    .find((line) => {
      const parts = path.normalize(line).split(path.sep).filter(Boolean);
      return (
        parts.at(-4) === "share" &&
        parts.at(-3) === "sounds" &&
        parts.at(-2) === "sf3" &&
        /^MuseScore_General.*\.sf3$/u.test(parts.at(-1) ?? "")
      );
    });
}

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function queryInstalledPackageDescription(packageName) {
  try {
    return execFileSync("dpkg-query", ["-W", "-f=$" + "{Description}", packageName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

function prepareUbuntuSoundFontPublicAsset() {
  const packageFileList = queryInstalledPackageFiles(ubuntuSoundFontPackageName);
  const sourcePath = packageFileList === undefined ? undefined : findUbuntuSoundFontPath(packageFileList);
  if (sourcePath === undefined) {
    throw new Error(
      "web.soundfont.ubuntu-package-sf3-missing: MuseScore General SoundFont package does not expose an SF3 file in the expected system soundfont directory; why=local and Pages playback need the package-provided SF3 copied into web public assets before bundling; action=inspect dpkg -L musescore-general-soundfont-small and update the copy rule",
    );
  }

  mkdirSync(path.dirname(deployedMuseScoreGeneralPublicPath), { recursive: true });
  copyFileSync(sourcePath, deployedMuseScoreGeneralPublicPath);
}

function queryInstalledPackageFiles(packageName) {
  try {
    return execFileSync("dpkg", ["-L", packageName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

function isValidSubresourceIntegrity(value) {
  const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/u.exec(value.trim());
  if (match === null) {
    return false;
  }

  const expectedDigestBytes = {
    sha256: 32,
    sha384: 48,
    sha512: 64,
  }[match[1]];
  return Buffer.from(match[2], "base64").byteLength === expectedDigestBytes;
}

function urlPathname(url) {
  try {
    return new URL(url, "https://example.invalid").pathname;
  } catch {
    return "";
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
