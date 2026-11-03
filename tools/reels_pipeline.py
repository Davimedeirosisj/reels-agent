"""Minimal Reels Agent engine: probe, optional transcription and FFmpeg render."""
from __future__ import annotations
import argparse, json, subprocess
from pathlib import Path

def run(cmd: list[str]): return subprocess.run(cmd, check=True, text=True, capture_output=True)
def probe(path: Path) -> dict: return json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(path)]).stdout)
def at(v: float) -> str:
    h,r=divmod(v,3600); m,s=divmod(r,60); return f"{int(h)}:{int(m):02d}:{s:05.2f}"
def esc(t: str) -> str: return t.replace("\\","\\\\").replace("{","\\{").replace("}","\\}").replace("\n"," ")
def make_ass(data: dict, path: Path, title: str|None):
    lines=["[Script Info]","ScriptType: v4.00+","PlayResX: 1080","PlayResY: 1920","[V4+ Styles]","Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Alignment, MarginL, MarginR, MarginV, Encoding","Style: Default,Arial,54,&H00FFFFFF,&H00FFFFFF,&H80000000,&H40000000,1,0,2,80,80,260,1","[Events]","Format: Layer, Start, End, Style, Text"]
    if title: lines.append(f"Dialogue: 0,0:00:00.00,0:00:03.50,Default,{{\\an8\\fs70}}{esc(title.upper())}")
    lines += [f"Dialogue: 0,{at(s['start'])},{at(s['end'])},Default,{esc(s['text'])}" for s in data.get('segments',[])]
    path.write_text("\n".join(lines)+"\n",encoding="utf-8")
def transcribe(path: Path, out: Path, model: str):
    try:
        from faster_whisper import WhisperModel
        segs,info=WhisperModel(model,device="cpu",compute_type="int8").transcribe(str(path),vad_filter=True)
        data={"language":info.language,"segments":[{"start":s.start,"end":s.end,"text":s.text.strip()} for s in segs]}
    except ImportError:
        import whisper; r=whisper.load_model(model).transcribe(str(path)); data={"language":r.get("language"),"segments":[{"start":s["start"],"end":s["end"],"text":s["text"].strip()} for s in r["segments"]]}
    out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8"); return data
def main():
    p=argparse.ArgumentParser(); p.add_argument('input',type=Path); p.add_argument('--output',type=Path,required=True); p.add_argument('--transcript',type=Path); p.add_argument('--title'); p.add_argument('--model',default='tiny'); p.add_argument('--start',type=float,default=0); p.add_argument('--duration',type=float); a=p.parse_args(); a.output.parent.mkdir(parents=True,exist_ok=True)
    (a.output.parent/'media_probe.json').write_text(json.dumps(probe(a.input),indent=2),encoding='utf-8'); vf='scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p'
    if a.transcript:
        d=json.loads(a.transcript.read_text(encoding='utf-8-sig')) if a.transcript.exists() else transcribe(a.input,a.transcript,a.model); ass=a.output.with_suffix('.ass'); make_ass(d,ass,a.title); ass_file=ass.as_posix().replace(':','\\:'); vf+=",ass=filename='"+ass_file+"'"
    cmd=['ffmpeg','-y','-ss',str(a.start),'-i',str(a.input)]+(['-t',str(a.duration)] if a.duration else [])+['-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-b:a','160k','-movflags','+faststart',str(a.output)]; run(cmd)
if __name__=='__main__': main()
