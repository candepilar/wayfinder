import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from contrastes import load_contrasts


class ContrastSafety(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.corpus={i:{'jurisdiction':'uy','eligible_for_training':True,'title':i,'description':'source', 'source_sha256':i} for i in ['a','b','v','t']}
        self.splits={'train':[{'document_id':'a'},{'document_id':'b'}],
                     'validation':[{'document_id':'v','query':'held out'}], 'test':[{'document_id':'t','query':'test query'}]}
        self.row={'id':'one','document_id':'a','negative_document_id':'b','query':'specific request','language':'es','split':'train','jurisdiction':'uy',
                  'positive_source_sha256':'a','negative_source_sha256':'b','positive_evidence':'a\nsource','negative_evidence':'b\nsource'}

    def write(self):
        p=self.root/'train-contrastes.jsonl';p.write_text(json.dumps(self.row)+'\n',encoding='utf-8')
        (self.root/'manifest.json').write_text(json.dumps({'files_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()}}),encoding='utf-8')

    def test_valid_training_pair(self):
        self.write();rows,_=load_contrasts(self.root,self.corpus,self.splits,set());self.assertEqual(len(rows),1)

    def test_reserved_or_validation_negative_rejected(self):
        self.write()
        with self.assertRaisesRegex(ValueError,'reserved'):load_contrasts(self.root,self.corpus,self.splits,{'b'})
        self.row['negative_document_id']='v';self.write()
        with self.assertRaisesRegex(ValueError,'non-training'):load_contrasts(self.root,self.corpus,self.splits,set())

    def test_same_positive_negative_rejected(self):
        self.row['negative_document_id']='a';self.write()
        with self.assertRaisesRegex(ValueError,'equals'):load_contrasts(self.root,self.corpus,self.splits,set())

    def test_evidence_change_rejected(self):
        self.row['positive_evidence']='fabricated';self.write()
        with self.assertRaisesRegex(ValueError,'Evidence changed'):load_contrasts(self.root,self.corpus,self.splits,set())

    def test_eval_query_leak_rejected(self):
        self.row['query']='held out';self.write()
        with self.assertRaisesRegex(ValueError,'leaked'):load_contrasts(self.root,self.corpus,self.splits,set())

    def test_tampered_file_rejected(self):
        self.write();(self.root/'train-contrastes.jsonl').write_text('{}',encoding='utf-8')
        with self.assertRaisesRegex(ValueError,'hash'):load_contrasts(self.root,self.corpus,self.splits,set())


if __name__=='__main__':unittest.main()
