#!/usr/bin/env python3
"""
GARGANTUA — procedural ambient soundtrack generator.

Builds the 40-second, seamlessly looping deep-space ambient bed used by the
black-hole piece. Everything is synthesised from first principles with numpy;
no third-party samples, loops or presets are involved.

The loop is *mathematically* seamless: every oscillator, beat and slow LFO
completes an integer number of cycles in exactly `DURATION` seconds, and every
noise layer is generated directly in the frequency domain (therefore perfectly
periodic). No crossfade is needed, so a sample-accurate `loop` plays without a
click or a hole in the bed.

Sound design
------------
* sub drone ......... 36 / 43.175 / 43.2 / 43.225 / 54 Hz, gently saturated
* harmonic pad ...... detuned partials of 43.2 Hz, slowly beating
* solar wind ........ very low, softly filtered periodic noise
* shimmer ........... two decorrelated high bands with slow tremolo
* macro swells ...... one- and two-cycle amplitude envelopes over the loop

Output
------
* OGG Vorbis (stereo, 32 kHz) when `soundfile` + libsndfile are available;
* otherwise a compact mono 16-bit WAV (32 kHz, ~2.6 MB) and a note that the
  app's default source should point at the .wav instead.

Usage
-----
    python tools/make-audio.py                # write assets/audio/gargantua-ambient.ogg
    python tools/make-audio.py --wav          # force the WAV fallback
    python tools/make-audio.py --out-dir ...  # custom output directory

The committed asset was generated with this exact script (seed 20261102).
"""

from __future__ import annotations

import argparse
import math
import sys
import wave
from pathlib import Path

import numpy as np

# ── constants ────────────────────────────────────────────────────────────────
SAMPLE_RATE = 32_000
DURATION = 40.0  # seconds; 40–60 s is the brief, 40 keeps the WAV fallback < 3 MB
SEED = 20261102
TARGET_PEAK_DBFS = -3.0
DEFAULT_OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "audio"
BASE_FREQUENCY = 43.2  # Hz — the pitch centre of the whole piece


def dbfs(value: float) -> float:
    return 20.0 * math.log10(max(value, 1e-12))


def db_to_linear(db: float) -> float:
    return 10.0 ** (db / 20.0)


def pan_gains(pan: float) -> tuple[float, float]:
    """Constant-power stereo pan, pan ∈ [-1, 1]."""
    theta = (float(np.clip(pan, -1.0, 1.0)) + 1.0) * (math.pi / 4.0)
    return math.cos(theta), math.sin(theta)


def band_mask(
    freqs: np.ndarray,
    low: float,
    high: float,
    low_order: float = 2.0,
    high_order: float = 2.0,
) -> np.ndarray:
    """Smooth band-pass magnitude mask (no hard edges => no ringing)."""
    f = np.maximum(freqs, 1e-6)
    low_gain = 1.0 / (1.0 + (low / f) ** (2.0 * low_order))
    high_gain = 1.0 / (1.0 + (f / high) ** (2.0 * high_order))
    return low_gain * high_gain


def periodic_noise(rng: np.random.Generator, samples: int, shape) -> np.ndarray:
    """White noise shaped in the frequency domain: perfectly loop-periodic."""
    freqs = np.fft.rfftfreq(samples, 1.0 / SAMPLE_RATE)
    phases = rng.uniform(0.0, 2.0 * math.pi, freqs.size)
    phases[0] = 0.0
    spectrum = shape(freqs) * np.exp(1j * phases)
    signal = np.fft.irfft(spectrum, samples)
    std = float(np.std(signal))
    return signal / std if std > 0.0 else signal


def circular_shape(signal: np.ndarray, shape) -> np.ndarray:
    """Zero-phase circular filtering — preserves exact loop periodicity."""
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(signal.size, 1.0 / SAMPLE_RATE)
    return np.fft.irfft(spectrum * shape(freqs), signal.size)


class SoundBed:
    """A stereo pair of accumulation buffers with tiny synthesis helpers."""

    def __init__(self, samples: int) -> None:
        self.samples = samples
        self.time = np.arange(samples, dtype=np.float64) / SAMPLE_RATE
        self.left = np.zeros(samples, dtype=np.float64)
        self.right = np.zeros(samples, dtype=np.float64)

    def add(
        self,
        buffer_left: np.ndarray,
        buffer_right: np.ndarray,
        signal: np.ndarray,
        amplitude: float,
        pan: float = 0.0,
    ) -> None:
        gain_left, gain_right = pan_gains(pan)
        buffer_left += signal * (amplitude * gain_left)
        buffer_right += signal * (amplitude * gain_right)

    def add_mono(self, signal: np.ndarray, amplitude: float) -> None:
        self.add(self.left, self.right, signal, amplitude, 0.0)


