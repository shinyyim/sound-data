import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOnce } from './src/pipeline.js';
import { startLoop } from './src/loop/realtime-loop.js';
import { fetchTopTrend, fetchTrends, intensityToWeight } from './src/fetch/trends.js';
import { stop as stopPlayback } from './src/playback/player.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// SSE clients for live progress updates
let sseClients = [];
let liveSession = null;
let lastResult = null;

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter((res) => {
    try { res.write(msg); return true; } catch { return false; }
  });
}

// Override console.log to capture pipeline progress
const origLog = console.log;
console.log = (...args) => {
  origLog(...args);
  const text = args.join(' ').trim();
  if (text) broadcast('log', { message: text });
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function serveMime(ext) {
  const map = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
  return map[ext] || 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // SSE endpoint for live progress
  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(':\n\n');
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
    return;
  }

  // API: get last result
  if (url.pathname === '/api/last-result' && req.method === 'GET') {
    if (lastResult) {
      sendJson(res, 200, lastResult);
    } else {
      sendJson(res, 404, { error: 'No result yet' });
    }
    return;
  }

  // API: fetch trends
  if (url.pathname === '/api/trends' && req.method === 'GET') {
    try {
      const trends = await fetchTrends('US', 10);
      sendJson(res, 200, { trends });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // API: run pipeline once (fire-and-forget, results via SSE)
  if (url.pathname === '/api/mix/once' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.input) return sendJson(res, 400, { error: 'input required' });

    // Respond immediately, run pipeline in background
    sendJson(res, 202, { status: 'started' });

    broadcast('status', { stage: 'starting', message: 'Pipeline starting...' });

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${ts}_mix.wav`;
    const outputPath = path.join(ROOT, 'output', filename);

    runOnce({
      input: body.input,
      duration: body.duration || 120,
      sampleRate: body.sampleRate || 44100,
      trendWeight: body.trendWeight,
      output: outputPath,
    }).then((result) => {
      lastResult = {
        outputUrl: `/output/${filename}`,
        filename,
        input: body.input,
        timestamp: new Date().toISOString(),
        trends: result.trends,
        totalWeight: result.totalWeight,
      };
      broadcast('result', lastResult);
      broadcast('status', { stage: 'done', message: 'Pipeline complete' });
    }).catch((err) => {
      broadcast('status', { stage: 'error', message: err.message });
    });
    return;
  }

  // API: start live mode
  if (url.pathname === '/api/mix/live/start' && req.method === 'POST') {
    if (liveSession) {
      return sendJson(res, 409, { error: 'Live session already running' });
    }
    const body = await parseBody(req);
    if (!body.input) return sendJson(res, 400, { error: 'input required' });

    liveSession = { running: true };
    broadcast('status', { stage: 'live-start', message: 'Live mode starting...' });

    startLoop({
      input: body.input,
      duration: body.duration || 60,
      sampleRate: body.sampleRate || 44100,
      interval: body.interval || 60,
      output: path.join(ROOT, 'output', 'mixed_output.wav'),
    }).catch((err) => {
      broadcast('status', { stage: 'error', message: err.message });
    }).finally(() => {
      liveSession = null;
    });

    sendJson(res, 200, { status: 'started' });
    return;
  }

  // API: stop live mode
  if (url.pathname === '/api/mix/live/stop' && req.method === 'POST') {
    stopPlayback();
    liveSession = null;
    process.emit('SIGINT');
    broadcast('status', { stage: 'live-stop', message: 'Live mode stopped' });
    sendJson(res, 200, { status: 'stopped' });
    return;
  }

  // Serve output audio files
  if (url.pathname.startsWith('/output/')) {
    const filePath = path.join(ROOT, url.pathname);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      sendJson(res, 404, { error: 'File not found' });
    }
    return;
  }

  // Serve static files from public/
  let filePath = path.join(ROOT, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': serveMime(path.extname(filePath)), 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    sendJson(res, 404, { error: 'Not found' });
  }
});

server.listen(PORT, () => {
  origLog(`\n  Sound Data Pipeline — Web UI`);
  origLog(`  http://localhost:${PORT}\n`);
});
