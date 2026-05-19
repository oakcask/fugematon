import type { Voice } from "@fugematon/core";
import { formatBarBeatPosition, type PlaybackEntry, type PlaybackModel, secondsToTicks } from "./score.js";

export type PianoRollNoteLayout = {
  voice: Voice;
  entry?: PlaybackEntry;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
};

export type PianoRollViewport = {
  startSecond: number;
  endSecond: number;
};

const VOICE_COLORS: Record<Voice, string> = {
  soprano: "#b64629",
  alto: "#c58b2c",
  tenor: "#397d6a",
  bass: "#2f4f76",
};
const ENTRY_STROKES: Record<PlaybackEntry["form"], string> = {
  subject: "#f8fbf2",
  answer: "#15130f",
  "subject-fragment": "#eef0c8",
};
const ACTIVE_NOTE_STROKE = "#007c91";
const ACTIVE_NOTE_GLOW = "rgba(0, 124, 145, 0.48)";

const LEFT_GUTTER = 62;
const RIGHT_GUTTER = 20;
const TOP_GUTTER = 18;
const BOTTOM_GUTTER = 28;
const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const MIN_ACTIVE_LABEL_GAP = 11;
export const DEFAULT_VIEWPORT_SECONDS = 24;

export type ActivePitchMarkerLayout = {
  pitch: number;
  name: string;
  isBlackKey: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  labelMaxWidth: number;
  textAlign: CanvasTextAlign;
};

export function computePianoRollViewport(
  model: PlaybackModel,
  playbackSecond: number,
  viewportSeconds = DEFAULT_VIEWPORT_SECONDS,
): PianoRollViewport {
  const duration = Math.max(1, viewportSeconds);
  if (model.totalSeconds <= duration) {
    return { startSecond: 0, endSecond: model.totalSeconds };
  }

  const targetStart = playbackSecond <= 0 ? 0 : playbackSecond - duration * 0.42;
  const startSecond = Math.min(Math.max(0, targetStart), model.totalSeconds - duration);

  return {
    startSecond,
    endSecond: startSecond + duration,
  };
}

export function computePianoRollLayout(
  model: PlaybackModel,
  width: number,
  height: number,
  viewport = computePianoRollViewport(model, 0),
  activeSecond?: number,
): PianoRollNoteLayout[] {
  const usableWidth = Math.max(1, width - LEFT_GUTTER - RIGHT_GUTTER);
  const usableHeight = Math.max(1, height - TOP_GUTTER - BOTTOM_GUTTER);
  const pitchSpan = Math.max(1, model.pitchRange.max - model.pitchRange.min + 1);
  const viewportDuration = Math.max(1, viewport.endSecond - viewport.startSecond);

  return model.notes.flatMap((note) => {
    const noteEndSecond = note.startSecond + note.durationSecond;
    const visibleStartSecond = Math.max(note.startSecond, viewport.startSecond);
    const visibleEndSecond = Math.min(noteEndSecond, viewport.endSecond);
    if (visibleEndSecond <= visibleStartSecond) {
      return [];
    }

    const normalizedPitch = (note.pitch - model.pitchRange.min) / pitchSpan;

    return [
      {
        voice: note.voice,
        entry: note.entry,
        x: LEFT_GUTTER + ((visibleStartSecond - viewport.startSecond) / viewportDuration) * usableWidth,
        y: TOP_GUTTER + (1 - normalizedPitch) * usableHeight,
        width: Math.max(2, ((visibleEndSecond - visibleStartSecond) / viewportDuration) * usableWidth),
        height: Math.max(4, usableHeight / (pitchSpan + 3)),
        isActive: activeSecond !== undefined && note.startSecond <= activeSecond && activeSecond < noteEndSecond,
      },
    ];
  });
}

export function computeActivePitches(model: PlaybackModel, playbackSecond: number): number[] {
  const activePitches = new Set<number>();

  for (const note of model.notes) {
    if (note.startSecond <= playbackSecond && playbackSecond < note.startSecond + note.durationSecond) {
      activePitches.add(note.pitch);
    }
  }

  return [...activePitches].sort((left, right) => left - right);
}

