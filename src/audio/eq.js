import { AudioContext, OfflineAudioContext } from 'node-web-audio-api';
import fs from 'node:fs';
import path from 'node:path';
import { writeWav } from './wav-utils.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * Apply a highpass filter — removes low frequencies, keeps mid+high.
 * Used for base (personal) audio.
 */
export async function applyHighPass(inputPath, { cutoff = 300, Q = 1.0 } = {}) {
  const outputPath = path.join(ROOT, 'temp', 'base_highpass.wav');
  return applyFilter(inputPath, outputPath, 'highpass', cutoff, Q);
}

/**
 * Apply a lowpass filter — keeps low+mid, removes high frequencies.
 * Used for trend (external) audio.
 */
export async function applyLowPass(inputPath, { cutoff = 4000, Q = 1.0, tag = 'trend' } = {}) {
  const outputPath = path.join(ROOT, 'temp', `${tag}_lowpass.wav`);
  return applyFilter(inputPath, outputPath, 'lowpass', cutoff, Q);
}

/**
 * Core filter function using OfflineAudioContext + BiquadFilterNode.
 */
async function applyFilter(inputPath, outputPath, filterType, cutoff, Q) {
  // Read WAV file
  const fileBuffer = fs.readFileSync(inputPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  // Decode audio data
  const ctx = new AudioContext();
  let audioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }

  // Create offline context matching buffer dimensions
  const offline = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Wire: source → biquadFilter → destination
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;

  const filter = offline.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = cutoff;
  filter.Q.value = Q;

  source.connect(filter);
  filter.connect(offline.destination);
  source.start(0);

  // Render
  const rendered = await offline.startRendering();

  // Write output
  writeWav(rendered, outputPath);
  return outputPath;
}
