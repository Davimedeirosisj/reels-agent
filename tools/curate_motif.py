"""Bind the repository's positional Motif index to public individual video pages."""
import json
import re
import hashlib
import concurrent.futures
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin

ROOT=Path(__file__).parents[1]
URL='https://createmotion.io/prompts/'

class Gallery(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.category=''
        self.category_text=[]
        self.card=None
        self.cards=[]

    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        self.stack.append((tag,attrs))
        if tag=='h2':self.category_text=[]
        if tag=='article':self.card={'category':self.category,'author_text':[],'title_text':[]}
        if self.card is not None and tag=='a' and 'card-title' in attrs.get('class','').split():
            self.card['sourceUrl']=urljoin(URL,attrs.get('href',''))

    def handle_endtag(self,tag):
        if tag=='span' and self.card is not None and any('card-author' in attrs.get('class','').split() for _,attrs in self.stack):
            self.card['author_text'].append(' ')
        if tag=='h2':self.category=''.join(self.category_text).strip()
        if tag=='article' and self.card is not None:
            raw=''.join(self.card.pop('author_text'))
            match=re.search(r'(?:u/[A-Za-z0-9_-]+|@[A-Za-z0-9_]+)',raw)
            title=''.join(self.card.pop('title_text'))
            if match and self.card.get('sourceUrl'):
                self.cards.append({**self.card,'author':match[0],'sourceTitleSha256':hashlib.sha256(title.encode()).hexdigest()})
            self.card=None
        # Match tags rather than blindly decrementing on void/self-closing elements.
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:
                del self.stack[i:]
                break

    def handle_data(self,data):
        if any(tag=='h2' for tag,_ in self.stack):self.category_text.append(data)
        if self.card is not None:
            if any('card-author' in a.get('class','').split() for _,a in self.stack):self.card['author_text'].append(data)
            if any('card-title' in a.get('class','').split() for _,a in self.stack):self.card['title_text'].append(data)

class Individual(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[];self.pre_depth=0;self.prompt=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='a' and attrs.get('href'):self.links.append(attrs['href'])
        if tag=='pre':self.pre_depth=1
        elif self.pre_depth and tag not in ['br','img','hr','input']:self.pre_depth+=1
    def handle_endtag(self,tag):
        if self.pre_depth and tag not in ['br','img','hr','input']:self.pre_depth-=1
    def handle_data(self,data):
        if self.pre_depth:self.prompt.append(data)

def verify_individual(entry):
    try:
        with urlopen(Request(entry['sourceUrl'],headers={'User-Agent':'Reels-Agent-Source-Verification/0.1'}),timeout=20) as response:
            page=Individual();page.feed(response.read(4*1024*1024).decode('utf-8'))
        prompt=' '.join(' '.join(page.prompt).split())
        posts=[url for url in page.links if re.match(r'https://(?:www\.)?(?:(?:x|twitter)\.com/[^/]+/status/\d+|reddit\.com/r/[^/]+/comments/[^/]+)',url)]
        return {**entry,'individualPageFetched':True,'individualPromptAvailable':len(prompt)>30,'creatorPostUrl':posts[0] if posts else None,'promptSha256':hashlib.sha256(prompt.casefold().encode()).hexdigest() if prompt else None}
    except Exception as error:return {**entry,'individualFetchError':type(error).__name__}

def main():
    with urlopen(Request(URL,headers={'User-Agent':'Reels-Agent-Source-Verification/0.1'}),timeout=30) as response:
        html=response.read(5*1024*1024).decode('utf-8')
    gallery=Gallery();gallery.feed(html)
    local=(ROOT/'prompts/motif-45-referencias.md').read_text(encoding='utf-8')
    references=re.findall(r'^(\d+)\. \*\*.+?\*\* — cartão (\d+) da categoria \*\*(.+?)\*\*',local,re.M)
    grouped={}
    for card in gallery.cards:grouped.setdefault(card['category'],[]).append(card)
    entries=[]
    for number,ordinal,category in references:
        cards=grouped.get(category,[])
        if int(ordinal)>len(cards):raise ValueError(f'Category/position no longer available: {category} {ordinal}')
        card=cards[int(ordinal)-1]
        entries.append({**card,'id':f'M{int(number):03d}','categoryPosition':int(ordinal),'bindingMethod':'category-and-position as explicitly defined by the local index','galleryMetadataVerified':True,'individualPageFetched':False,'renderTested':False,'promptTextStored':False})
    if len(entries)!=45:raise ValueError(f'Expected 45 mapped entries, got {len(entries)}')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:entries=list(executor.map(verify_individual,entries))
    output={'source':URL,'verifiedAtUtc':datetime.now(timezone.utc).isoformat(),'galleryCardsObserved':len(gallery.cards),'mappedEntries':len(entries),'individualPromptsVerified':sum(e.get('individualPromptAvailable',False) and bool(e.get('creatorPostUrl')) for e in entries),'note':'Factual author/link metadata and fingerprints only. Local descriptive titles retained; no prompt text copied. Availability is not a reproduction test.','entries':entries}
    (ROOT/'prompts/motif-attribution.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'observed':len(gallery.cards),'mapped':len(entries),'individualPromptsVerified':output['individualPromptsVerified']}))

if __name__=='__main__':main()
