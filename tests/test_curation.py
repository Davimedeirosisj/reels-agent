import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('curation',Path(__file__).parents[1]/'tools/curate_sources.py')
curation=importlib.util.module_from_spec(spec)
spec.loader.exec_module(curation)

class CurationTests(unittest.TestCase):
    def test_records_attribution_without_republishing_prompt(self):
        html='<meta property="og:title" content="A synthetic example"><a href="https://x.com/example/status/123">Original post</a><div id="entry-prompt">This synthetic prompt asks for <strong>kinetic typography</strong> with meaningful pacing.</div><p>Unrelated footer</p>'
        result=curation.parse_prompt(html,'https://prompt-motion.com/example-123abc')
        self.assertEqual(result['author'],'@example')
        self.assertEqual(result['runtimeTechniqueCandidates'],['kinetic'])
        self.assertFalse(result['fullPromptStored'])
        self.assertNotIn('This synthetic prompt',str(result))

    def test_reference_without_public_prompt_or_creator_is_unverified(self):
        self.assertIsNone(curation.parse_prompt('<h1>Video only</h1>','url'))
        self.assertIsNone(curation.parse_prompt('<div id="entry-prompt">A long prompt with no creator attribution at all.</div>','url'))

    def test_self_closing_break_does_not_truncate_prompt_fingerprint(self):
        a='<meta property="og:title" content="Example"><a href="https://x.com/test/status/123">Post</a><div id="entry-prompt">This is a longer synthetic prompt.<br/>Keep the final sentence.</div>'
        b=a.replace('Keep the final sentence.','A different final sentence.')
        self.assertNotEqual(curation.parse_prompt(a,'url')['promptSha256'],curation.parse_prompt(b,'url')['promptSha256'])

if __name__=='__main__':unittest.main()
