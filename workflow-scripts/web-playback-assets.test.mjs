import assert from "node:assert/strict";
import test from "node:test";
import {
  findUbuntuSoundFontPath,
  localPathFromUrl,
  verifyDistributedSoundFontAsset,
  verifyPlaybackAssets,
  verifyUbuntuSoundFontPackageLicense,
} from "./web-playback-assets.mjs";

test("localPathFromUrl maps web-public URLs to relative asset paths", () => {
  assert.equal(localPathFromUrl("/soundfonts/MuseScore_General.sf3"), "soundfonts/MuseScore_General.sf3");
  assert.equal(localPathFromUrl("./soundfonts/MuseScore_General.sf3?v=1"), "soundfonts/MuseScore_General.sf3");
  assert.equal(localPathFromUrl("https://assets.example.invalid/MuseScore_General.sf3"), undefined);
});

test("verifyPlaybackAssets rejects stale notice artifacts", () => {
  const errors = verifyPlaybackAssets({
    noticesData: { software: [], audioAssets: [] },
    noticeText: "expected\n",
    soundFontAssets: [],
    publicDir: "missing-public-dir",
    appDistDir: "missing-app-dist-dir",
    appDistExists: false,
  });

  assert.match(errors.join("\n"), /^web\.notices\.artifact-missing:/);
});

test("verifyPlaybackAssets requires notice metadata for distributed SoundFont assets", () => {
  const errors = verifyPlaybackAssets({
    noticesData: { software: [], audioAssets: [] },
    noticeText: "",
    soundFontAssets: [
      {
        assetId: "musescore-general-sf3-prototype",
        displayName: "MuseScore General SF3 prototype",
        fileName: "MuseScore_General.sf3",
        url: "https://assets.example.invalid/MuseScore_General.sf3",
        integrity: "sha256-W4W2wsYdELK5HN3UHvzOeyXNMcgnHVEcc6+vvvILb6M=",
        license: "MIT",
        sourceUrl: "https://musescore.org/en/handbook/soundfonts",
        distributed: true,
      },
    ],
    publicDir: "missing-public-dir",
    appDistDir: "missing-app-dist-dir",
    appDistExists: false,
  });

  assert.match(errors.join("\n"), /web\.soundfont\.asset-notice-mismatch:/);
});

test("verifyPlaybackAssets accepts external SoundFont assets with notice metadata and integrity", () => {
  const errors = verifyPlaybackAssets({
    noticesData: {
      software: [],
      audioAssets: [
        {
          assetId: "musescore-general-sf3-prototype",
          sourceTitle: "MuseScore General SF3 prototype",
          sourceUrl: "https://musescore.org/en/handbook/soundfonts",
          license: "MIT",
          attribution: "S. Christian Collins, MuseScore General SoundFont",
          attributionRequired: true,
          distributed: true,
        },
      ],
    },
    noticeText: "",
    soundFontAssets: [
      {
        assetId: "musescore-general-sf3-prototype",
        displayName: "MuseScore General SF3 prototype",
        fileName: "MuseScore_General.sf3",
        url: "https://assets.example.invalid/MuseScore_General.sf3",
        integrity: "sha256-W4W2wsYdELK5HN3UHvzOeyXNMcgnHVEcc6+vvvILb6M=",
        license: "MIT",
        sourceUrl: "https://musescore.org/en/handbook/soundfonts",
        distributed: true,
      },
    ],
    publicDir: "missing-public-dir",
    appDistDir: "missing-app-dist-dir",
    appDistExists: false,
  });

  assert.deepEqual(
    errors.filter((error) => !error.startsWith("web.notices.artifact-missing:")),
    [],
  );
});

test("verifyDistributedSoundFontAsset requires integrity for external distributed assets", () => {
  const errors = verifyDistributedSoundFontAsset(
    {
      fileName: "MuseScore_General.sf3",
      url: "https://assets.example.invalid/MuseScore_General.sf3",
      distributed: true,
    },
    "missing-public-dir",
    "missing-app-dist-dir",
    false,
  );

  assert.match(errors.join("\n"), /^web\.soundfont\.external-integrity-missing:/);
});

test("verifyDistributedSoundFontAsset rejects invalid external integrity values", () => {
  const errors = verifyDistributedSoundFontAsset(
    {
      fileName: "MuseScore_General.sf3",
      url: "https://assets.example.invalid/MuseScore_General.sf3",
      integrity: "sha256-test",
      distributed: true,
    },
    "missing-public-dir",
    "missing-app-dist-dir",
    false,
  );

  assert.match(errors.join("\n"), /^web\.soundfont\.external-integrity-invalid:/);
});

test("verifyDistributedSoundFontAsset checks external asset file names", () => {
  const errors = verifyDistributedSoundFontAsset(
    {
      fileName: "MuseScore_General.sf3",
      url: "https://assets.example.invalid/Wrong.sf3",
      integrity: "sha256-W4W2wsYdELK5HN3UHvzOeyXNMcgnHVEcc6+vvvILb6M=",
      distributed: true,
    },
    "missing-public-dir",
    "missing-app-dist-dir",
    false,
  );

  assert.match(errors.join("\n"), /^web\.soundfont\.asset-filename-mismatch:/);
});

test("verifyUbuntuSoundFontPackageLicense accepts the Ubuntu MIT package wording", () => {
  const errors = verifyUbuntuSoundFontPackageLicense({
    packageDescription: "As it comes under the MIT licence, it can be used in most settings.",
    copyrightText: [
      "MuseScore_General SoundFont (MIT, parts PD or CC0):",
      "",
      "Permission is hereby granted, free of charge, to any person",
      'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND',
    ].join("\n"),
  });

  assert.deepEqual(errors, []);
});

test("verifyUbuntuSoundFontPackageLicense rejects changed Ubuntu package license metadata", () => {
  const errors = verifyUbuntuSoundFontPackageLicense({
    packageDescription: "This package has updated license terms.",
    copyrightText: "MuseScore_General SoundFont (GPL-3.0-only):",
  });

  assert.match(errors.join("\n"), /web\.soundfont\.ubuntu-package-license-description-changed:/);
  assert.match(errors.join("\n"), /web\.soundfont\.ubuntu-package-license-header-changed:/);
  assert.match(errors.join("\n"), /web\.soundfont\.ubuntu-package-mit-text-missing:/);
});

test("findUbuntuSoundFontPath locates the package-provided SF3 file", () => {
  assert.equal(
    findUbuntuSoundFontPath(
      [
        [""].join("/"),
        ["", "usr"].join("/"),
        ["", "usr", "share", "sounds", "sf3", "MuseScore_General_Lite.sf3"].join("/"),
        ["", "usr", "share", "doc", "musescore-general-soundfont-small", "copyright"].join("/"),
      ].join("\n"),
    ),
    ["", "usr", "share", "sounds", "sf3", "MuseScore_General_Lite.sf3"].join("/"),
  );
});
