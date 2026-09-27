import unittest
from evaluar_casos import score
from entrenar import check_reserved


class EvaluationSafety(unittest.TestCase):
    def setUp(self):
        self.corpus = {k: {'jurisdiction': j} for k, j in [('a','uy'),('b','uy'),('c','gb')]}
        self.case = {'id':'q', 'review_status':'human_approved','reviewer':'fixture',
                     'acceptable_document_ids':['a','b'], 'jurisdiction':'uy',
                     'expected_action':'retrieve','language':'es','document_language':'es'}

    def test_valid_alternative_is_accepted(self):
        self.assertEqual(score([self.case],[{'id':'q','action':'retrieve','document_ids':['b']}],self.corpus)['overall']['correct'],1)

    def test_wrong_country_or_invented_route_fails(self):
        for ids in [['c'],['invented'],['a','c']]:
            result=score([self.case],[{'id':'q','action':'retrieve','document_ids':ids}],self.corpus)
            self.assertEqual(result['overall']['correct'],0)
            self.assertEqual(result['invalid_routes'],1)

    def test_pending_review_blocks_official_score(self):
        self.case['review_status']='pending_human'
        with self.assertRaisesRegex(ValueError,'Pending human'):
            score([self.case],[],self.corpus)

    def test_missing_predictions_cannot_hide_errors(self):
        with self.assertRaisesRegex(ValueError,'every case'):
            score([self.case],[],self.corpus)

    def test_clarification_cannot_also_route(self):
        self.case.update(expected_action='clarify',acceptable_document_ids=[],document_language=None)
        result=score([self.case],[{'id':'q','action':'clarify','question':'What type?', 'document_ids':['a']}],self.corpus)
        self.assertEqual(result['overall']['correct'],0)

    def test_reserved_documents_cannot_enter_training_or_selection(self):
        for split in ['train','validation']:
            data={'train':[], 'validation':[], 'test':[]}
            data[split]=[{'document_id':'a'}]
            with self.assertRaisesRegex(ValueError,'Reserved evaluation'):
                check_reserved(data, {'a'})


if __name__ == '__main__':
    unittest.main()