export function drawPianoRoll(canvas: HTMLCanvasElement, model: PlaybackModel, playbackSecond: number): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }

  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(320, canvas.clientWidth);
  const height = Math.max(260, canvas.clientHeight);
  if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  const viewport = computePianoRollViewport(model, playbackSecond);
  const activePitches = computeActivePitches(model, playbackSecond);
  drawBackground(context, width, height, model, playbackSecond, viewport, activePitches);

  for (const note of computePianoRollLayout(model, width, height, viewport, playbackSecond)) {
    context.fillStyle = VOICE_COLORS[note.voice];
    context.globalAlpha = note.isActive ? 1 : 0.82;
    if (note.isActive) {
      context.shadowBlur = 14;
      context.shadowColor = ACTIVE_NOTE_GLOW;
    }
    roundRect(context, note.x, note.y, note.width, note.height, 5);
    context.fill();
    context.shadowBlur = 0;
    if (note.entry !== undefined) {
      context.globalAlpha = 0.94;
      context.strokeStyle = ENTRY_STROKES[note.entry.form];
      context.lineWidth = note.entry.state === "stretto-like" ? 3 : 2;
      context.setLineDash(note.entry.answerKind === "tonal" ? [5, 3] : []);
      context.stroke();
      context.setLineDash([]);
    }
    if (note.isActive) {
      context.globalAlpha = 1;
      context.strokeStyle = ACTIVE_NOTE_STROKE;
      context.lineWidth = 4;
      context.setLineDash([]);
      context.stroke();
    }
  }

  context.globalAlpha = 1;
  drawPlayhead(context, width, height, playbackSecond, viewport);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: PlaybackModel,
  playbackSecond: number,
  viewport: PianoRollViewport,
  activePitches: readonly number[],
): void {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff8ec");
  gradient.addColorStop(1, "#d8c39e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(60, 43, 30, 0.12)";
  context.lineWidth = 1;

  const beatSeconds = 60 / model.bpm;
  const firstBeatSecond = Math.ceil(viewport.startSecond / beatSeconds) * beatSeconds;
  const viewportDuration = Math.max(1, viewport.endSecond - viewport.startSecond);
  for (let second = firstBeatSecond; second <= viewport.endSecond; second += beatSeconds) {
    const x = LEFT_GUTTER + ((second - viewport.startSecond) / viewportDuration) * (width - LEFT_GUTTER - RIGHT_GUTTER);
    context.beginPath();
    context.moveTo(x, TOP_GUTTER);
    context.lineTo(x, height - BOTTOM_GUTTER);
    context.stroke();
  }

  drawActivePitchMarkers(context, width, height, model, activePitches);

  context.fillStyle = "rgba(36, 25, 15, 0.64)";
  context.font = "12px serif";
  const playbackTick = secondsToTicks(playbackSecond, model.bpm, model.ticksPerQuarter);
  context.fillText(
    `${Math.floor(playbackSecond)}s / ${formatBarBeatPosition(playbackTick, model.timeSignature, model.ticksPerQuarter)}`,
    LEFT_GUTTER,
    height - 9,
  );
}

function drawPlayhead(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  playbackSecond: number,
  viewport: PianoRollViewport,
): void {
  const viewportDuration = Math.max(1, viewport.endSecond - viewport.startSecond);
  const progress = (playbackSecond - viewport.startSecond) / viewportDuration;
  const x = LEFT_GUTTER + Math.min(1, Math.max(0, progress)) * (width - LEFT_GUTTER - RIGHT_GUTTER);

  context.fillStyle = "rgba(255, 248, 237, 0.28)";
  context.fillRect(x - 5, TOP_GUTTER, 10, height - TOP_GUTTER - BOTTOM_GUTTER);

  context.strokeStyle = "#2d1d12";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x, TOP_GUTTER);
  context.lineTo(x, height - BOTTOM_GUTTER);
  context.stroke();
}

