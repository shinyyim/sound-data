import { AudioContext, OfflineAudioContext } from 'node-web-audio-api';
import fs from 'node:fs';
import path from 'node:path';
import { writeWav } from './wav-utils.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * Mix a base audio with multiple trend layers.
 * @param {string} basePath - Path to filtered base audio.
 * @param {{path: string, weight: number}[]} layers - Trend audio layers with weights.
 * @param {string} outputPath - Output file path.
 * @returns {Promise<string>} Path to mixed output.
 */
export async function mixLayers(basePath, layers, outputPath) {
  if (!outputPath) {
    outputPath = path.join(ROOT, 'output', 'mixed_output.wav');
  }

  // Decode all files
  const baseBuffer = await decodeFile(basePath);
  const layerBuffers = await Promise.all(layers.map(l => decodeFile(l.path)));

  // Find max length across all sources
  let maxLength = baseBuffer.length;
  for (const buf of layerBuffers) {
    if (buf.length > maxLength) maxLength = buf.length;
  }

  const sampleRate = baseBuffer.sampleRate;
  const numChannels = baseBuffer.numberOfChannels;

  const offline = new OfflineAudioContext(numChannels, maxLength, sampleRate);

  // Total trend weight
  const totalTrendWeight = layers.reduce((sum, l) => sum + l.weight, 0);
  // Base gets the remaining share, minimum 0.2
  const baseWeight = Math.max(0.2, 1.0 - totalTrendWeight);

  // Base source
  const baseSource = offline.createBufferSource();
  baseSource.buffer = baseBuffer;
  const baseGain = offline.createGain();
  baseGain.gain.value = baseWeight;
  baseSource.connect(baseGain);
  baseGain.connect(offline.destination);
  baseSource.start(0);

  // Trend layers
  for (let i = 0; i < layers.length; i++) {
    const src = offline.createBufferSource();
    src.buffer = layerBuffers[i];
    const gain = offline.createGain();
    gain.gain.value = layers[i].weight;
    src.connect(gain);
    gain.connect(offline.destination);
    src.start(0);
  }

  const rendered = await offline.startRendering();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  writeWav(rendered, outputPath);
  return outputPath;
}

/**
 * Simple two-track mix (backwards compat).
 */
export async function mix(basePath, trendPath, weight = 0.5, outputPath) {
  return mixLayers(basePath, [{ path: trendPath, weight }], outputPath);
}

async function decodeFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }
}
