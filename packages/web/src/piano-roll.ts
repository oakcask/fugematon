import type { Voice } from "@fugematon/core";
import type { PlaybackEntry, PlaybackModel } from "./score.js";

export type PianoRollNoteLayout = {
  voice: Voice;
  entry?: PlaybackEntry;
  x: number;
  y: number;
  width: number;
  height: number;
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

const LEFT_GUTTER = 44;
const RIGHT_GUTTER = 20;
const TOP_GUTTER = 18;
const BOTTOM_GUTTER = 28;
export const DEFAULT_VIEWPORT_SECONDS = 24;

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
      },
    ];
  });
}

export function drawPianoRoll(
  canvas: HTMLCanvasElement,
  model: PlaybackModel,
  playbackSecond: number,
): void {
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
  drawBackground(context, width, height, model, playbackSecond, viewport);

  for (const note of computePianoRollLayout(model, width, height, viewport)) {
    context.fillStyle = VOICE_COLORS[note.voice];
    context.globalAlpha = 0.88;
    roundRect(context, note.x, note.y, note.width, note.height, 5);
    context.fill();
    if (note.entry !== undefined) {
      context.globalAlpha = 0.94;
      context.strokeStyle = ENTRY_STROKES[note.entry.form];
      context.lineWidth = note.entry.state === "stretto-like" ? 3 : 2;
      context.setLineDash(note.entry.answerKind === "tonal" ? [5, 3] : []);
      context.stroke();
      context.setLineDash([]);
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
    const x =
      LEFT_GUTTER + ((second - viewport.startSecond) / viewportDuration) * (width - LEFT_GUTTER - RIGHT_GUTTER);
    context.beginPath();
    context.moveTo(x, TOP_GUTTER);
    context.lineTo(x, height - BOTTOM_GUTTER);
    context.stroke();
  }

  context.fillStyle = "rgba(36, 25, 15, 0.64)";
  context.font = "12px serif";
  context.fillText(`${Math.floor(playbackSecond)}s`, LEFT_GUTTER, height - 9);
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

  context.strokeStyle = "#2d1d12";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, TOP_GUTTER);
  context.lineTo(x, height - BOTTOM_GUTTER);
  context.stroke();
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
