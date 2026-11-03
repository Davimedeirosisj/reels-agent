"""Local streaming energy/onset analysis. Candidates are not editorial instructions."""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path
import numpy as np

def energy_frames(samples, sample_rate=16000, hop_seconds=0.01):
    hop = round(sample_rate * hop_seconds)
    if samples.size < hop:
        return np.array([], dtype=float)
    signal = np.asarray(samples[:len(samples) // hop * hop], dtype=np.float64).reshape(-1, hop)
    return np.sqrt(np.mean(signal ** 2, axis=1))

def analyze_energy(energy, hop_seconds=0.01, threshold_db=-38, min_silence=0.4):
    energy = np.asarray(energy, dtype=float)
    db = 20 * np.log10(np.maximum(energy, 1e-10))
    spans = []
    start = None
    for i, quiet in enumerate(db < threshold_db):
        if quiet and start is None:
            start = i
        if not quiet and start is not None:
            if (i - start) * hop_seconds >= min_silence:
                spans.append({'start': round(start * hop_seconds, 4), 'end': round(i * hop_seconds, 4)})
            start = None
    if start is not None and (len(db) - start) * hop_seconds >= min_silence:
        spans.append({'start': round(start * hop_seconds, 4), 'end': round(len(db) * hop_seconds, 4)})
    # Relative energy rises reject steady tones; refractory time avoids counting one hit twice.
    onsets = []
    previous = -1e9
    history = max(1, round(0.12 / hop_seconds))
    for i in range(1, len(energy)):
        baseline = float(np.median(energy[max(0, i-history):i]))
        rise = energy[i] - energy[i-1]
        if db[i] > threshold_db and rise > max(0.015, baseline * 0.65) and i*hop_seconds-previous >= 0.18:
            previous = i * hop_seconds
            onsets.append(round(previous, 4))
    intervals = np.diff(onsets)
    usable = intervals[(intervals >= 0.25) & (intervals <= 2)]
    bpm, confidence = None, 0.0
    if len(usable) >= 3:
        median = float(np.median(usable))
        confidence = max(0.0, 1.0 - float(np.median(np.abs(usable-median))) / median)
        # Also penalize irregular outliers instead of calling any transient train musical beats.
        confidence *= float(np.mean(np.abs(usable-median) < median*0.15))
        if confidence >= 0.7:
            bpm = round(60 / median, 2)
    return {'duration': round(len(energy) * hop_seconds, 4), 'silences': spans,
            'onsetCandidates': onsets, 'tempoBpmCandidate': bpm, 'tempoConfidence': round(confidence, 3),
            'method': 'RMS energy rises, 10ms hops; no speech deletion or musical meter inference',
            'editorialReviewRequired': True}

def analyze_file(path):
    hop, pending, energy = 160, b'', []
    with tempfile.TemporaryFile() as log:
        process = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], stdout=subprocess.PIPE, stderr=log)
        try:
            while True:
                block = process.stdout.read(65536)
                if not block:
                    break
                pending += block
                size = len(pending) // (hop * 4) * hop * 4
                if size:
                    energy.extend(energy_frames(np.frombuffer(pending[:size], dtype='<f4')).tolist())
                    pending = pending[size:]
            code = process.wait()
            if code:
                log.seek(0)
                raise RuntimeError(log.read().decode('utf-8', errors='replace'))
        finally:
            process.stdout.close()
            if process.poll() is None:
                process.terminate()
                process.wait()
    return analyze_energy(energy)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    result = analyze_file(args.input)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
