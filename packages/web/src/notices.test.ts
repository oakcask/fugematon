import assert from "node:assert/strict";
import test from "node:test";
import { assertValidNoticesData, type NoticesData, noticesData, validateNoticesData } from "./notices.js";

test("default notices data is valid before distribution assets are configured", () => {
  assert.doesNotThrow(() => assertValidNoticesData(noticesData));
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
