import importlib.util
import unittest
from pathlib import Path
import numpy as np
import tempfile
import wave
import shutil
spec = importlib.util.spec_from_file_location('analysis', Path(__file__).parents[1] / 'tools' / 'audio_analysis.py')
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)

class AnalysisTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg is required for decoder integration')
    def test_ffmpeg_decoder_finds_known_wav_onsets(self):
        samples = np.zeros(16000 * 5)
        for time in [.5, 1, 1.5, 2, 2.5, 3, 3.5]:
            start = int(time * 16000)
            samples[start:start+800] = .5 * np.sin(np.arange(800) / 16000 * np.pi * 880)
        with tempfile.TemporaryDirectory(prefix='reels-audio-') as folder:
            file = Path(folder) / 'pulses.wav'
            with wave.open(str(file), 'wb') as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(16000)
                output.writeframes((samples * 32767).astype('<i2').tobytes())
            result = analysis.analyze_file(file)
        self.assertEqual(result['tempoBpmCandidate'], 120)
        self.assertEqual(len(result['onsetCandidates']), 7)

    def test_steady_tone_has_no_repeating_beats(self):
        t = np.arange(16000 * 4) / 16000
        result = analysis.analyze_energy(analysis.energy_frames(.2 * np.sin(t * np.pi * 880)))
        self.assertIsNone(result['tempoBpmCandidate'])
        self.assertEqual(result['silences'], [])

    def test_known_pulses_and_silence(self):
        samples = np.zeros(16000 * 5)
        for time in [.5, 1, 1.5, 2, 2.5, 3, 3.5]:
            start = int(time * 16000)
            samples[start:start+800] = .5 * np.sin(np.arange(800) / 16000 * np.pi * 880)
        result = analysis.analyze_energy(analysis.energy_frames(samples))
        self.assertEqual(result['onsetCandidates'], [.5, 1, 1.5, 2, 2.5, 3, 3.5])
        self.assertEqual(result['tempoBpmCandidate'], 120)
        self.assertTrue(any(s['end'] == 5 for s in result['silences']))

    def test_silence_does_not_become_a_tempo(self):
        result = analysis.analyze_energy(np.zeros(100))
        self.assertEqual(result['onsetCandidates'], [])
        self.assertIsNone(result['tempoBpmCandidate'])

if __name__ == '__main__':
    unittest.main()
