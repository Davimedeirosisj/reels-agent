import importlib.util
import unittest
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('color',Path(__file__).parents[1]/'tools/match_color.py')
color=importlib.util.module_from_spec(spec);spec.loader.exec_module(color)
class ColorTests(unittest.TestCase):
    def test_measures_exposure_and_channel_cast_in_linear_space(self):
        gain,raw=color.measured_gain([.4,.4,.4],[.48,.36,.3],.67,1.5)
        np.testing.assert_allclose(gain,[1/1.2,1/.9,1/.75])
        np.testing.assert_equal(gain,raw)
    def test_bounds_are_explicit_and_dark_patches_cannot_force_unstable_gains(self):
        gain,raw=color.measured_gain([.4,.4,.4],[.1,.4,.8],.67,1.5)
        np.testing.assert_allclose(gain,[1.5,1,.67])
        self.assertEqual(raw[0],4)
        with self.assertRaises(ValueError): color.patch_color(np.zeros((20,20,3)))
        with self.assertRaises(ValueError): color.measured_gain([.4]*3,[0,.4,.4],.67,1.5)
    def test_rejects_samples_outside_the_original_frame(self):
        for rect in [[.8,0,.4,.2],[-.1,0,.1,.1],[0,0,1,float('nan')]]:
            with self.assertRaises(ValueError):color.checked_rect(rect)
if __name__=='__main__':unittest.main()
