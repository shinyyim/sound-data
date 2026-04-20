#!/usr/bin/env node

import { program } from 'commander';
import { runOnce } from './src/pipeline.js';
import { startLoop } from './src/loop/realtime-loop.js';

program
  .name('sound-data')
  .description('Audio art pipeline — real-time trends distort personal audio')
  .version('1.0.0')
  .argument('<input>', 'Song title or YouTube URL')
  .option('-m, --mode <mode>', 'once or live', 'once')
  .option('-d, --duration <seconds>', 'Max duration in seconds', '120')
  .option('-o, --output <path>', 'Output file path')
  .option('-w, --trend-weight <weight>', 'Manual trend weight 0.0-1.0')
  .option('-s, --sample-rate <hz>', 'Target sample rate', '44100')
  .option('-i, --interval <seconds>', 'Live mode: seconds between trend checks', '60')
  .action(async (input, opts) => {
    console.log('\n  Sound Data Pipeline v1.0.0');
    console.log('  ' + '─'.repeat(35));

    const options = {
      input,
      mode: opts.mode,
      duration: parseInt(opts.duration, 10),
      sampleRate: parseInt(opts.sampleRate, 10),
      trendWeight: opts.trendWeight ? parseFloat(opts.trendWeight) : undefined,
      output: opts.output,
      interval: parseInt(opts.interval, 10),
    };

    try {
      if (options.mode === 'live') {
        console.log('  Mode: LIVE\n');
        await startLoop(options);
      } else {
        console.log('  Mode: ONCE\n');
        await runOnce(options);
      }
    } catch (err) {
      console.error(`\n  Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
