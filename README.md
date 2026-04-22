# Sound Data Pipeline

An audio art pipeline that converts real-time trends into an external force that distorts personal audio.

Personal audio represents individual choice. Google Trends audio represents collective noise. As trend intensity rises, distortion deepens — clarity collapses.

## Concept

```
[User Input] → [YouTube Download] → [Base Audio]
                                         ↓
[Google Trends] → [Trend Keyword] → [YouTube Search] → [Trend Audio]
                                         ↓
                             [Audio Processing / EQ]
                                         ↓
                                  [Mixing Engine]
                                         ↓
                                  [Output / Playback]
```

Base audio keeps mid + high frequencies (voice, melody, clarity). Trend audio keeps low + mid (weight, pressure, noise). The collision places trending culture at the foundation of personal expression.

## Stack

- Node.js 20+ (ES modules)
- `yt-dlp` — YouTube audio extraction
- `ffmpeg` — resampling, EQ filtering, mixing
- `commander` — CLI
- `node-web-audio-api` — playback
- Google Trends RSS feed — trend source

## Requirements

- Node.js 20+
- `ffmpeg` on PATH
- `yt-dlp` on PATH

## Install

```
npm install
```

## Usage

### CLI — one-shot mix

```
npm run once -- "<song title or YouTube URL>"
```

Example:

```
node index.js "Radiohead - Everything In Its Right Place" --duration 60
```

Output WAV is written to `output/<timestamp>_mix.wav`.

### CLI — live mode

Re-fetches trends on an interval and streams the updated mix.

```
node index.js "<input>" --mode live --interval 60
```

### Options

| Flag | Description | Default |
| --- | --- | --- |
| `-m, --mode <mode>` | `once` or `live` | `once` |
| `-d, --duration <sec>` | Max clip duration | `120` |
| `-s, --sample-rate <hz>` | Target sample rate | `44100` |
| `-w, --trend-weight <0-1>` | Manual trend weight (overrides dynamic) | — |
| `-i, --interval <sec>` | Live mode re-fetch interval | `60` |
| `-o, --output <path>` | Output file path | auto |

### Web UI

```
npm run web
```

Open `http://localhost:3000`. The server exposes:

- `POST /api/mix/once` — run pipeline once
- `POST /api/mix/live/start` — start live loop
- `POST /api/mix/live/stop` — stop live loop
- `GET  /api/trends` — current trending keywords
- `GET  /api/events` — SSE progress stream
- `GET  /output/<file>` — generated audio

## Pipeline Steps

1. Fetch top 5 Google Trends keywords (RSS).
2. Download base audio from the user input (YouTube).
3. Download 5 trend audios in parallel.
4. Preprocess — resample, trim, normalize.
5. EQ filter — base highpass @ 300 Hz, trends lowpass @ 4000 Hz.
6. Mix all layers with dynamic weights driven by trend traffic.
7. Export mixed WAV.

## Project Layout

```
sound_data/
├── index.js              # CLI entry point
├── server.js             # web server + SSE
├── src/
│   ├── pipeline.js       # orchestrator
│   ├── fetch/            # youtube, trends
│   ├── audio/            # preprocess, eq, mixer, wav-utils
│   ├── loop/             # realtime-loop
│   └── playback/         # player
├── public/               # web UI
├── data/                 # downloaded base/trend audio
├── output/               # exported mixes
├── Dockerfile
├── render.yaml
└── pipeline.md           # pipeline spec
```

## Deployment

Dockerfile builds a Node 20 image with `ffmpeg` and `yt-dlp` preinstalled. `render.yaml` deploys as a Docker web service on Render.

```
docker build -t sound-data .
docker run -p 3000:3000 sound-data
```