def loop_frequency(hz_value: float, duration: float) -> float:
    """Snap a frequency to the loop grid so it is exactly periodic."""
    return round(hz_value * duration) / duration


def sine(bed: SoundBed, hz_value: float, duration: float, phase: float = 0.0) -> np.ndarray:
    return np.sin(2.0 * math.pi * loop_frequency(hz_value, duration) * bed.time + phase)


def add_drone(bed: SoundBed, rng: np.random.Generator, duration: float) -> None:
    """Sub-bass bed: a slowly beating cluster around 43.2 Hz plus 36/54 Hz."""
    swell_one = 0.5 + 0.5 * np.sin(2.0 * math.pi * (1.0 / duration) * bed.time + 0.4)
    swell_two = 0.5 + 0.5 * np.sin(2.0 * math.pi * (2.0 / duration) * bed.time + 2.2)
    envelope = 0.78 + 0.14 * swell_one + 0.08 * swell_two

    partials = [
        # (Hz, amplitude, slow FM depth [rad])
        (36.000, 0.34, 0.10),
        (43.175, 0.14, 0.18),
        (43.200, 0.24, 0.22),
        (43.225, 0.14, 0.18),
        (54.000, 0.10, 0.08),
    ]
    drone = np.zeros(bed.samples, dtype=np.float64)
    for index, (hz_value, amplitude, fm_depth) in enumerate(partials):
        # A very slow, loop-locked frequency wobble adds life without pitch drift.
        fm = fm_depth * np.sin(
            2.0 * math.pi * ((index % 3) + 1.0) / duration * bed.time + index * 1.7
        )
        wave = np.sin(2.0 * math.pi * loop_frequency(hz_value, duration) * bed.time + rng.uniform(0, 2 * math.pi) * 0.15 + fm)
        drone += amplitude * wave

    # Gentle even-harmonic saturation warms the low end; amplitude is low enough
    # that nothing above ~1 kHz is produced at an audible level.
    drone = np.tanh(1.5 * drone) / math.tanh(1.5)
    # Deliberately restrained: the sub is felt more than heard on small
    # speakers, so the pad and shimmer below must remain audible.
    bed.add_mono(drone * envelope, 0.30)


def add_harmonic_pad(bed: SoundBed, rng: np.random.Generator, duration: float) -> None:
    """Slowly beating detuned partials of the 43.2 Hz drone."""
    # (harmonic, detune in loop-grid steps, amplitude, pan)
    partials = [
        (2, -2, 0.070, -0.55),
        (2, 0, 0.110, 0.10),
        (2, 2, 0.070, 0.55),
        (3, -1, 0.070, -0.30),
        (3, 0, 0.100, 0.25),
        (3, 1, 0.070, 0.70),
        (4, -1, 0.054, -0.65),
        (4, 0, 0.076, 0.00),
        (4, 1, 0.054, 0.65),
        (5, 0, 0.060, -0.40),
        (5, 2, 0.040, 0.50),
        (6, -2, 0.040, -0.20),
        (6, 1, 0.040, 0.45),
        (8, 0, 0.034, -0.60),
        (8, 2, 0.027, 0.60),
        (10, 0, 0.024, 0.20),
        (12, -1, 0.017, -0.40),
        (16, 0, 0.012, 0.40),
        (24, 0, 0.006, -0.30),
    ]
    grid = 1.0 / duration  # 0.025 Hz per step at 40 s
    for index, (harmonic, detune, amplitude, pan) in enumerate(partials):
        hz_value = BASE_FREQUENCY * harmonic + detune * grid
        cycles = 1 + (index * 3) % 4  # 1…4 slow swells per loop
        lfo_phase = rng.uniform(0.0, 2.0 * math.pi)
        envelope = 0.55 + 0.45 * (0.5 + 0.5 * np.sin(2.0 * math.pi * cycles / duration * bed.time + lfo_phase))
        wave = np.sin(2.0 * math.pi * loop_frequency(hz_value, duration) * bed.time + rng.uniform(0, 2.0 * math.pi))
        bed.add(bed.left, bed.right, wave * envelope, amplitude, pan)


