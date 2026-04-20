import path from 'node:path';
import { downloadAudio } from '../fetch/youtube.js';
import { fetchTopTrend, intensityToWeight } from '../fetch/trends.js';
import { prepare, alignDuration } from '../audio/preprocess.js';
import { applyHighPass, applyLowPass } from '../audio/eq.js';
import { mix } from '../audio/mixer.js';
import { play, stop } from '../playback/player.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

let stopped = false;

/**
 * Run the pipeline in continuous live mode.
 * Base audio is downloaded once. Trend audio refreshes when the keyword changes.
 */
export async function startLoop(options) {
  const { input, duration = 60, sampleRate = 44100, interval = 60, output } = options;
  stopped = false;

  // Bootstrap: download and process base audio once
  console.log('  [LIVE] Downloading and caching base audio...');
  const baseResult = await downloadAudio(input, 'base_audio', duration);
  const basePrepared = await prepare(baseResult.path, { sampleRate, duration, tag: 'base' });
  console.log(`  [LIVE] Base audio cached: "${baseResult.title}"`);
  console.log('  [LIVE] Starting live trend loop (Ctrl+C to stop)...\n');

  let lastKeyword = null;
  let trendFilteredPath = null;

  // Graceful shutdown
  const onSigint = () => {
    console.log('\n  [LIVE] Stopping...');
    stopped = true;
    stop();
  };
  process.on('SIGINT', onSigint);

  try {
    while (!stopped) {
      const now = new Date().toLocaleTimeString();

      // Fetch current trend
      const trend = await fetchTopTrend();
      const weight = intensityToWeight(trend.rawTraffic);

      if (trend.keyword !== lastKeyword) {
        console.log(`  [${now}] New trend: "${trend.keyword}" (${trend.traffic}) → weight: ${weight.toFixed(2)}`);
        console.log(`  [${now}] Downloading trend audio...`);

        const trendResult = await downloadAudio(trend.keyword, 'trend_audio', duration);
        const trendPrepared = await prepare(trendResult.path, { sampleRate, duration, tag: 'trend' });

        // Align and filter
        const aligned = await alignDuration(basePrepared, trendPrepared, duration);
        const baseFiltered = await applyHighPass(aligned.basePath);
        trendFilteredPath = await applyLowPass(aligned.trendPath);

        // Mix
        const outputPath = output || path.join(ROOT, 'output', 'mixed_output.wav');
        await mix(baseFiltered, trendFilteredPath, weight, outputPath);

        lastKeyword = trend.keyword;

        // Play
        console.log(`  [${now}] ♪ Playing mixed output...`);
        await play(outputPath);
      } else {
        console.log(`  [${now}] Trend unchanged: "${trend.keyword}" → replaying...`);
        const outputPath = output || path.join(ROOT, 'output', 'mixed_output.wav');
        await play(outputPath);
      }

      if (!stopped) {
        console.log(`  [${now}] Next trend check in ${interval}s...`);
        await sleep(interval * 1000);
      }
    }
  } finally {
    process.removeListener('SIGINT', onSigint);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Allow early exit
    const check = setInterval(() => {
      if (stopped) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 500);
  });
}
