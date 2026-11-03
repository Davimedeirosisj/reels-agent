import importlib.util
import unittest
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
import numpy as np

spec = importlib.util.spec_from_file_location('fidelity', Path(__file__).parents[1] / 'tools/audio_fidelity.py')
fidelity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fidelity)


class AudioFidelityTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg required for physical cut regression')
    def test_multiple_frame_cuts_match_independent_native_rate_assembly(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source, assembled = folder/'source.wav', folder/'assembled.wav'
            rate = 48000
            times = np.arange(rate*2)/rate
            signal = (.2*np.sin(2*np.pi*7123*times)*32767).astype('<i2')
            with wave.open(str(source), 'wb') as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(rate)
                output.writeframes(signal.tobytes())
            # FFmpeg trims at native integer sample boundaries independently of
            # expected_audio. These joins expose 16kHz fractional-sample drift.
            spans = [(0, 7), (10, 17), (23, 48)]
            filters = ';'.join(f'[0:a]atrim=start_sample={a*1600}:end_sample={b*1600},asetpts=PTS-STARTPTS[a{i}]'
                for i, (a, b) in enumerate(spans))
            filters += ';[a0][a1][a2]concat=n=3:v=0:a=1[out]'
            subprocess.run(['ffmpeg','-v','error','-i',str(source),'-filter_complex',filters,
                '-map','[out]','-c:a','pcm_s16le',str(assembled)], check=True, capture_output=True)
            job = {'fps':30,'clips':[{'source':str(source),'start':a/30,'end':b/30} for a,b in spans]}
            expected = fidelity.expected_audio(job, folder, fidelity.REFERENCE_SAMPLE_RATE)
            actual = fidelity.decode(assembled, fidelity.REFERENCE_SAMPLE_RATE)
            np.testing.assert_allclose(expected, actual, atol=1e-7)

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
