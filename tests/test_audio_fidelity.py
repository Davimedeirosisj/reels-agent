import importlib.util
import unittest
from pathlib import Path
import numpy as np

spec = importlib.util.spec_from_file_location('fidelity', Path(__file__).parents[1] / 'tools/audio_fidelity.py')
fidelity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fidelity)


class AudioFidelityTests(unittest.TestCase):
    def test_finds_lag_despite_gain_and_dc_change(self):
        voice = np.random.default_rng(7).normal(0, .1, 16000)
        candidate = np.pad(voice * .4 + .03, (500 + 37, 500 - 37))
        result = fidelity.best_match(voice, candidate, 500)
        self.assertEqual(result['lagSamples'], 37)
        self.assertGreater(result['correlation'], .999)

    def test_unrelated_audio_has_low_agreement(self):
        rng = np.random.default_rng(9)
        result = fidelity.best_match(rng.normal(size=16000), rng.normal(size=17000), 500)
        self.assertLess(result['correlation'], .1)

    def test_silence_cannot_prove_agreement(self):
        result = fidelity.best_match(np.zeros(16000), np.zeros(17000), 500)
        self.assertEqual(result['status'], 'silent-window')
        self.assertIsNone(result['correlation'])


if __name__ == '__main__':
    unittest.main()
