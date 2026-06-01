import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidNoticesData,
  formatNoticesText,
  type NoticesData,
  noticesData,
  validateNoticesData,
} from "./notices.js";

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
