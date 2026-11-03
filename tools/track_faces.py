"""Locate faces on already edited CFR frames. No identity recognition.

Sampled bounds are review aids, not continuous protection or editorial approval.
"""
import argparse
import hashlib
import json
import math
import subprocess
import time
from fractions import Fraction
from pathlib import Path

import cv2

MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'
MODEL_CARD = 'https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf'
OFFICIAL_SHA256 = 'b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f'


def digest(file):
    value = hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            value.update(block)
    return value.hexdigest()


def expand_box(box, width, height, margin):
    dx, dy = box['width']*margin, box['height']*margin
    x, y = max(0, math.floor(box['x']-dx)), max(0, math.floor(box['y']-dy))
    right = min(width, math.ceil(box['x']+box['width']+dx))
    bottom = min(height, math.ceil(box['y']+box['height']+dy))
    if right <= x or bottom <= y:
        return None
    return {'x': x, 'y': y, 'width': right-x, 'height': bottom-y}


def face_regions(samples, frames, fps):
    areas, unknown = [], []
    for index, sample in enumerate(samples):
        following = samples[index+1] if index+1 < len(samples) else None
        end = following['frame'] if following else frames
        if end <= sample['frame']:
            continue
        boxes = sample['boxes'] + (following['boxes'] if following else [])
        uncertain = not sample['boxes'] or (following is not None and not following['boxes'])
        if uncertain:
            unknown.append({'from': sample['frame'], 'to': end})
        if not boxes:
            continue
        x, y = min(b['x'] for b in boxes), min(b['y'] for b in boxes)
        right = max(b['x']+b['width'] for b in boxes)
        bottom = max(b['y']+b['height'] for b in boxes)
        areas.append({'x': x, 'y': y, 'width': right-x, 'height': bottom-y,
                      'start': sample['frame']/fps, 'end': end/fps,
                      'label': 'detected-face-region-union', 'uncertain': uncertain,
                      'temporalBoundsAreEstimates': True})
    return areas, unknown


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--model', type=Path, default=Path(__file__).parents[1]/'cache/models/blaze_face_short_range.tflite')
    parser.add_argument('--sample-every', type=float, default=.25)
    parser.add_argument('--margin', type=float, default=.1)
    parser.add_argument('--min-confidence', type=float, default=.5)
    parser.add_argument('--allow-empty', action='store_true', help='Technical empty fixtures only')
    args = parser.parse_args()
    if not math.isfinite(args.sample_every) or args.sample_every <= 0 or not 0 <= args.margin <= 1 or not 0 < args.min_confidence <= 1:
        raise ValueError('Invalid sampling, margin or confidence')
    if any(args.output.resolve() == source.resolve() or
           (args.output.exists() and args.output.samefile(source)) for source in [args.input, args.model]):
        raise ValueError('Output must not overwrite the source or model')
    source_hash, model_hash = digest(args.input), digest(args.model)
    metadata = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', str(args.input)], check=True, capture_output=True).stdout)['streams'][0]
    fps = float(Fraction(metadata['avg_frame_rate']))
    if not 0 < fps <= 120 or abs(fps-float(Fraction(metadata['r_frame_rate']))) > .01:
        raise ValueError('Prepare upright CFR video with the final cuts/camera before face localization')
    width, height = metadata['width'], metadata['height']
    expected = int(metadata['nb_frames']) if str(metadata.get('nb_frames', '')).isdigit() else None
    step = max(1, round(args.sample_every*fps))
    capture = cv2.VideoCapture(str(args.input))
    if not capture.isOpened():
        raise ValueError('Cannot decode video')
    import mediapipe as mp
    settings = mp.tasks.vision.FaceDetectorOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(args.model)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO, min_detection_confidence=args.min_confidence)
    tracks, frame, last_progress = [], 0, time.monotonic()
    try:
        with mp.tasks.vision.FaceDetector.create_from_options(settings) as detector:
            while capture.grab():
                if frame % step == 0 or (expected is not None and frame == expected-1):
                    ok, bgr = capture.retrieve()
                    if not ok or bgr.shape[:2] != (height, width):
                        raise ValueError('Decoded dimensions/orientation differ from the edited frame')
                    result = detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)), round(frame*1000/fps))
                    boxes = []
                    for detection in result.detections:
                        bounds = detection.bounding_box
                        box = expand_box({'x': bounds.origin_x, 'y': bounds.origin_y, 'width': bounds.width, 'height': bounds.height}, width, height, args.margin)
                        if box:
                            box['confidence'] = float(detection.categories[0].score)
                            box['touchesFrameEdge'] = box['x'] == 0 or box['y'] == 0 or box['x']+box['width'] == width or box['y']+box['height'] == height
                            boxes.append(box)
                    tracks.append({'frame': frame, 'time': frame/fps, 'boxes': boxes})
                frame += 1
                if time.monotonic()-last_progress >= 10:
                    print(json.dumps({'stage': 'face-localization', 'decodedFrames': frame, 'samples': len(tracks)}), flush=True)
                    last_progress = time.monotonic()
    finally:
        capture.release()
    if not frame or (expected is not None and frame != expected):
        raise ValueError('Decoded frame count differs from the edited source')
    if digest(args.input) != source_hash or digest(args.model) != model_hash:
        raise ValueError('Source/model changed during localization')
    areas, unknown = face_regions(tracks, frame, fps)
    official = model_hash == OFFICIAL_SHA256
    report = {'frames': frame, 'width': width, 'height': height, 'fps': fps,
              'sourceSha256': source_hash, 'modelSha256': model_hash,
              'modelUrl': MODEL_URL if official else None, 'modelCard': MODEL_CARD if official else None,
              'modelLicense': 'Apache-2.0 per official model card' if official else 'User-supplied; unverified',
              'sampleStepFrames': step, 'sampleCount': len(tracks),
              'samplesWithFaces': sum(bool(t['boxes']) for t in tracks),
              'samplesTouchingFrameEdge': sum(any(b['touchesFrameEdge'] for b in t['boxes']) for t in tracks),
              'margin': args.margin, 'minConfidence': args.min_confidence, 'tracks': tracks,
              'protectedAreas': areas, 'unknownIntervals': unknown,
              'continuousFaceCoverageProven': False, 'manualReviewRequired': True,
              'scope': 'Sampled face localization on final edited frames; unions include observed endpoints, no identity recognition or guarantee between samples',
              'limitations': ['Small/distant/profile/occluded faces may be missed', 'Bounds do not protect hands, microphone, Bible or every hair edge', 'No-detection intervals are unknown, never proof of an empty safe area']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    if not report['samplesWithFaces'] and not args.allow_empty:
        raise ValueError('No usable face detections; do not claim the video is spatially safe')
    print(json.dumps({'decodedFrames': frame, 'samples': len(tracks), 'withFaces': report['samplesWithFaces'], 'manualReviewRequired': True}))


if __name__ == '__main__':
    main()
