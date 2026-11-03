import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]/'tools'))
from track_faces import expand_box, face_regions


class FaceRegionTests(unittest.TestCase):
    def test_motion_union_covers_both_observed_endpoints(self):
        tracks = [{'frame': 0, 'boxes': [{'x': 10, 'y': 20, 'width': 30, 'height': 40}]},
                  {'frame': 8, 'boxes': [{'x': 70, 'y': 25, 'width': 20, 'height': 50}]}]
        areas, unknown = face_regions(tracks, 9, 30)
        self.assertEqual((areas[0]['x'], areas[0]['width'], areas[0]['height']), (10, 80, 55))
        self.assertEqual(areas[0]['end'], 8/30)
        self.assertEqual(unknown, [])
        self.assertTrue(areas[0]['temporalBoundsAreEstimates'])

    def test_missing_detection_is_unknown_and_does_not_remove_neighbor_protection(self):
        box = {'x': 10, 'y': 20, 'width': 30, 'height': 40}
        areas, unknown = face_regions([{'frame': 0, 'boxes': [box]}, {'frame': 8, 'boxes': []}], 16, 30)
        self.assertTrue(areas[0]['uncertain'])
        self.assertEqual(len(unknown), 2)
        self.assertEqual(unknown[-1], {'from': 8, 'to': 16})
        empty, missing = face_regions([{'frame': 0, 'boxes': []}], 8, 30)
        self.assertEqual(empty, [])
        self.assertEqual(missing, [{'from': 0, 'to': 8}])

    def test_padding_is_clamped_to_actual_frame(self):
        box = expand_box({'x': -2, 'y': 5, 'width': 25, 'height': 10}, 30, 20, .2)
        self.assertEqual(box, {'x': 0, 'y': 3, 'width': 28, 'height': 14})
        self.assertIsNone(expand_box({'x': 100, 'y': 100, 'width': 1, 'height': 1}, 30, 20, .1))
