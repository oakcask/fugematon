import assert from "node:assert/strict";
import test from "node:test";
import { resolveWritingProfile } from "../writing-profile.js";
import {
  buildConstraintDomain,
  filterPitchDomainByAdjacentOrder,
  isKeyFeasibleForProfile,
  isSubjectDegreePlanFeasibleForProfile,
  voicePitchDomain,
} from "./constraint-domain.js";

test("constraint domain exposes profile-supported pitch classes and voice domains", () => {
  const n20 = resolveWritingProfile("music-box-n20");
  const n40 = resolveWritingProfile("music-box-n40");
  const defaultProfile = resolveWritingProfile("four-voice-default");
  const piano = resolveWritingProfile("piano-two-hand");
  const harpsichord = resolveWritingProfile("harpsichord-manual");
  const n20Domain = buildConstraintDomain(n20);

  assert.deepEqual(
    [...n20Domain.allowedPitchClasses].sort((left, right) => left - right),
    [0, 2, 4, 5, 7, 9, 11],
  );
  assert.deepEqual(voicePitchDomain(n20, "bass"), [60, 62, 64, 65, 67, 69, 71, 72]);
  assert.equal(voicePitchDomain(n20, "soprano", 1).length, 0);
  assert.ok(voicePitchDomain(n40, "bass").every((pitch) => pitch >= 48 && pitch <= 64));
  assert.ok(voicePitchDomain(defaultProfile, "tenor").length > voicePitchDomain(n20, "tenor").length);
  assert.ok(voicePitchDomain(piano, "soprano").length > voicePitchDomain(harpsichord, "soprano").length);
});

test("constraint domain rejects keys and subject plans that n20 cannot realize", () => {
  const n20 = resolveWritingProfile("music-box-n20");

  assert.equal(isKeyFeasibleForProfile({ tonic: "Db", mode: "major" }, n20), false);
  assert.equal(isKeyFeasibleForProfile({ tonic: "C", mode: "major" }, n20), true);
  assert.equal(
    isSubjectDegreePlanFeasibleForProfile([0, 1, 2, 3, 4, 3, 2, 1], { tonic: "C", mode: "major" }, n20),
    true,
  );
  assert.equal(
    isSubjectDegreePlanFeasibleForProfile([0, 1, 2, 3, 4, 3, 2, 1], { tonic: "Db", mode: "major" }, n20),
    false,
  );
});

test("constraint domain filters adjacent voice-order pitch candidates", () => {
  const domain = buildConstraintDomain(resolveWritingProfile("music-box-n20"));

  assert.deepEqual(
    filterPitchDomainByAdjacentOrder({
      domain,
      voice: "bass",
      candidatePitches: voicePitchDomain(domain.writingProfile, "bass"),
      activeNotes: [{ voice: "tenor", pitch: 67 }],
    }),
    [60, 62, 64, 65, 67],
  );
  assert.deepEqual(
    filterPitchDomainByAdjacentOrder({
      domain,
      voice: "tenor",
      candidatePitches: voicePitchDomain(domain.writingProfile, "tenor"),
      activeNotes: [
        { voice: "alto", pitch: 74 },
        { voice: "bass", pitch: 65 },
      ],
    }),
    [65, 67, 69, 71, 72, 74],
  );
});
