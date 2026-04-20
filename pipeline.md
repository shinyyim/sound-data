# Sound Data Pipeline

Input → Data Fetch → Audio Processing → Mixing → Output

---

## 1. Input Layer

- user_input
  - song title or YouTube URL

---

## 2. Data Fetch Layer

### 2.1 Base Audio (Personal)

- Source: YouTube
- Process:
  - search or direct URL
  - download audio (mp3 / wav)
  - convert to standard format

```
base_audio.wav
```

---

### 2.2 Trend Data

- Source: Google Trends
- Process:
  - fetch top trending keyword (real-time or daily)

```
trend_keyword = "..."
```

---

### 2.3 Trend Audio (External)

- Source: YouTube
- Process:
  - search YouTube with trend keyword
  - select top video
  - extract audio

```
trend_audio.wav
```

---

## 3. Audio Processing Layer

### 3.1 Pre-processing

- resample (match sample rate)
- trim or loop alignment
- normalize volume

---

### 3.2 EQ Filtering

#### Personal Audio (Base)

- remove low frequencies
- keep mid and high

```
base_audio_filtered = EQ(
  low  = OFF,
  mid  = ON,
  high = ON
)
```

#### Trend Audio (Incoming)

- keep low and mid
- remove high

```
trend_audio_filtered = EQ(
  low  = ON,
  mid  = ON,
  high = OFF
)
```

---

## 4. Mixing Layer

### 4.1 Balance Control

- dynamic weight based on trend intensity

```
mix_ratio = dynamic
```

### 4.2 Combine Audio

```
output_audio = mix(
  base_audio_filtered,
  trend_audio_filtered,
  ratio = mix_ratio
)
```

---

## 5. Output Layer

- real-time playback
  or
- exported audio file

```
output.wav
```

---

## 6. Real-time Loop (Optional)

```
while (system_running):

  trend_keyword = fetch_trend()
  trend_audio = update_audio(trend_keyword)

  processed_audio = process_and_mix()

  play(processed_audio)
```

---

## 7. Advanced Extensions

### 7.1 Dynamic Distortion

- trend intensity increases → stronger distortion
- multiple trends → layered noise

---

### 7.2 Multi-layer System

```
trend_1 + trend_2 + trend_3
→ collapse of clarity
```

---

### 7.3 Spatial Mapping

- low frequency → vibration / subwoofer
- high frequency → directional sound / light

---

## 8. Summary

A pipeline that converts real-time trends into an external force that distorts personal audio.
