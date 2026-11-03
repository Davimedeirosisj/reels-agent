"""Private contact sheet of the actual saved face detections; no re-inference."""
import argparse
import json
import math
from pathlib import Path

import cv2
from PIL import Image, ImageDraw
from track_faces import digest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('faces', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--times', default='0,11.5,40,75,120,143')
    args = parser.parse_args()
    report = json.loads(args.faces.read_text(encoding='utf-8-sig'))
    if digest(args.input) != report['sourceSha256']:
        raise ValueError('Face detections belong to another video')
    times = sorted(set(float(t) for t in args.times.split(',')))
    if not times or any(not math.isfinite(t) or t < 0 or t >= report['frames']/report['fps'] for t in times):
        raise ValueError('Times must be inside the detected video')
    targets = [args.output/'face-contact.jpg', args.output/'inspection.json']
    for target in targets:
        if any(target.resolve() == source.resolve() or (target.exists() and target.samefile(source)) for source in [args.input, args.faces]):
            raise ValueError('Contacts must not overwrite input video or detections')
    args.output.mkdir(parents=True, exist_ok=True)
    columns = min(3, len(times))
    sheet = Image.new('RGB', (columns*270, math.ceil(len(times)/columns)*500), (12, 24, 32))
    capture = cv2.VideoCapture(str(args.input))
    inspected = []
    try:
        for index, at in enumerate(times):
            sample = min(report['tracks'], key=lambda item: abs(item['time']-at))
            capture.set(cv2.CAP_PROP_POS_FRAMES, sample['frame'])
            ok, bgr = capture.read()
            if not ok or bgr.shape[:2] != (report['height'], report['width']):
                raise ValueError('Could not recover the actual detected frame')
            frame = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(frame)
            for box in sample['boxes']:
                draw.rectangle((box['x'], box['y'], box['x']+box['width'], box['y']+box['height']), outline='#77ffaa', width=5)
            x, y = (index % columns)*270, (index//columns)*500
            sheet.paste(frame.resize((270, 480)), (x, y+20))
            ImageDraw.Draw(sheet).text((x+5, y+3), f"{sample['time']:.2f}s | faces: {len(sample['boxes'])}", fill='white')
            inspected.append({'frame': sample['frame'], 'time': sample['time'], 'detections': len(sample['boxes'])})
    finally:
        capture.release()
    sheet.save(targets[0], quality=92)
    targets[1].write_text(json.dumps({'sourceSha256': report['sourceSha256'], 'faceReportSha256': digest(args.faces),
        'selectedFrames': inspected, 'scope': 'Selected saved detections only; images remain private', 'manualFullReviewRequired': True}, indent=2), encoding='utf-8')
    print(json.dumps({'inspectedSavedDetections': len(inspected)}))


if __name__ == '__main__':
    main()
