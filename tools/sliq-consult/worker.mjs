const ACTION = 'sliq_consult';
const hostnames = new Set(['smartlifeinsurancequote.com','www.smartlifeinsurancequote.com']);
const sources = new Set(['facebook','instagram','tiktok','youtube','direct','other']);
const required = ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','MAKE_INTAKE_URL','MAKE_INTAKE_KEY'];
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request, env, _ctx, http = fetch) {
  const url = new URL(request.url);
  if (!hostnames.has(url.hostname)) return json({error:'Not found'},404);
  if (!required.every(k=>typeof env[k]==='string' && env[k].length)) return json({error:'Online intake unavailable'},503);
  if (url.pathname === '/api/consultation/config' && request.method === 'GET') return json({siteKey:env.TURNSTILE_SITE_KEY});
  if (url.pathname !== '/api/consultation' || request.method !== 'POST') return json({error:'Not found'},404);
  if (request.headers.get('Origin') !== url.origin) return json({error:'Invalid origin'},403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Invalid request'},415);
  const reader=request.body?.getReader(); let raw='',bytes=0;
  if (!reader) return json({error:'Invalid request'},400);
  const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;if((bytes+=value.byteLength)>8192){await reader.cancel();return json({error:'Request too large'},413);}raw+=decoder.decode(value,{stream:true});}
  let data;try{data=JSON.parse(raw+decoder.decode());}catch{return json({error:'Invalid request'},400);}
  if (!data || typeof data !== 'object') return json({error:'Invalid request'},400);
  const name=typeof data.name==='string'?data.name.trim():'';
  const digits=typeof data.phone==='string'?data.phone.replace(/[^0-9]/g,'').replace(/^1(?=[0-9]{10}$)/,''):'';
  const requestId=data.requestId;
  if (name.length<2 || name.length>100 || /[\x00-\x1f\x7f]/.test(name) || !/^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(digits) || typeof data.token!=='string' || !data.token || data.token.length>2048 || typeof requestId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return json({error:'Check your name and phone and try again.'},400);
  try {
    const verified=await http('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:data.token}),redirect:'error',signal:AbortSignal.timeout(5000)});
    const check=verified.ok?await verified.json():null;
    if(!check?.success || check.action!==ACTION || check.hostname!==url.hostname) return json({error:'Security check expired. Please try again.'},400);
    const sink=new URL(env.MAKE_INTAKE_URL);
    if(sink.protocol!=='https:' || !/^hook\.[a-z0-9-]+\.make\.com$/.test(sink.hostname)) return json({error:'Online intake unavailable'},503);
    const saved=await http(sink,{method:'POST',headers:{'Content-Type':'application/json','x-make-apikey':env.MAKE_INTAKE_KEY},body:JSON.stringify({requestId,name,phone:'+1'+digits,source:sources.has(data.source)?data.source:'other',noticeVersion:'sliq-human-callback-v1',requestedAt:new Date().toISOString(),routing:'human_callback_only',smsAllowed:false,aiCallAllowed:false}),redirect:'error',signal:AbortSignal.timeout(10000)});
    const receipt=saved.ok?await saved.json():null;
    if(receipt?.stored!==true || receipt.requestId!==requestId) return json({error:'We could not confirm your request. Please try again or use the contact page.'},503);
    return json({received:true});
  } catch {return json({error:'We could not confirm your request. Please try again or use the contact page.'},503);}
}};
