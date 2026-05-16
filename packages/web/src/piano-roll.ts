import type { Voice } from "@fugematon/core";
import type { PlaybackModel } from "./score.js";

export type PianoRollNoteLayout = {
  voice: Voice;
  x: number;
  y: number;
  width: number;
  height: number;
};

const VOICE_COLORS: Record<Voice, string> = {
  soprano: "#b64629",
  alto: "#c58b2c",
  tenor: "#397d6a",
  bass: "#2f4f76",
};

const LEFT_GUTTER = 44;
const RIGHT_GUTTER = 20;
const TOP_GUTTER = 18;
const BOTTOM_GUTTER = 28;

export function computePianoRollLayout(
  model: PlaybackModel,
  width: number,
  height: number,
): PianoRollNoteLayout[] {
  const usableWidth = Math.max(1, width - LEFT_GUTTER - RIGHT_GUTTER);
  const usableHeight = Math.max(1, height - TOP_GUTTER - BOTTOM_GUTTER);
  const pitchSpan = Math.max(1, model.pitchRange.max - model.pitchRange.min + 1);

  return model.notes.map((note) => {
    const normalizedPitch = (note.pitch - model.pitchRange.min) / pitchSpan;

    return {
      voice: note.voice,
      x: LEFT_GUTTER + (note.startSecond / model.totalSeconds) * usableWidth,
      y: TOP_GUTTER + (1 - normalizedPitch) * usableHeight,
      width: Math.max(2, (note.durationSecond / model.totalSeconds) * usableWidth),
      height: Math.max(4, usableHeight / (pitchSpan + 3)),
    };
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
  drawBackground(context, width, height, model, playbackSecond);

  for (const note of computePianoRollLayout(model, width, height)) {
    context.fillStyle = VOICE_COLORS[note.voice];
    context.globalAlpha = 0.88;
    roundRect(context, note.x, note.y, note.width, note.height, 5);
    context.fill();
  }

  context.globalAlpha = 1;
  drawPlayhead(context, width, height, model, playbackSecond);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: PlaybackModel,
  playbackSecond: number,
): void {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff8ec");
  gradient.addColorStop(1, "#d8c39e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(60, 43, 30, 0.12)";
  context.lineWidth = 1;

  const beatSeconds = 60 / model.bpm;
  for (let second = 0; second <= model.totalSeconds; second += beatSeconds) {
    const x = LEFT_GUTTER + (second / model.totalSeconds) * (width - LEFT_GUTTER - RIGHT_GUTTER);
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
  model: PlaybackModel,
  playbackSecond: number,
): void {
  const progress = model.totalSeconds === 0 ? 0 : playbackSecond / model.totalSeconds;
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
