"""Prepare a transparent person layer from already edited, framed CFR video.

Requires the official MediaPipe SelfieSegmenter model. The tool does not identify
people and does not claim to isolate one preacher in a multi-person wide shot.
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
import time
import os
from fractions import Fraction
from pathlib import Path
import cv2
import numpy as np

MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'
MODEL_CARD = 'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf'
OFFICIAL_MODEL_SHA256 = '191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b'

def warp_previous_mask(previous, backward_flow):
    height,width = backward_flow.shape[:2]
    sample = cv2.resize(previous,(width,height),interpolation=cv2.INTER_LINEAR)
    x,y = np.meshgrid(np.arange(width,dtype=np.float32),np.arange(height,dtype=np.float32))
    aligned = cv2.remap(sample,x+backward_flow[...,0],y+backward_flow[...,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
    return cv2.resize(aligned,(previous.shape[1],previous.shape[0]),interpolation=cv2.INTER_LINEAR)

def track_regions(tracks,fps):
    groups = {}
    block = max(1,round(fps/2))
    for item in tracks:
        if not item['bounds']:continue
        key=item['frame']//block
        b=item['bounds'];r=groups.setdefault(key,{'x':b['x'],'y':b['y'],'right':b['x']+b['width'],'bottom':b['y']+b['height']})
        r['x']=min(r['x'],b['x']);r['y']=min(r['y'],b['y']);r['right']=max(r['right'],b['x']+b['width']);r['bottom']=max(r['bottom'],b['y']+b['height'])
    return [{'x':r['x'],'y':r['y'],'width':r['right']-r['x'],'height':r['bottom']-r['y'],
             'start':key*block/fps,'end':min((key+1)*block/fps,len(tracks)/fps),'label':'foreground-region-union'} for key,r in groups.items()]

def missing_ranges(tracks):
    ranges=[];start=None
    for item in tracks:
        if item['bounds'] is None and start is None:start=item['frame']
        if item['bounds'] is not None and start is not None:
            ranges.append({'from':start,'to':item['frame']});start=None
    if start is not None:ranges.append({'from':start,'to':len(tracks)})
    return ranges

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
    parser.add_argument('--smoothing',type=float,default=.25)
    parser.add_argument('--cut-frames',default='')
    parser.add_argument('--no-motion-compensation',action='store_true')
    parser.add_argument('--crf',type=int,default=16)
    parser.add_argument('--lossless',action='store_true')
    parser.add_argument('--threads',type=int,default=max(1,min(8,(os.cpu_count() or 2)//2)))
    args = parser.parse_args()
    if not 0<=args.smoothing<1:raise SystemExit('Smoothing must be between 0 and 1, excluding 1')
    if not 0<=args.crf<=63 or args.threads<1:raise SystemExit('Invalid VP9 CRF or thread count')
    cuts={int(value) for value in args.cut_frames.split(',') if value.strip()}
    if any(value<0 for value in cuts):raise SystemExit('Cut frames cannot be negative')
    if args.output.resolve() in [args.input.resolve(),args.model.resolve()]:raise SystemExit('Output must not overwrite source video or model')
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
    frames, empty, coverage, previous, previous_rgb, previous_gray, tracks = 0, 0, [], None, None, None, []
    last_progress=time.monotonic()
    started=time.monotonic()
    import mediapipe as mp
    with tempfile.TemporaryFile(dir=args.output.parent) as log, create_segmenter(args.model) as segmenter:
        encoder = subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{width}x{height}','-r',str(fps),'-i','-','-an',
            '-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuva420p',
            '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',
            '-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0',
            '-lossless','1' if args.lossless else '0','-crf','0' if args.lossless else str(args.crf),
            '-deadline','good','-cpu-used','2','-row-mt','1','-threads',str(args.threads),str(args.output)],stdin=subprocess.PIPE,stderr=log)
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
                scene_cut = frames in cuts or (previous_rgb is not None and np.abs(small-previous_rgb).mean()>35)
                if scene_cut:
                    previous = None
                flow_width=min(256,width)
                gray=cv2.resize(cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY),(flow_width,max(1,round(height*flow_width/width))))
                aligned=previous
                if previous is not None and previous_gray is not None and not args.no_motion_compensation:
                    backward=cv2.calcOpticalFlowFarneback(gray,previous_gray,None,.5,3,15,3,5,1.2,0)
                    aligned=warp_previous_mask(previous,backward)
                result = segmenter.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=rgb),round(frames*1000/fps))
                mask = foreground_mask([m.numpy_view() for m in result.confidence_masks],width,height,aligned,args.smoothing)
                bounds = mask_bounds(mask)
                empty += bounds is None
                coverage.append(float((mask>=.6).mean()))
                tracks.append({'frame':frames,'time':frames/fps,'bounds':bounds,'foregroundFraction':coverage[-1],'sceneCut':bool(scene_cut)})
                alpha = (mask*255).astype(np.uint8)
                rgba=np.dstack([rgb,alpha])
                rgba[alpha==0,:3]=0
                encoder.stdin.write(rgba.tobytes())
                previous, previous_rgb, previous_gray = mask, small, gray
                frames += 1
                if time.monotonic()-last_progress>=10:
                    print(json.dumps({'stage':'segmentation','frames':frames,'emptyFrames':empty}),flush=True);last_progress=time.monotonic()
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
    model_hash=hashlib.sha256(args.model.read_bytes()).hexdigest()
    official=model_hash==OFFICIAL_MODEL_SHA256
    report = {'frames':frames,'fps':fps,'width':width,'height':height,'emptyFrames':empty,
              'meanForegroundFraction':float(np.mean(coverage)) if coverage else 0,
              'modelUrl':MODEL_URL if official else None,'modelCard':MODEL_CARD if official else None,'modelLicense':'Apache-2.0 per official model card' if official else 'User-supplied; license unverified',
              'modelSha256':model_hash,'motionCompensated':not args.no_motion_compensation,'smoothing':args.smoothing,
              'encoding':{'codec':'vp9','alpha':True,'crf':0 if args.lossless else args.crf,'lossless':args.lossless,'threads':args.threads,'transparentRgbZeroed':True},
              'elapsedSeconds':time.monotonic()-started,'outputBytes':args.output.stat().st_size,
              'tracks':tracks,'missingRanges':missing_ranges(tracks),'protectedAreas':track_regions(tracks,fps),'manualReviewRequired':True,
              'limitations':['Close-up prominent people model; not guaranteed for a distant pastor or multiple people','Thin fingers, microphones, hands and Bible edges require review','Input must already match final camera and cut timeline; foreground has no audio']}
    args.output.with_suffix('.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if not frames or empty==frames:
        if not args.allow_empty:
            raise SystemExit('No usable person mask found; do not use this layer to place text behind a preacher')
    print(json.dumps({'frames':frames,'emptyFrames':empty,'reviewRequired':True}))

if __name__ == '__main__':
    main()
