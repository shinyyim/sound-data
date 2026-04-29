import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * Download audio from YouTube via yt-dlp.
 * @param {string} query - Song title (searched) or YouTube URL (direct).
 * @param {string} outputName - Filename inside temp/ (e.g. 'base_audio').
 * @param {number} maxDuration - Max duration in seconds.
 * @returns {Promise<{path: string, title: string}>}
 */
export async function downloadAudio(query, outputName = 'audio', maxDuration = 180) {
  const tempDir = path.join(ROOT, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `${outputName}.wav`);

  // If not a URL, use ytsearch
  const isUrl = query.startsWith('http://') || query.startsWith('https://');
  const source = isUrl ? query : `ytsearch1:${query}`;

  const args = [
    source,
    '-x',
    '--audio-format', 'wav',
    '-o', outputPath,
    '--no-playlist',
    '--force-overwrites',
    '--no-warnings',
    '--print', 'after_move:title',
  ];

  if (process.env.YT_USE_COOKIES) {
    args.push('--cookies-from-browser', process.env.YT_USE_COOKIES);
  }

  const TIMEOUT_MS = 60_000; // 60s timeout per download

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { cwd: ROOT });
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      reject(new Error(`yt-dlp timed out for "${query}" after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code !== 0) {
        reject(new Error(`yt-dlp failed for "${query}": ${stderr.trim()}`));
        return;
      }
      // --print after_move:title outputs the title
      const title = stdout.trim().split('\n').pop() || query;
      resolve({ path: outputPath, title });
    });
  });
}
