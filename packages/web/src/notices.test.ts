import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidNoticesData,
  createNoticesData,
  formatNoticesText,
  type NoticesData,
  noticesData,
  validateNoticesData,
} from "./notices.js";
import { createMuseScoreGeneralSoundFontDescriptor } from "./soundfont.js";

test("default notices data is valid before distribution assets are configured", () => {
  assert.doesNotThrow(() => assertValidNoticesData(noticesData));
  assert.ok(noticesData.software.some((notice) => notice.name === "spessasynth_lib" && notice.version === "4.3.6"));
});

test("validateNoticesData rejects distributed audio assets without license metadata", () => {
  const data: NoticesData = {
    software: [],
    audioAssets: [
      {
        assetId: "prototype-sf3",
        sourceTitle: "",
        sourceUrl: "",
        license: "",
        attribution: "",
        attributionRequired: true,
        distributed: true,
      },
    ],
  };

  assert.match(validateNoticesData(data).join("\n"), /^web\.notices\.missing-audio-asset-metadata:/);
});

test("formatNoticesText emits the route-addressable release notice artifact body", () => {
  const text = formatNoticesText(noticesData);

  assert.match(text, /^Fugematon notices\n\nRuntime software\n/);
  assert.match(text, /spessasynth_lib 4\.3\.6/);
  assert.match(text, /Audio assets\nNo third-party audio assets are distributed by the web app\.\n$/);
});

test("createNoticesData emits audio asset notices for configured distributed SoundFonts", () => {
  const data = createNoticesData([
    createMuseScoreGeneralSoundFontDescriptor({
      VITE_FUGEMATON_SOUNDFONT_URL: "https://assets.example.invalid/MuseScore_General.sf3",
      VITE_FUGEMATON_SOUNDFONT_INTEGRITY: "sha256-dGVzdA==",
    }),
  ]);

  assert.equal(data.audioAssets.length, 1);
  assert.equal(data.audioAssets[0]?.assetId, "musescore-general-sf3-prototype");
  assert.equal(data.audioAssets[0]?.license, "MIT");
  assert.equal(data.audioAssets[0]?.distributed, true);
});
