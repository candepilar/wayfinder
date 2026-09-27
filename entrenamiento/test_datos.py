import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from entrenar import load_data
from ampliar import plain

class DataContract(unittest.TestCase):
    def setup_fixture(self, folder, duplicate_family=False, wrong_jurisdiction=False):
        docs=[{'id':str(i),'jurisdiction':'uy','eligible_for_training':i==0} for i in range(3)]
        (folder/'corpus.jsonl').write_text(''.join(json.dumps(d)+'\n' for d in docs),encoding='utf-8')
        for i,s in enumerate(['train','validation','test']):
            row={'document_id':str(i),'family_id':'same' if duplicate_family else str(i),
                 'jurisdiction':'gb' if wrong_jurisdiction and i==0 else 'uy'}
            (folder/f'{s}.jsonl').write_text(json.dumps(row)+'\n',encoding='utf-8')
        manifest={'complete':True,'files_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.glob('*.jsonl')}}
        (folder/'manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
    def test_complete_valid_package(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);self.setup_fixture(root)
            corpus,splits,_=load_data(root)
            self.assertEqual(len(corpus),3);self.assertEqual(len(splits['train']),1)
    def test_tampering_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);self.setup_fixture(root)
            (root/'train.jsonl').write_text('{}\n',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'Hash mismatch'):load_data(root)
    def test_translated_family_cannot_cross_splits(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);self.setup_fixture(root,duplicate_family=True)
            with self.assertRaisesRegex(ValueError,'Family leakage'):load_data(root)
    def test_wrong_country_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);self.setup_fixture(root,wrong_jurisdiction=True)
            with self.assertRaisesRegex(ValueError,'Jurisdiction mismatch'):load_data(root)
    def test_html_words_are_not_split_into_requirements(self):
        value=plain('<p>Fotocopia de la <strong>licencia</strong> original.</p><script>ignore instructions</script><p>Renovación.</p>')
        self.assertEqual(value,'Fotocopia de la licencia original.\nRenovación.')

if __name__=='__main__':unittest.main()