def add_solar_wind(bed: SoundBed, rng: np.random.Generator, duration: float) -> None:
    """Very low, softly filtered noise — the 'wind' of the accretion flow."""

    def wind_shape(freqs: np.ndarray) -> np.ndarray:
        f = np.maximum(freqs, 1e-6)
        return band_mask(freqs, 30.0, 720.0, 2.0, 2.0) * (f / 140.0) ** -0.65

    wind = periodic_noise(rng, bed.samples, wind_shape)
    # Circular delay (integer samples) decorrelates the channels while keeping
    # the loop seamless.
    wind_right = np.roll(wind, 211)

    base = 0.55 + 0.45 * (0.5 + 0.5 * np.sin(2.0 * math.pi * (1.0 / duration) * bed.time + 1.1))
    base *= 0.75 + 0.25 * (0.5 + 0.5 * np.sin(2.0 * math.pi * (3.0 / duration) * bed.time + 2.6))
    left = wind * base * (0.85 + 0.15 * np.sin(2.0 * math.pi * (2.0 / duration) * bed.time))
    right = wind_right * base * (0.85 + 0.15 * np.sin(2.0 * math.pi * (2.0 / duration) * bed.time + 1.9))
    bed.add(bed.left, bed.right, left, 0.032, 0.0)
    bed.add(bed.left, bed.right, right, 0.032, 0.0)

    # A near-inaudible infrabass rumble shares the same envelope.
    rumble = periodic_noise(rng, bed.samples, lambda f: band_mask(f, 22.0, 60.0, 2.0, 2.0))
    bed.add_mono(rumble * base, 0.014)


def add_shimmer(bed: SoundBed, rng: np.random.Generator, duration: float) -> None:
    """Two decorrelated, slowly tremoloed high bands — starlight, not sparkle."""

    def shimmer_shape(freqs: np.ndarray) -> np.ndarray:
        f = np.maximum(freqs, 1e-6)
        return band_mask(freqs, 800.0, 11_000.0, 2.2, 3.0) * (f / 1600.0) ** -0.30

    def sparkle_shape(freqs: np.ndarray) -> np.ndarray:
        return band_mask(freqs, 8_500.0, 12_500.0, 2.5, 3.0)

    left = periodic_noise(rng, bed.samples, shimmer_shape)
    right = periodic_noise(rng, bed.samples, shimmer_shape)
    sparkle_left = periodic_noise(rng, bed.samples, sparkle_shape)
    sparkle_right = periodic_noise(rng, bed.samples, sparkle_shape)

    def tremolo(phase: float, cycles: int) -> np.ndarray:
        return 0.55 + 0.45 * (0.5 + 0.5 * np.sin(2.0 * math.pi * cycles / duration * bed.time + phase))

    left *= tremolo(0.6, 3) * tremolo(2.1, 7)
    right *= tremolo(3.4, 4) * tremolo(5.2, 5)
    sparkle_left *= tremolo(1.2, 9)
    sparkle_right *= tremolo(4.7, 8)

    bed.add(bed.left, bed.right, left, 0.0130, 0.0)
    bed.add(bed.left, bed.right, right, 0.0130, 0.0)
    bed.add(bed.left, bed.right, sparkle_left, 0.0050, 0.0)
    bed.add(bed.left, bed.right, sparkle_right, 0.0050, 0.0)


def synthesise(duration: float = DURATION) -> np.ndarray:
    """Return the stereo bed as float64 with shape (samples, 2)."""
    samples = int(round(SAMPLE_RATE * duration))
    bed = SoundBed(samples)
    rng = np.random.default_rng(SEED)

    add_drone(bed, rng, duration)
    add_harmonic_pad(bed, rng, duration)
    add_solar_wind(bed, rng, duration)
    add_shimmer(bed, rng, duration)

    # One very slow tidal swell over the whole loop.
    swell = 0.86 + 0.14 * (
        0.6 * np.sin(2.0 * math.pi * (1.0 / duration) * bed.time + 0.7)
        + 0.4 * np.sin(2.0 * math.pi * (2.0 / duration) * bed.time + 2.0)
    )
    left = bed.left * swell
    right = bed.right * swell

    # Final safety band-limit: remove DC/rumble below ~22 Hz and anything above
    # 13.5 kHz that could beat with the resampler. Circular => loop-safe.
    def final_shape(freqs: np.ndarray) -> np.ndarray:
        f = np.maximum(freqs, 1e-6)
        return (1.0 / (1.0 + (22.0 / f) ** 4.0)) * (1.0 / (1.0 + (f / 13_500.0) ** 6.0))

    left = circular_shape(left, final_shape)
    right = circular_shape(right, final_shape)

    stereo = np.stack([left, right], axis=1)

    # Normalise peak to -3 dBFS; keep the sub drone dominant without clipping.
    peak = float(np.max(np.abs(stereo)))
    if peak > 0.0:
        stereo *= db_to_linear(TARGET_PEAK_DBFS) / peak
    return stereo


