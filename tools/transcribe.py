"""Local ASR. Word timestamps are produced by the model, never interpolated."""
import argparse
import json
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument('input', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--backend', choices=['whisper', 'faster-whisper'], default='whisper')
    p.add_argument('--model', default='small')
    p.add_argument('--language', default='pt')
    a = p.parse_args()
    if a.backend == 'whisper':
        import whisper
        result = whisper.load_model(a.model).transcribe(str(a.input), language=a.language, word_timestamps=True, fp16=False)
        data = {'language': result['language'], 'segments': [
            {'start': s['start'], 'end': s['end'], 'text': s['text'].strip(),
             'words': [{'start': w['start'], 'end': w['end'], 'word': w['word'].strip()} for w in s.get('words', [])]}
            for s in result['segments']]}
    else:
        from faster_whisper import WhisperModel
        segments, info = WhisperModel(a.model, device='cpu', compute_type='int8').transcribe(str(a.input), language=a.language, word_timestamps=True, vad_filter=False)
        data = {'language': info.language, 'segments': [
            {'start': s.start, 'end': s.end, 'text': s.text.strip(),
             'words': [{'start': w.start, 'end': w.end, 'word': w.word.strip()} for w in s.words or []]} for s in segments]}
    data['provenance'] = {'backend': a.backend, 'model': a.model, 'human_reviewed': False}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
