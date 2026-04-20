import ffmpeg from 'fluent-ffmpeg';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * Preprocess audio: resample, normalize, trim, standardize format.
 * @param {string} inputPath - Path to input WAV file.
 * @param {object} options
 * @param {number} options.sampleRate - Target sample rate (default 44100).
 * @param {number} options.duration - Max duration in seconds (default 120).
 * @param {string} options.tag - Output filename tag (e.g. 'base', 'trend').
 * @returns {Promise<string>} Path to processed WAV file.
 */
export async function prepare(inputPath, { sampleRate = 44100, duration = 120, tag = 'processed' } = {}) {
  const tempDir = path.join(ROOT, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `${tag}_processed.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(sampleRate)
      .audioChannels(2)
      .audioCodec('pcm_s16le')
      .duration(duration)
      .audioFilters('loudnorm=I=-16:LRA=11:TP=-1.5')
      .outputOptions('-y')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`ffmpeg preprocessing failed: ${err.message}`)))
      .run();
  });
}

/**
 * Match the duration of two audio files by trimming the longer one.
 * @returns {Promise<{basePath: string, trendPath: string}>}
 */
export async function alignDuration(basePath, trendPath, maxDuration = 120) {
  const baseDur = await getDuration(basePath);
  const trendDur = await getDuration(trendPath);
  const targetDur = Math.min(baseDur, trendDur, maxDuration);

  const alignedBase = await trimTo(basePath, targetDur, 'base_aligned');
  const alignedTrend = await trimTo(trendPath, targetDur, 'trend_aligned');

  return { basePath: alignedBase, trendPath: alignedTrend };
}

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

function trimTo(inputPath, duration, tag) {
  const outputPath = path.join(ROOT, 'temp', `${tag}.wav`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .duration(duration)
      .audioCodec('pcm_s16le')
      .outputOptions('-y')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}
