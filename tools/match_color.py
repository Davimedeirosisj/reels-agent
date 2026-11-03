"""Propose SDR per-camera gains using explicitly identified matching patches.

No whole-frame histogram matching, LUT download or source modification. Choose
the same physical neutral material in each camera and review the proposed render.
"""
import argparse
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path
import cv2
import numpy as np


def linearize(rgb):
    rgb = np.asarray(rgb, dtype=np.float64) / 255
    return np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)


def patch_color(rgb):
    pixels = np.asarray(rgb).reshape(-1, 3)
    pixels = pixels[(pixels.min(axis=1) > 4) & (pixels.max(axis=1) < 250)]
    if len(pixels) < 64:
        raise ValueError('Patch has too few usable pixels; avoid clipped whites, black or tiny regions')
    return np.median(linearize(pixels), axis=0)


def checked_rect(rect):
    if not isinstance(rect, list) or len(rect) != 4 or any(not isinstance(x, (int,float)) or not math.isfinite(x) for x in rect):
        raise ValueError('Sample rect must be normalized [x,y,width,height]')
    x,y,w,h = rect
    if min(x,y) < 0 or min(w,h) <= 0 or x+w > 1 or y+h > 1:
        raise ValueError('Sample rect is outside the source frame')
    return rect


def measured_gain(reference, sample, low, high):
    if np.any(np.asarray(sample) < .005):
        raise ValueError('Patch is too dark for stable neutral matching')
    raw = np.asarray(reference) / np.asarray(sample)
    return np.clip(raw, low, high), raw


def inspect_patch(clip, sample, public_dir):
    rect = checked_rect(sample.get('rect'))
    if not sample.get('label'):
        raise ValueError('Identify the same physical neutral material with sample.label')
    source = Path(clip['source'])
    if not source.is_absolute(): source = public_dir / source
    metadata = subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_streams','-of','json',str(source)],capture_output=True,text=True,check=True)
    stream = json.loads(metadata.stdout)['streams'][0]
    if stream.get('color_transfer') in ['smpte2084','arib-std-b67'] or stream.get('color_primaries') == 'bt2020':
        raise ValueError('HDR/wide-gamut input needs an explicit color-managed conversion before this SDR matcher')
    start,end = clip['start'],clip['end']
    times = sample.get('times', [start+(end-start)*f for f in [.2,.5,.8]])
    if not times or any(not isinstance(t,(int,float)) or not math.isfinite(t) or t<start or t>=end for t in times):
        raise ValueError('Sample times must lie inside the source clip')
    cap = cv2.VideoCapture(str(source))
    values,actual_times = [],[]
    try:
        if not cap.isOpened(): raise ValueError('Cannot open sample source')
        for time in times:
            cap.set(cv2.CAP_PROP_POS_MSEC,time*1000)
            ok,frame = cap.read()
            if not ok: raise ValueError('Cannot read requested sample time')
            h,w = frame.shape[:2]
            x,y,rw,rh = rect
            crop = frame[round(y*h):round((y+rh)*h),round(x*w):round((x+rw)*w),::-1]
            values.append(patch_color(crop))
            actual_times.append(cap.get(cv2.CAP_PROP_POS_MSEC)/1000)
    finally: cap.release()
    colors = np.asarray(values)
    median = np.median(colors,axis=0)
    variation = np.max(np.abs(colors-median)/np.maximum(median,.005))
    if variation > .12:
        raise ValueError('Patch changed across samples; choose stable material/intervals rather than forcing a grade')
    with source.open('rb') as source_file:
        source_hash = hashlib.file_digest(source_file,'sha256').hexdigest()
    return {'linearRgbMedian':median.tolist(),'relativeTemporalVariation':float(variation),
            'requestedTimes':times,'decodedTimes':actual_times,'rect':rect,'label':sample['label'],
            'sourceSha256':source_hash}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('job', help='JSON job file, or - for stdin')
    p.add_argument('output',type=Path)
    p.add_argument('--public-dir',type=Path,default=Path(__file__).parents[1]/'public')
    args = p.parse_args()
    job = json.loads(sys.stdin.read() if args.job == '-' else Path(args.job).read_text(encoding='utf-8-sig'))
    config = job.get('colorMatch') or {}
    samples = config.get('samples') or {}
    reference = config.get('referenceClip',0)
    clips = job['clips']
    targets = config.get('targets',[i for i in range(len(clips)) if i != reference])
    if not isinstance(reference,int) or reference<0 or reference>=len(clips) or not targets:
        raise ValueError('Select a reference clip and at least one target')
    if any(not isinstance(i,int) or i<0 or i>=len(clips) or i==reference for i in targets):
        raise ValueError('Invalid color-match target')
    low,high,strength = config.get('minimumGain',.67),config.get('maximumGain',1.5),config.get('intensity',1)
    if not 0<low<=1<=high<=8 or not 0<=strength<=1:
        raise ValueError('Invalid gain bounds or intensity')
    ids = list(dict.fromkeys([reference,*targets]))
    if any(str(i) not in samples for i in ids):
        raise ValueError('Provide an explicit labeled sample rectangle for each selected clip')
    labels = {samples[str(i)].get('label') for i in ids}
    if len(labels) != 1:
        raise ValueError('Samples must identify the same physical material with the same label')
    measured = {i:inspect_patch(clips[i],samples[str(i)],args.public_dir) for i in ids}
    ref = measured[reference]['linearRgbMedian']
    proposals = []
    for i in targets:
        if clips[i].get('color'):
            raise ValueError('Target already has a grade; explicitly remove it before proposing a replacement')
        gain,raw = measured_gain(ref,measured[i]['linearRgbMedian'],low,high)
        provenance = {'method':'explicit-neutral-patch-linear-rgb',
                      'referenceClip':reference,'reference':measured[reference],
                      'target':measured[i],'rawGain':raw.tolist(),
                      'limitedChannels':np.where(np.abs(raw-gain)>1e-6)[0].tolist(),
                      'reviewRequired':True}
        clips[i]['color'] = {'gain':gain.tolist(),'space':'linearRGB','intensity':strength,'provenance':provenance}
        proposals.append({'clip':i,'gain':gain.tolist(),'limitedChannels':provenance['limitedChannels']})
    job.pop('approval',None)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(job,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'proposals':proposals,'reviewRequired':True,'sourceModified':False}))


if __name__ == '__main__': main()
