"""Verify public prompt pages. Store attribution, links and hashes, never full prompts."""
import argparse
import concurrent.futures
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

BASE = 'https://prompt-motion.com/'

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self.meta, self.prompt = [], {}, []
        self.capture_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'meta':
            self.meta[attrs.get('property') or attrs.get('name')] = attrs.get('content', '')
        if attrs.get('id') == 'entry-prompt':
            self.capture_depth = 1
        elif self.capture_depth and tag not in ['br','img','input','hr','meta','link','source','wbr']:
            self.capture_depth += 1

    def handle_endtag(self, tag):
        if tag in ['br','img','input','hr','meta','link','source','wbr']:
            return
        if self.capture_depth:
            self.capture_depth -= 1

    def handle_data(self, data):
        if self.capture_depth:
            self.prompt.append(data)

def parse_prompt(html, url):
    page = Page()
    page.feed(html)
    prompt = ' '.join(' '.join(page.prompt).split())
    posts = list(dict.fromkeys(h for h in page.links if re.match(r'https://(?:www\.)?(?:x|twitter)\.com/[^/]+/status/\d+', h)))
    if len(prompt) < 30 or not posts or not page.meta.get('og:title'):
        return None
    author = '@' + urlparse(posts[0]).path.split('/')[1]
    normalized = unicodedata.normalize('NFKC', prompt).casefold()
    techniques = []
    for key, pattern in [('kinetic',r'typograph|kinetic|lettering'),('flowchart',r'diagram|flowchart'),('interface',r'\bui\b|interface|saas'),('chart',r'\bcharts?\b|\bgraphs?\b|data visual'),('particles',r'particle'),('3d',r'\b3d\b|three\.js|blender')]:
        if re.search(pattern, normalized):
            techniques.append(key)
    return {'title':' '.join(page.meta['og:title'].split()[:12]),'author':author,
            'sourceUrl':url,'creatorPostUrl':posts[0],
            'promptSha256':hashlib.sha256(normalized.encode()).hexdigest(),
            'originalPromptAvailable':True,'fullPromptStored':False,
            'runtimeTechniqueCandidates':techniques or ['custom-direction'],
            'implementationStatus':'reference-only','reproduced':False}

def fetch(url):
    request = Request(url, headers={'User-Agent':'Reels-Agent-Source-Verification/0.1'})
    with urlopen(request, timeout=20) as response:
        if urlparse(response.url).netloc not in ['prompt-motion.com','www.prompt-motion.com']:
            raise ValueError('Unexpected cross-domain redirect')
        return response.read(4*1024*1024).decode('utf-8')

def verify(url):
    try:
        entry = parse_prompt(fetch(url),url)
        return {'url':url,'entry':entry,'status':'verified' if entry else 'no-verifiable-prompt'}
    except Exception as error:
        return {'url':url,'entry':None,'status':'fetch-failed','errorType':type(error).__name__}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target',type=int,default=100)
    parser.add_argument('--output',type=Path,default=Path(__file__).parents[1]/'prompts/external-verified.json')
    args = parser.parse_args()
    homepage = Page()
    homepage.feed(fetch(BASE))
    urls = sorted({urljoin(BASE,h) for h in homepage.links if re.match(r'^/[a-z0-9_-]+-[a-f0-9]{6}$',h)})
    records, failures, hashes = [], [], set()
    checked = 0
    # Bounded batches avoid scheduling the entire gallery once the target is met.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        for offset in range(0,len(urls),16):
            for result in executor.map(verify,urls[offset:offset+16]):
                checked += 1
                if result['entry']:
                    entry = result['entry']
                    entry['exactDuplicateOf'] = next((r['sourceUrl'] for r in records if r['promptSha256']==entry['promptSha256']),None)
                    records.append(entry)
                    hashes.add(entry['promptSha256'])
                else:
                    failures.append({k:v for k,v in result.items() if k!='entry'})
            print(json.dumps({'checked':checked,'publications':len(records),'distinctTextHashes':len(hashes)}),flush=True)
            if len(hashes)>=args.target:
                break
    for i,entry in enumerate(records):
        entry['id']=f'PMV-{i+1:03d}'
    output={'source':BASE,'verifiedAtUtc':datetime.now(timezone.utc).isoformat(),
            'publicationsVerified':len(records),'distinctTextHashes':len(hashes),'targetDistinctTexts':args.target,
            'deduplicationScope':'Exact normalized text only; semantic prompt families require review',
            'rights':'Metadata, attribution and fingerprints only. Original text stays on source pages.',
            'runtimeNote':'Verification of text availability is not reproduction or a render test.',
            'entries':records,'unverified':failures}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
    if len(hashes)<args.target:
        raise SystemExit('Verified distinct text count remains below target; recorded as incomplete')

if __name__=='__main__':
    main()
