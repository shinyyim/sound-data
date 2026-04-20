import path from 'node:path';
import { downloadAudio } from './fetch/youtube.js';
import { fetchTrends, intensityToWeight } from './fetch/trends.js';
import { prepare } from './audio/preprocess.js';
import { applyHighPass, applyLowPass } from './audio/eq.js';
import { mixLayers } from './audio/mixer.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const TREND_COUNT = 5;

/**
 * Run the full pipeline once.
 * Fetches 5 trending keywords, downloads audio for each,
 * and overlays all on top of the base audio.
 */
export async function runOnce(options) {
  const { input, duration = 120, sampleRate = 44100, trendWeight, output } = options;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = output || path.join(ROOT, 'output', `${ts}_mix.wav`);

  // Step 1: Fetch 5 trends
  log('[1/7] Fetching Google Trends (top 5)...');
  const trends = await fetchTrends('US', TREND_COUNT);
  for (let i = 0; i < trends.length; i++) {
    const w = trendWeight != null
      ? (trendWeight / trends.length)
      : intensityToWeight(trends[i].rawTraffic);
    trends[i].weight = w;
    log(`       ${i + 1}. "${trends[i].keyword}" (${trends[i].traffic}) → weight: ${w.toFixed(2)}`);
  }

  // Step 2: Download base audio
  log(`[2/7] Downloading base audio: "${input}"...`);
  const baseResult = await downloadAudio(input, 'base_audio', duration);
  log(`       → "${baseResult.title}"`);

  // Step 3: Download all 5 trend audios in parallel
  log(`[3/7] Downloading ${trends.length} trend audios...`);
  const trendResults = await Promise.all(
    trends.map((t, i) =>
      downloadAudio(t.keyword, `trend_${i}`, duration)
        .then(r => { log(`       → [${i + 1}] "${r.title}"`); return r; })
        .catch(err => { log(`       → [${i + 1}] SKIP: ${err.message}`); return null; })
    )
  );

  // Filter out failed downloads
  const validTrends = [];
  for (let i = 0; i < trendResults.length; i++) {
    if (trendResults[i]) {
      validTrends.push({ ...trends[i], audioPath: trendResults[i].path, title: trendResults[i].title });
    }
  }
  log(`       → ${validTrends.length}/${trends.length} downloaded`);

  // Step 4: Preprocess all
  log('[4/7] Preprocessing audio...');
  const basePrepared = await prepare(baseResult.path, { sampleRate, duration, tag: 'base' });

  const trendPrepared = await Promise.all(
    validTrends.map((t, i) =>
      prepare(t.audioPath, { sampleRate, duration, tag: `trend_${i}` })
    )
  );

  // Step 5: EQ filtering
  log('[5/7] Applying EQ filters...');
  log('       → Base: highpass @ 300Hz');
  const baseFiltered = await applyHighPass(basePrepared);

  log(`       → ${validTrends.length} trends: lowpass @ 4000Hz`);
  const trendFiltered = await Promise.all(
    trendPrepared.map((p, i) =>
      applyLowPass(p, { cutoff: 4000, tag: `trend_${i}` })
    )
  );

  // Step 6: Mix all layers
  log('[6/7] Mixing all layers...');
  const layers = validTrends.map((t, i) => ({
    path: trendFiltered[i],
    weight: t.weight,
  }));

  const mixedPath = await mixLayers(baseFiltered, layers, outputPath);

  // Step 7: Done
  const totalWeight = layers.reduce((s, l) => s + l.weight, 0);
  log('[7/7] Complete');
  log(`       → ${validTrends.length} trends overlaid`);
  log(`       → total trend weight: ${totalWeight.toFixed(2)}`);
  log(`       → output: ${mixedPath}`);

  return {
    path: mixedPath,
    trends: validTrends.map(t => ({ keyword: t.keyword, traffic: t.traffic, weight: t.weight, title: t.title })),
    totalWeight,
  };
}

function log(msg) {
  console.log(`  ${msg}`);
}
