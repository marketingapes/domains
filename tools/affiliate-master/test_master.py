import unittest,datetime as dt
from build_master import build,eligibility
NOW=dt.datetime(2026,11,16,2,tzinfo=dt.timezone.utc)
class Tests(unittest.TestCase):
 def row(self):
  return {'key':'ddm:x','property':'ddm','affiliate_url':'https://example.com/x','starts_at':None,'ends_at':None,'source_checked_at':NOW.isoformat(),'availability':True}
 def approved(self):
  return {'ddm:x':{'status':'approved','property':'ddm','evidence_ref':'network-account-receipt','verified_at':NOW.isoformat()}}
 def test_missing_approval(self): self.assertIn('current_merchant_property_approval_missing',eligibility(self.row(),{},NOW))
 def test_approved(self): self.assertEqual([],eligibility(self.row(),self.approved(),NOW))
 def test_property_isolation(self):
  a=self.approved();a['ddm:x']['property']='tnt';self.assertTrue(eligibility(self.row(),a,NOW))
 def test_expired(self):
  r=self.row();r['ends_at']='2026-11-15T00:00:00Z';self.assertIn('expired',eligibility(r,self.approved(),NOW))
 def test_stale(self):
  r=self.row();r['source_checked_at']='2026-11-10T00:00:00Z';self.assertIn('stale_source',eligibility(r,self.approved(),NOW))
 def test_no_invented_price_profit(self):
  d={'checked_at':NOW.isoformat(),'deals':[{'id':'x','url':'https://example.com','usd':50,'pct':20}]}
  r=build(d,{}, {},NOW)['offers'][0];self.assertIsNone(r['price']);self.assertIsNone(r['profit'])
 def test_duplicate(self):
  with self.assertRaises(ValueError):build({'deals':[{'id':'x'},{'id':'x'}]}, {},{},NOW)
 def test_unavailable(self):
  r=self.row();r['availability']=False;self.assertIn('unavailable',eligibility(r,self.approved(),NOW))
if __name__=='__main__':unittest.main()