function drawActivePitchMarkers(
  context: CanvasRenderingContext2D,
  _width: number,
  height: number,
  model: PlaybackModel,
  activePitches: readonly number[],
): void {
  context.fillStyle = "rgba(36, 25, 15, 0.14)";
  context.fillRect(0, 0, LEFT_GUTTER, height);
  context.strokeStyle = "rgba(45, 29, 18, 0.26)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(LEFT_GUTTER + 0.5, 0);
  context.lineTo(LEFT_GUTTER + 0.5, height);
  context.stroke();

  const markers = computeActivePitchMarkerLayout(model, height, activePitches);

  for (const marker of markers.filter((marker) => !marker.isBlackKey)) {
    context.fillStyle = "rgba(255, 252, 241, 0.94)";
    roundRect(context, marker.x, marker.y, marker.width, marker.height, 3);
    context.fill();
    context.strokeStyle = "rgba(45, 29, 18, 0.34)";
    roundRect(context, marker.x + 0.5, marker.y + 0.5, marker.width - 1, marker.height - 1, 3);
    context.stroke();
  }

  for (const marker of markers.filter((marker) => marker.isBlackKey)) {
    context.fillStyle = "rgba(34, 29, 24, 0.9)";
    roundRect(context, marker.x, marker.y, marker.width, marker.height, 3);
    context.fill();
  }

  context.font = "700 10px system-ui, sans-serif";
  context.textBaseline = "middle";
  for (const marker of markers) {
    context.textAlign = marker.textAlign;
    context.fillStyle = marker.isBlackKey ? "rgba(255, 252, 241, 0.96)" : "rgba(45, 29, 18, 0.86)";
    context.fillText(marker.name, marker.labelX, marker.labelY, marker.labelMaxWidth);
  }
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

export function computeActivePitchMarkerLayout(
  model: PlaybackModel,
  height: number,
  activePitches: readonly number[],
): ActivePitchMarkerLayout[] {
  const usableHeight = Math.max(1, height - TOP_GUTTER - BOTTOM_GUTTER);
  const pitchSpan = Math.max(1, model.pitchRange.max - model.pitchRange.min + 1);
  const pitchHeight = usableHeight / pitchSpan;
  const keyHeight = Math.max(7, Math.min(16, pitchHeight * 1.45));
  const blackKeyWidth = Math.round(LEFT_GUTTER * 0.62);

  const markers = activePitches.map((pitch) => {
    const pitchClass = ((pitch % 12) + 12) % 12;
    const isBlackKey = BLACK_PITCH_CLASSES.has(pitchClass);
    const pitchOffset = pitch - model.pitchRange.min;
    const centerY = TOP_GUTTER + (pitchSpan - pitchOffset - 0.5) * pitchHeight;
    const y = Math.max(0, Math.min(height - keyHeight, centerY - keyHeight / 2));

    return {
      pitch,
      name: formatPitchName(pitch),
      isBlackKey,
      x: 0,
      y,
      width: isBlackKey ? blackKeyWidth : LEFT_GUTTER,
      height: keyHeight,
      labelX: isBlackKey ? 5 : LEFT_GUTTER - 6,
      labelY: centerY,
      labelMaxWidth: isBlackKey ? blackKeyWidth - 8 : LEFT_GUTTER - blackKeyWidth + 2,
      textAlign: isBlackKey ? "left" : "right",
    } satisfies ActivePitchMarkerLayout;
  });

  distributeActiveMarkerLabels(
    markers.filter((marker) => marker.isBlackKey),
    height,
  );
  distributeActiveMarkerLabels(
    markers.filter((marker) => !marker.isBlackKey),
    height,
  );

  return markers;
}

function distributeActiveMarkerLabels(markers: ActivePitchMarkerLayout[], height: number): void {
  if (markers.length <= 1) {
    return;
  }

  const minY = 7;
  const maxY = height - 7;
  const sortedMarkers = [...markers].sort((left, right) => left.labelY - right.labelY);
  let nextY = minY;
  for (const marker of sortedMarkers) {
    marker.labelY = Math.max(marker.labelY, nextY);
    nextY = marker.labelY + MIN_ACTIVE_LABEL_GAP;
  }

  const overflow = sortedMarkers[sortedMarkers.length - 1]!.labelY - maxY;
  if (overflow > 0) {
    for (const marker of sortedMarkers) {
      marker.labelY -= overflow;
    }
  }

  if (sortedMarkers[0]!.labelY < minY) {
    nextY = minY;
    for (const marker of sortedMarkers) {
      marker.labelY = Math.max(marker.labelY, nextY);
      nextY = marker.labelY + MIN_ACTIVE_LABEL_GAP;
    }
  }
}

function formatPitchName(pitch: number): string {
  const pitchClass = ((pitch % 12) + 12) % 12;
  const octave = Math.floor(pitch / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
