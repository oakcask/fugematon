import assert from "node:assert/strict";
import test from "node:test";
import { localPathFromUrl, verifyDistributedSoundFontAsset, verifyPlaybackAssets } from "./web-playback-assets.mjs";

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
        integrity: "sha256-test",
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
