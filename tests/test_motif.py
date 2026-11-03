import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('motif',Path(__file__).parents[1]/'tools/curate_motif.py')
motif=importlib.util.module_from_spec(spec);spec.loader.exec_module(motif)
class MotifTests(unittest.TestCase):
    def test_individual_prompt_keeps_nested_text_and_source_link_only(self):
        page=motif.Individual();page.feed('<a href="https://x.com/creator/status/123">Original</a><pre>A synthetic <code>prompt</code> with original text.</pre><p>Footer</p>')
        self.assertEqual(''.join(page.prompt),'A synthetic prompt with original text.')
        self.assertEqual(page.links,['https://x.com/creator/status/123'])
    def test_category_author_and_individual_link_survive_split_text(self):
        html='<h2>Motion Design</h2><article><a class="card-title" href="/motions/example/">Synthetic title</a><div class="card-author"><span>S</span><span>u/<!-- -->example</span><span>Model</span></div><img src="image"/></article>'
        gallery=motif.Gallery();gallery.feed(html)
        self.assertEqual(gallery.cards[0]['author'],'u/example')
        self.assertEqual(gallery.cards[0]['sourceUrl'],'https://createmotion.io/motions/example/')
        self.assertEqual(gallery.cards[0]['category'],'Motion Design')
if __name__=='__main__':unittest.main()
