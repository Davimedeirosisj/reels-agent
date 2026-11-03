"""Inspect the actual encoded alpha, never substitute newly inferred masks.

Contacts contain private footage and must stay local. Measurements are diagnostic;
they do not certify human/hand/object edges or approve the sermon.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def digest(file):
    value = hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def metadata(file):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format',
                             '-of', 'json', str(file)], check=True, capture_output=True)
    info = json.loads(result.stdout)
    stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
    return stream, float(info['format']['duration'])


def frame(file, at, width, height, alpha=False):
    command = ['ffmpeg', '-v', 'error', '-ss', str(at)]
    if alpha:
        command += ['-c:v', 'libvpx-vp9']
    command += ['-i', str(file), '-frames:v', '1', '-f', 'rawvideo',
                '-pix_fmt', 'rgba' if alpha else 'rgb24', '-']
    result = subprocess.run(command, check=True, capture_output=True)
    channels = 4 if alpha else 3
    if len(result.stdout) != width * height * channels:
        raise ValueError(f'Frame unavailable or unexpected dimensions at {at}s')
    return np.frombuffer(result.stdout, dtype=np.uint8).reshape(height, width, channels)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('job', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--base', type=Path)
    parser.add_argument('--times', default='0,2,11.5,40,60,75,90,120,134,143')
    args = parser.parse_args()
    job = json.loads(args.job.read_text(encoding='utf-8-sig'))
    preparation = job.get('foregroundPreparation')
    if not preparation:
        raise ValueError('An automatically prepared foreground job is required')
    layer = Path(job['foregroundSrc'])
    if not layer.is_absolute():
        layer = Path(__file__).parents[1] / 'public' / layer
    base = args.base or args.job.parent / 'edited-source.mp4'
    if digest(layer) != preparation['foregroundSha256']:
        raise ValueError('Foreground bytes changed after preparation')
    stream, duration = metadata(base)
    masked, mask_duration = metadata(layer)
    width, height = stream['width'], stream['height']
    if (masked['width'], masked['height']) != (width, height) or abs(duration-mask_duration) > .1:
        raise ValueError('Base and alpha are not aligned in size/duration')
    times = sorted(set(float(t) for t in args.times.split(',')))
    if not times or any(not np.isfinite(t) or t < 0 or t >= duration for t in times):
        raise ValueError('Choose finite timestamps within the prepared video')
    args.output.mkdir(parents=True, exist_ok=True)
    measures = []
    sheet = None
    sheets = []
    checker = (np.indices((height, width)).sum(axis=0)//48 % 2)*35+40
    background = np.repeat(checker[..., None], 3, axis=2)
    for index, at in enumerate(times):
        if index % 5 == 0:
            sheet = Image.new('RGB', (810, 500*min(5, len(times)-index)), (12, 24, 32))
        original = frame(base, at, width, height)
        rgba = frame(layer, at, width, height, alpha=True)
        alpha = rgba[..., 3].astype(np.float32)/255
        core = alpha >= 250/255
        error = np.abs(rgba[..., :3].astype(np.float32)-original).mean(axis=2)
        measures.append({'time': at, 'minimumAlpha': int(rgba[..., 3].min()),
                         'maximumAlpha': int(rgba[..., 3].max()),
                         'opaqueCorePixels': int(core.sum()),
                         'opaqueCoreMeanRgbError': float(error[core].mean()) if core.any() else None,
                         'transparentFraction': float((alpha <= 5/255).mean())})
        composite = (rgba[..., :3]*alpha[..., None]+background*(1-alpha[..., None])).clip(0, 255).astype(np.uint8)
        mask = np.repeat(rgba[..., 3:4], 3, axis=2)
        row = index % 5
        for col, pixels in enumerate([original, mask, composite]):
            sheet.paste(Image.fromarray(pixels).resize((270, 480)), (col*270, row*500+20))
        ImageDraw.Draw(sheet).text((8, row*500+3), f'{at:.2f}s | edited base / encoded alpha / checker composite', fill='white')
        if row == 4 or index == len(times)-1:
            file = args.output/f'encoded-mask-contact-{len(sheets)+1}.jpg'
            sheet.save(file, quality=92)
            sheets.append(file.name)
        print(json.dumps({'stage': 'encoded-alpha-inspection', 'samples': index+1}), flush=True)
    report = {'encodedAlphaDecoded': True, 'sampleCount': len(measures),
              'baseSha256': digest(base), 'foregroundSha256': digest(layer),
              'samples': measures, 'contactFiles': sheets,
              'scope': 'Selected decoded frames of the actual prepared alpha; no re-inference, no approval',
              'manualFullEdgeReviewRequired': True}
    (args.output/'inspection.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
