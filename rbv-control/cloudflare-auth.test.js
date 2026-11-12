import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createCloudflareAuth} from './cloudflare-auth.js';
test('Access assertion validates cryptography and RBV identity at origin',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const jwk={...await exportJWK(publicKey),kid:'test',alg:'RS256',use:'sig'};
 const env={RBV_CF_ACCESS_ISSUER:'https://marketingapes.cloudflareaccess.com',RBV_CF_ACCESS_AUD:'a'.repeat(64),RBV_CF_ALLOWED_EMAILS:'lindsgosselin@gmail.com,kyleg@marketingapes.com'};
 const saved=globalThis.fetch;
 globalThis.fetch=async url=>{assert.equal(String(url),env.RBV_CF_ACCESS_ISSUER+'/cdn-cgi/access/certs');return new Response(JSON.stringify({keys:[jwk]}));};
 const mint=(changes={},key=privateKey)=>new SignJWT({type:'app',email:'lindsgosselin@gmail.com',sub:'user-1',iss:env.RBV_CF_ACCESS_ISSUER,aud:[env.RBV_CF_ACCESS_AUD],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...changes}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(key);
 try {
  const auth=createCloudflareAuth(env);
  assert.equal((await auth.authorize(await mint())).ok,true);
  for(const c of [{iss:'https://attacker.cloudflareaccess.com'},{aud:['b'.repeat(64)]},{exp:1}])assert.equal((await auth.authorize(await mint(c))).status,401);
  for(const c of [{email:'someone@example.com'},{type:'service'}])assert.equal((await auth.authorize(await mint(c))).status,403);
  assert.equal((await auth.authorize()).status,401);
  assert.equal((await auth.authorize('Bearer opaque-token')).status,401);
  const wrong=await generateKeyPair('RS256');
  assert.equal((await auth.authorize(await mint({},wrong.privateKey))).status,401);
  assert.equal((await createCloudflareAuth({}).authorize(await mint())).status,503);
 }finally{globalThis.fetch=saved;}
});
