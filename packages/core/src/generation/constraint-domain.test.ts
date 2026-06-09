import assert from "node:assert/strict";
import test from "node:test";
import { resolveWritingProfile, type WritingProfile } from "../writing-profile.js";
import {
  buildConstraintDomain,
  filterPitchDomainByAdjacentOrder,
  isHarmonicAnchorFeasibleForProfile,
  isKeyFeasibleForProfile,
  isSubjectDegreePlanFeasibleForProfile,
  isSubjectEntryPlanFeasibleForProfile,
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

test("constraint domain rejects keys whose anchor roots cannot be supported by the profile bass", () => {
  const profile = {
    ...resolveWritingProfile("four-voice-default"),
    absolutePitchSet: Array.from({ length: 25 }, (_, index) => 60 + index),
    voiceRanges: {
      soprano: { min: 67, max: 84 },
      alto: { min: 60, max: 76 },
      tenor: { min: 60, max: 67 },
      bass: { min: 67, max: 72 },
    },
  } satisfies WritingProfile;
  const key = { tonic: "C", mode: "major" } as const;

  assert.equal(isSubjectDegreePlanFeasibleForProfile([0, 1, 2, 3, 4, 3, 2, 1], key, profile), true);
  assert.equal(isHarmonicAnchorFeasibleForProfile(key, profile), false);
  assert.equal(isKeyFeasibleForProfile(key, profile), false);
  assert.equal(isHarmonicAnchorFeasibleForProfile(key, resolveWritingProfile("four-voice-default")), true);
  assert.equal(isHarmonicAnchorFeasibleForProfile(key, resolveWritingProfile("harpsichord-manual")), true);
  assert.equal(isHarmonicAnchorFeasibleForProfile(key, resolveWritingProfile("music-box-n20")), true);
});

test("constraint domain rejects subject entry plans that cannot keep profile voice order", () => {
  const degrees = [0, 1, 3] as const;
  const durations = [480, 1920, 480] as const;
  const key = { tonic: "C", mode: "major" } as const;

  assert.equal(isSubjectDegreePlanFeasibleForProfile(degrees, key, resolveWritingProfile("music-box-n20")), true);
  assert.equal(
    isSubjectEntryPlanFeasibleForProfile(degrees, durations, key, resolveWritingProfile("music-box-n20"), 1920),
    false,
  );
  assert.equal(
    isSubjectEntryPlanFeasibleForProfile(degrees, durations, key, resolveWritingProfile("four-voice-default"), 1920),
    true,
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
