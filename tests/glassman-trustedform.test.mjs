import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../btl/glassman/ssdi/',import.meta.url);
const source=fs.readFileSync(new URL('intake.js',root),'utf8');
const helper=source.slice(source.indexOf('  function validCertificate('),source.indexOf('  async function waitForCertificate('));
test('TrustedForm accepts the verified host without assuming one certificate ID length',()=>{
  const scope={};vm.runInNewContext(helper,scope);
  for(const id of ['a'.repeat(40),'tf-new-issuance-format_123']) {
    const url='https://cert.trustedform.com/'+id;
    assert.equal(scope.validCertificate(url),url);
  }
  for(const bad of [null,undefined,'','<redacted>','http://cert.trustedform.com/abc','https://cert.trustedform.com/','https://cert.trustedform.com.evil.invalid/abc','https://cert.trustedform.com@evil.invalid/abc','https://cert.trustedform.com/abc/other','https://cert.trustedform.com/abc?q=1','https://cert.trustedform.com/abc#other']) assert.equal(scope.validCertificate(bad),null);
});
test('TrustedForm finds valid SDK proof rather than trusting the first duplicate field',()=>{
  const cert='https://cert.trustedform.com/'+'a'.repeat(40);
  const scope={form:{querySelectorAll:()=>[{value:''},{value:'https://example.invalid/cert'},{value:cert}]}};
  vm.runInNewContext(helper,scope);assert.equal(scope.certificate(),cert);
});
test('all Glassman entry points use required proof and share the cache-busted intake',()=>{
  for(const file of ['index.html','quiz/index.html','talk-to-sofia/index.html']) {
    const html=fs.readFileSync(new URL(file,root),'utf8');
    assert.match(html,/window\.EE_TRUSTEDFORM = true/);
    assert.match(html,/name="xxTrustedFormCertUrl"/);
    assert.match(html,/intake\.js\?v=20261109-trustedform-required-v1/);
  }
  assert.match(source,/trustedform_cert_url: certificate\(\)/);
  assert.match(source,/window\.EE_TRUSTEDFORM && !validCertificate\(payload\.trustedform_cert_url\)/);
  assert.match(source,/if \(!retrying\) payload\.trustedform_cert_url = await waitForCertificate\(\)/);
  assert.match(source,/payload\.trustedform_cert_url = restored\.certificate_url/);
  assert.match(source,/certificate_url:payload\.trustedform_cert_url/);
  assert.ok(source.indexOf('await waitForCertificate()')<source.indexOf('fetch(window.EE_INTAKE_ENDPOINT'));
});
