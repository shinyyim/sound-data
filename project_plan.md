# Project Plan: Sound Data Pipeline

## Overview

A real-time audio system that fetches trending data from the internet and uses it as an external force to distort personal audio. The system blends a user's chosen song with audio derived from trending keywords, creating a sonic representation of how collective digital culture interferes with individual expression.

---

## Concept

- Personal audio = individual identity / choice
- Trend audio = external noise / collective force
- The mix = the distorted reality we experience when personal and public information collide
- As trend intensity rises, distortion increases — clarity collapses

---

## Architecture

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

---

## Tech Stack

| Component         | Tool / Library                          |
| ----------------- | --------------------------------------- |
| Language          | Python 3.10+                            |
| YouTube Download  | yt-dlp                                  |
| Trend Data        | pytrends (Google Trends API)            |
| Audio Processing  | pydub, scipy, librosa                   |
| EQ / Filtering    | scipy.signal (butterworth filters)      |
| Mixing            | numpy, pydub                            |
| Playback          | sounddevice or pyaudio                  |
| Output Export     | soundfile, pydub                        |
| Optional GUI      | Gradio or Streamlit                     |

---

## Milestones

### Phase 1: Core Pipeline (Week 1-2)

- [ ] Project setup (venv, dependencies)
- [ ] YouTube audio download module (yt-dlp wrapper)
- [ ] Google Trends fetch module (pytrends)
- [ ] YouTube search by keyword module
- [ ] Basic audio loading and format conversion

### Phase 2: Audio Processing (Week 3-4)

- [ ] Resampling and normalization
- [ ] EQ filter implementation
  - [ ] Base audio: low OFF, mid ON, high ON
  - [ ] Trend audio: low ON, mid ON, high OFF
- [ ] Trim / loop alignment logic

### Phase 3: Mixing Engine (Week 5)

- [ ] Static mix with fixed ratio
- [ ] Dynamic mix ratio based on trend intensity
- [ ] Volume balancing and output normalization

### Phase 4: Output and Playback (Week 6)

- [ ] Export to WAV file
- [ ] Real-time playback
- [ ] Real-time loop mode (continuous trend update)

### Phase 5: Advanced Extensions (Week 7-8)

- [ ] Dynamic distortion (trend intensity → distortion amount)
- [ ] Multi-layer system (multiple trends stacked)
- [ ] Spatial mapping concept (frequency → physical output)

---

## Directory Structure

```
sound_data/
├── pipeline.md              # pipeline diagram
├── project_plan.md          # this file
├── src/
│   ├── main.py              # entry point
│   ├── fetch/
│   │   ├── youtube.py       # yt-dlp download & search
│   │   └── trends.py        # Google Trends fetch
│   ├── audio/
│   │   ├── preprocess.py    # resample, normalize, trim
│   │   ├── eq.py            # EQ filtering
│   │   └── mix.py           # mixing engine
│   └── output/
│       ├── playback.py      # real-time playback
│       └── export.py        # file export
├── data/
│   ├── base/                # downloaded base audio
│   └── trend/               # downloaded trend audio
├── output/                  # exported mixed audio
├── requirements.txt
└── README.md
```

---

## Requirements

```
yt-dlp
pytrends
pydub
librosa
scipy
numpy
soundfile
sounddevice
```

---

## Key Design Decisions

### EQ Split Strategy

Base audio keeps mid + high (voice, melody, clarity), trend audio keeps low + mid (weight, pressure, noise). This creates a layered collision where the trend literally occupies the foundational frequencies of the mix.

### Dynamic Mix Ratio

Trend intensity (from Google Trends score 0-100) maps directly to mix weight:
- Low trend (0-30): trend audio is subtle background
- Mid trend (30-70): noticeable interference
- High trend (70-100): trend audio dominates, personal audio becomes barely audible

### Real-time Loop

The system can run as a continuous loop — re-fetching trends at intervals and updating the audio mix. This models how trending information constantly shifts and reshapes our media environment.

---

## Risk and Constraints

| Risk                              | Mitigation                                      |
| --------------------------------- | ----------------------------------------------- |
| YouTube download may be blocked   | Use yt-dlp with fallback options                |
| pytrends rate limiting            | Cache trend data, fetch at intervals (5-10 min) |
| Audio format mismatch             | Force convert all to 44100Hz mono WAV           |
| Large audio files                 | Limit clip duration (30-60 sec segments)        |
| Real-time latency                 | Pre-buffer trend audio, process in chunks       |

---

## References

- [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp)
- [pytrends documentation](https://github.com/GeneralMills/pytrends)
- [librosa documentation](https://librosa.org/doc/latest/)
- [scipy.signal filters](https://docs.scipy.org/doc/scipy/reference/signal.html)
