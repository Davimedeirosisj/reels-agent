import importlib.util
import unittest
from pathlib import Path
import numpy as np
import subprocess
spec = importlib.util.spec_from_file_location('segment', Path(__file__).parents[1] / 'tools/segment_subject.py')
segment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(segment)

class SegmentationTests(unittest.TestCase):
    @unittest.skipUnless((Path(__file__).parents[1]/'cache/models/selfie_segmenter.tflite').is_file(), 'Optional model not downloaded')
    def test_alpha_video_encoder_and_decoder(self):
        folder = Path(__file__).parents[1]/'output/segmentation-regression'
        folder.mkdir(parents=True, exist_ok=True)
        source, target = folder/'blank.mp4', folder/'foreground.webm'
        subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','color=black:s=256x256:r=30:d=0.1','-c:v','libx264',str(source)],check=True)
        import sys
        subprocess.run([sys.executable,str(Path(__file__).parents[1]/'tools/segment_subject.py'),str(source),str(target),'--allow-empty'],check=True,capture_output=True)
        alpha = subprocess.run(['ffmpeg','-v','error','-c:v','libvpx-vp9','-i',str(target),'-vf','alphaextract','-frames:v','1','-f','rawvideo','-pix_fmt','gray','-'],check=True,capture_output=True).stdout
        self.assertEqual(len(alpha),256*256)
        self.assertLess(max(alpha),64)

    def test_mask_preserves_alpha_and_finds_subject_bounds(self):
        score = np.zeros((20,20),dtype=np.float32)
        score[5:15,8:12] = 1
        mask = segment.foreground_mask([score],20,20)
        self.assertEqual(segment.mask_bounds(mask), {'x':8,'y':5,'width':4,'height':10})
        self.assertEqual(float(mask[0,0]),0)
        self.assertEqual(float(mask[8,9]),1)

    def test_smoothing_does_not_turn_empty_background_into_person(self):
        mask = segment.foreground_mask([np.zeros((10,10))],10,10,previous=np.ones((10,10)),smoothing=.25)
        self.assertIsNone(segment.mask_bounds(mask))

    @unittest.skipUnless((Path(__file__).parents[1]/'cache/models/selfie_segmenter.tflite').is_file(), 'Optional model not downloaded')
    def test_real_model_runs_on_a_black_nonperson_frame(self):
        import mediapipe as mp
        with segment.create_segmenter(Path(__file__).parents[1]/'cache/models/selfie_segmenter.tflite') as model:
            result = model.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=np.zeros((256,256,3),dtype=np.uint8)),0)
            mask = segment.foreground_mask([m.numpy_view() for m in result.confidence_masks],256,256)
        self.assertLess(float((mask>=.6).mean()),.01)

if __name__ == '__main__':
    unittest.main()
