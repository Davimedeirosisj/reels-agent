"""Inspect person-mask quality on selected source frames, without publishing source media."""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from segment_subject import create_segmenter, foreground_mask, mask_bounds

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('input',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--model',type=Path,default=Path(__file__).parents[1]/'cache/models/selfie_segmenter.tflite')
    parser.add_argument('--times',default='0,12,60,120')
    args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    times=sorted(set(float(t) for t in args.times.split(',')))
    capture=cv2.VideoCapture(str(args.input))
    if not capture.isOpened():raise SystemExit('Could not open input video')
    sheet=Image.new('RGB',(810,500*len(times)),(12,24,32))
    records=[]
    import mediapipe as mp
    try:
        with create_segmenter(args.model) as segmenter:
            for i,time in enumerate(times):
                capture.set(cv2.CAP_PROP_POS_MSEC,time*1000)
                ok,bgr=capture.read()
                if not ok:raise ValueError(f'Unable to read requested frame: {time}')
                rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)
                result=segmenter.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=rgb),round(time*1000))
                mask=foreground_mask([m.numpy_view() for m in result.confidence_masks],rgb.shape[1],rgb.shape[0])
                rgba=Image.fromarray(np.dstack([rgb,(mask*255).astype(np.uint8)]))
                rgba.save(args.output/f'foreground-{i}.png')
                checker=np.indices(mask.shape).sum(axis=0)//48%2
                background=np.stack([40+checker*35]*3,axis=-1)
                composite=(rgb*mask[...,None]+background*(1-mask[...,None])).clip(0,255).astype(np.uint8)
                for col,array in enumerate([rgb,np.stack([(mask*255).astype(np.uint8)]*3,axis=-1),composite]):
                    sheet.paste(Image.fromarray(array).resize((270,480)),(col*270,i*500+20))
                ImageDraw.Draw(sheet).text((8,i*500+3),f'{time:.2f}s | original / alpha / composite',fill='white')
                records.append({'sourceTime':time,'foregroundFraction':float((mask>=.6).mean()),'bounds':mask_bounds(mask)})
    finally:capture.release()
    sheet.save(args.output/'mask-contact.jpg')
    (args.output/'inspection.json').write_text(json.dumps({'samples':records,'scope':'Selected actual source frames only; not a full-video or identity test','manualEdgeReviewRequired':True},indent=2),encoding='utf-8')
    print(json.dumps({'samples':len(records),'withForeground':sum(r['bounds'] is not None for r in records)}))

if __name__=='__main__':main()
