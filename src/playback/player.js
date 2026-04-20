import { AudioContext } from 'node-web-audio-api';
import fs from 'node:fs';

let currentCtx = null;
let currentSource = null;

/**
 * Play a WAV file through system audio output.
 * Returns a promise that resolves when playback finishes.
 */
export async function play(wavPath) {
  stop(); // Stop any current playback

  const fileBuffer = fs.readFileSync(wavPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  currentCtx = new AudioContext();
  const audioBuffer = await currentCtx.decodeAudioData(arrayBuffer);

  currentSource = currentCtx.createBufferSource();
  currentSource.buffer = audioBuffer;
  currentSource.connect(currentCtx.destination);

  return new Promise((resolve) => {
    currentSource.onended = async () => {
      await cleanup();
      resolve();
    };
    currentSource.start(0);
  });
}

/**
 * Stop current playback.
 */
export function stop() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
  if (currentCtx) {
    currentCtx.close().catch(() => {});
    currentCtx = null;
  }
}

async function cleanup() {
  currentSource = null;
  if (currentCtx) {
    await currentCtx.close().catch(() => {});
    currentCtx = null;
  }
}