def signal_stats(stereo: np.ndarray) -> dict:
    peak = float(np.max(np.abs(stereo)))
    rms = float(np.sqrt(np.mean(stereo * stereo)))
    seam = float(np.max(np.abs(stereo[0] - stereo[-1])))
    return {
        "peak_dbfs": dbfs(peak),
        "rms_dbfs": dbfs(rms),
        "seam_delta": seam,
        "duration": stereo.shape[0] / SAMPLE_RATE,
    }


def band_energies(stereo: np.ndarray) -> list[tuple[str, float]]:
    mono = stereo.mean(axis=1)
    spectrum = np.fft.rfft(mono)
    freqs = np.fft.rfftfreq(mono.size, 1.0 / SAMPLE_RATE)
    power = np.abs(spectrum) ** 2
    bands = [
        ("20–60 Hz (sub)", 20.0, 60.0),
        ("60–250 Hz (drone body)", 60.0, 250.0),
        ("250–2 kHz (pad)", 250.0, 2_000.0),
        ("2–13.5 kHz (shimmer)", 2_000.0, 13_500.0),
    ]
    total = float(np.sum(power)) or 1.0
    return [(label, 10.0 * math.log10(max(float(np.sum(power[(freqs >= lo) & (freqs < hi)])), 1e-20) / total)) for label, lo, hi in bands]


def write_wav_fallback(path: Path, stereo: np.ndarray) -> None:
    """32 kHz mono 16-bit PCM — small enough for the < 3 MB fallback budget."""
    mono = np.clip(stereo.mean(axis=1), -1.0, 1.0)
    quantised = np.round(mono * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(quantised.tobytes())


def encode_ogg(path: Path, stereo: np.ndarray) -> bool:
    """Encode with libsndfile/Vorbis when available; return False otherwise.

    libsndfile's Vorbis writer overflows the stack when asked for one enormous
    write, so the bed is streamed in modest chunks.
    """
    try:
        import soundfile as sf
    except Exception:  # pragma: no cover - optional dependency
        return False
    try:
        path.unlink(missing_ok=True)
        data = stereo.astype(np.float32)
        chunk = 4096
        with sf.SoundFile(
            str(path),
            mode="w",
            samplerate=SAMPLE_RATE,
            channels=stereo.shape[1],
            format="OGG",
            subtype="VORBIS",
            compression_level=0.45,
        ) as handle:
            for start in range(0, data.shape[0], chunk):
                handle.write(data[start : start + chunk])
        return True
    except Exception as exc:  # pragma: no cover - environment dependent
        print(f"[make-audio] OGG encoding unavailable: {exc}", file=sys.stderr)
        path.unlink(missing_ok=True)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the GARGANTUA ambient loop.")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR, help="output directory")
    parser.add_argument("--duration", type=float, default=DURATION, help="loop length in seconds")
    parser.add_argument("--wav", action="store_true", help="force the small WAV fallback")
    args = parser.parse_args()

    duration = float(args.duration)
    if duration < 20.0:
        parser.error("duration must be at least 20 seconds")

    stereo = synthesise(duration)
    stats = signal_stats(stereo)

    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    ogg_path = out_dir / "gargantua-ambient.ogg"
    wav_path = out_dir / "gargantua-ambient.wav"

    wrote_ogg = False if args.wav else encode_ogg(ogg_path, stereo)
    if wrote_ogg:
        output = ogg_path
        if wav_path.exists():
            wav_path.unlink()
    else:
        write_wav_fallback(wav_path, stereo)
        output = wav_path
        if ogg_path.exists():
            ogg_path.unlink()

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"[make-audio] wrote {output}")
    print(f"[make-audio] {stats['duration']:.2f} s · {SAMPLE_RATE} Hz · "
          f"{'stereo' if wrote_ogg else 'mono (fallback)'} · {size_mb:.2f} MiB")
    print(f"[make-audio] peak {stats['peak_dbfs']:.2f} dBFS · RMS {stats['rms_dbfs']:.2f} dBFS · "
          f"loop seam {stats['seam_delta']:.2e}")
    for label, energy in band_energies(stereo):
        print(f"[make-audio]   {label:<24} {energy:6.1f} dB rel.")
    if not wrote_ogg and not args.wav:
        print("[make-audio] libsndfile/Vorbis missing: wrote the WAV fallback; set "
              "src/audio.js DEFAULT_SRC to './assets/audio/gargantua-ambient.wav'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
