"""Compare sampled rendered voice windows with the audio assembled from the EDL.

This checks waveform agreement and lag, not semantic or theological correctness.
Music/SFX or heavy processing may reduce correlation and require listening.
"""
import argparse
import json
import math
import subprocess
from pathlib import Path
import numpy as np

REFERENCE_SAMPLE_RATE = 48000


def decode(file, rate=16000):
    result = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(file), '-vn', '-ac', '1', '-ar',
         str(rate), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(result.stdout, dtype='<f4').astype(np.float64)


def best_match(reference, candidate, search_samples):
    """candidate includes search_samples of context on both sides."""
    a = np.asarray(reference, dtype=np.float64)
    b = np.asarray(candidate, dtype=np.float64)
    n = len(a)
    if len(b) != n + 2 * search_samples or n < 2:
        raise ValueError('Candidate must include symmetric search context')
    a = a - a.mean()
    energy = np.dot(a, a)
    if energy < n * 1e-9:
        return {'status': 'silent-window', 'correlation': None, 'lagSamples': None}
    size = 1 << (len(a) + len(b) - 2).bit_length()
    dots = np.fft.irfft(np.fft.rfft(b, size) * np.fft.rfft(a[::-1], size), size)
    dots = dots[n - 1:len(b)]
    sums = np.concatenate(([0.], np.cumsum(b)))
    squares = np.concatenate(([0.], np.cumsum(b * b)))
    local_sum = sums[n:] - sums[:-n]
    local_energy = squares[n:] - squares[:-n] - local_sum * local_sum / n
    scores = dots / np.sqrt(np.maximum(energy * local_energy, 1e-20))
    best = int(np.argmax(scores))
    return {'status': 'compared', 'correlation': float(scores[best]),
            'lagSamples': best - search_samples}


def expected_audio(job, public_dir, rate):
    fps = job.get('fps', 30)
    clips, cache = [], {}
    for clip in job['clips']:
        source = Path(clip['source'])
        if not source.is_absolute():
            source = public_dir / source
        source = source.resolve()
        if source not in cache:
            cache[source] = decode(source, rate)
        # Same positive rounding as Math.round used by the renderer.
        start = round(math.floor(clip['start'] * fps + .5) / fps * rate)
        end = round(math.floor(clip['end'] * fps + .5) / fps * rate)
        audio = cache[source][start:end]
        clips.append(np.pad(audio, (0, max(0, end - start - len(audio)))))
    return np.concatenate(clips)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('job', type=Path)
    parser.add_argument('render', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--public-dir', type=Path,
                        default=Path(__file__).parents[1] / 'public')
    args = parser.parse_args()
    job = json.loads(args.job.read_text(encoding='utf-8-sig'))
    # Common production frame rates divide 48kHz exactly. At 16kHz a 30fps
    # cut can round to a third of a sample and cause false correlation failures.
    rate, seconds = REFERENCE_SAMPLE_RATE, 4
    search = round(rate * .12)
    expected = expected_audio(job, args.public_dir, rate)
    actual = decode(args.render, rate)
    duration = min(len(expected), len(actual)) / rate
    if duration < seconds + .5:
        raise ValueError('At least 4.5 seconds are required for this sampled comparison')
    starts = np.linspace(.2, duration - seconds - .2, min(9, max(1, int(duration // 8))))
    windows = []
    padded = np.pad(actual, (search, search))
    for start in starts:
        at, length = round(start * rate), round(seconds * rate)
        result = best_match(expected[at:at + length],
                            padded[at:at + length + 2 * search], search)
        result['startSeconds'] = float(start)
        result['lagMs'] = None if result['lagSamples'] is None else result['lagSamples'] / rate * 1000
        windows.append(result)
    compared = [w for w in windows if w['status'] == 'compared']
    passed = bool(compared) and all(w['correlation'] >= .9 and abs(w['lagMs']) <= 80 for w in compared)
    report = {'passed': passed, 'sampleRate': rate, 'windowSeconds': seconds,
              'windows': windows, 'minimumCorrelation': min((w['correlation'] for w in compared), default=None),
              'maximumAbsoluteLagMs': max((abs(w['lagMs']) for w in compared), default=None),
              'expectedSeconds': len(expected) / rate, 'renderedAudioSeconds': len(actual) / rate,
              'scope': 'Sampled waveform agreement against the EDL; not proof of complete speech or editorial fidelity.',
              'requiresHumanListening': True}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))
    if not passed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
