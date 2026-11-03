"""Prepare a transparent person layer from already edited, framed CFR video.

Requires the official MediaPipe SelfieSegmenter model. The tool does not identify
people and does not claim to isolate one preacher in a multi-person wide shot.
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
from fractions import Fraction
from pathlib import Path
import cv2
import numpy as np

MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'
MODEL_CARD = 'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf'

def foreground_mask(confidence_masks, width, height, previous=None, smoothing=0.25):
    if len(confidence_masks) == 1:
        score = confidence_masks[0]
    elif len(confidence_masks) == 2:
        score = confidence_masks[1]
    else:
        raise ValueError('Use the two-category SelfieSegmenter model; unexpected output channels')
    score = cv2.resize(np.asarray(score, dtype=np.float32).squeeze(), (width, height), interpolation=cv2.INTER_LINEAR)
    score = np.clip(score, 0, 1)
    if previous is not None:
        score = score * (1-smoothing) + previous * smoothing
    return score

def mask_bounds(mask, threshold=0.6):
    y, x = np.where(mask >= threshold)
    if not len(x):
        return None
    return {'x': int(x.min()), 'y': int(y.min()), 'width': int(x.max()-x.min()+1), 'height': int(y.max()-y.min()+1)}

def create_segmenter(model):
    import mediapipe as mp
    options = mp.tasks.vision.ImageSegmenterOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        output_confidence_masks=True,
        output_category_mask=False)
    return mp.tasks.vision.ImageSegmenter.create_from_options(options)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--model', type=Path, default=Path(__file__).parents[1] / 'cache/models/selfie_segmenter.tflite')
    parser.add_argument('--duration', type=float)
    parser.add_argument('--allow-empty', action='store_true', help='Technical fixtures only; empty masks are not usable person cutouts')
    args = parser.parse_args()
    if not args.model.is_file():
        raise SystemExit(f'Model missing. Download {MODEL_URL} into {args.model}')
    meta = json.loads(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_streams','-of','json',str(args.input)],check=True,capture_output=True,text=True).stdout)['streams'][0]
    fps = float(Fraction(meta['avg_frame_rate']))
    if abs(fps-float(Fraction(meta['r_frame_rate']))) > 0.01:
        raise SystemExit('Prepare CFR video with the final crop/camera/edit timeline before segmentation')
    width, height = meta['width'], meta['height']
    capture = cv2.VideoCapture(str(args.input))
    if not capture.isOpened():
        raise SystemExit('Unable to decode input')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    frames, empty, coverage, previous, previous_rgb, regions = 0, 0, [], None, None, []
    import mediapipe as mp
    with tempfile.TemporaryFile(dir=args.output.parent) as log, create_segmenter(args.model) as segmenter:
        encoder = subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{width}x{height}','-r',str(fps),'-i','-','-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-lossless','1',str(args.output)],stdin=subprocess.PIPE,stderr=log)
        try:
            while args.duration is None or frames/fps < args.duration:
                ok, bgr = capture.read()
                if not ok:
                    break
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                if rgb.shape[:2] != (height,width):
                    raise ValueError('Input orientation changed; prepare upright CFR video first')
                # Reset smoothing on a scene cut so the old silhouette does not ghost into a new shot.
                small = cv2.resize(rgb,(32,32)).astype(np.float32)
                if previous_rgb is not None and np.abs(small-previous_rgb).mean()>35:
                    previous = None
                result = segmenter.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=rgb),round(frames*1000/fps))
                mask = foreground_mask([m.numpy_view() for m in result.confidence_masks],width,height,previous)
                bounds = mask_bounds(mask)
                empty += bounds is None
                coverage.append(float((mask>=.6).mean()))
                if bounds is not None and frames % max(1,round(fps/2)) == 0:
                    regions.append({**bounds,'start':frames/fps,'end':min((frames+round(fps/2))/fps,float(meta.get('duration',1e12))),'label':'person-mask-bounds'})
                alpha = (mask*255).astype(np.uint8)
                encoder.stdin.write(np.dstack([rgb,alpha]).tobytes())
                previous, previous_rgb = mask, small
                frames += 1
            encoder.stdin.close()
            code = encoder.wait()
            if code:
                log.seek(0)
                raise RuntimeError(log.read().decode('utf-8',errors='replace'))
        finally:
            capture.release()
            if encoder.stdin and not encoder.stdin.closed:
                encoder.stdin.close()
            if encoder.poll() is None:
                encoder.terminate()
                encoder.wait()
    report = {'frames':frames,'fps':fps,'width':width,'height':height,'emptyFrames':empty,
              'meanForegroundFraction':float(np.mean(coverage)) if coverage else 0,
              'modelUrl':MODEL_URL,'modelCard':MODEL_CARD,'modelLicense':'Apache-2.0 per official model card',
              'modelSha256':hashlib.sha256(args.model.read_bytes()).hexdigest(),
              'protectedAreas':regions,'manualReviewRequired':True,
              'limitations':['Close-up prominent people model; not guaranteed for a distant pastor or multiple people','Thin fingers, microphones, hands and Bible edges require review','Input must already match final camera and cut timeline; foreground has no audio']}
    args.output.with_suffix('.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if not frames or empty==frames:
        if not args.allow_empty:
            raise SystemExit('No usable person mask found; do not use this layer to place text behind a preacher')
    print(json.dumps({'frames':frames,'emptyFrames':empty,'reviewRequired':True}))

if __name__ == '__main__':
    main()
