(() => {
"use strict";
const base="https://perspective-s3b8.onrender.com/portal/glassman";
const el=id=>document.getElementById(id);
let email="",session="",timer,generation=0;
const status=text=>{el("status").textContent=text;};
function lock(){
 generation++;session="";clearTimeout(timer);
 el("metrics").hidden=true;el("sign-in").hidden=false;el("verify").hidden=true;
 for(const id of ["web-count","test-count","source-time","generated-time"])el(id).textContent="";
 el("code").value="";status("Sign-in required. No private data loaded.");
}
async function request(path,body,token){
 const response=await fetch(base+path,{method:body?"POST":"GET",mode:"cors",credentials:"omit",cache:"no-store",
 headers:{...(body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:"Bearer "+token}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const e=new Error("Unavailable");e.status=response.status;throw e;}
 return response.json();
}
function time(value){const date=new Date(value);return value&&!Number.isNaN(date.valueOf())?date.toLocaleString():"Unavailable";}
async function refresh(g){
 try{
  const d=await request("/web-summary",null,session);
  if(g!==generation||!session)return;
  if(d.schema!=="glassman.web-summary/v1"||d.campaign_id!=="GLASSMAN-SSDI-002"||
   !Number.isInteger(d.web_requests)||d.web_requests<0||!Number.isInteger(d.test_requests)||d.test_requests<0)throw new Error("Unexpected report");
  el("web-count").textContent=String(d.web_requests);el("test-count").textContent=String(d.test_requests);
  el("source-time").textContent=time(d.source_updated_at);el("generated-time").textContent=time(d.generated_at);
  el("metrics").hidden=false;status("Connected. Web receipts refresh every minute.");
 }catch(e){
  if(g!==generation)return;
  if(e.status===401||e.status===403){lock();return;}
  status("Refresh failed. Any displayed figures are from the previous successful refresh.");
 }
 if(g===generation&&session)timer=setTimeout(()=>refresh(g),60000);
}
el("sign-in").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter;if(button.disabled)return;button.disabled=true;
 const g=generation;email=el("email").value.trim().toLowerCase();
 try{await request("/login",{email});if(g!==generation)return;el("sign-in").hidden=true;el("verify").hidden=false;status("Check your email for a code.");}
 catch{if(g===generation)status("Sign-in unavailable. Confirm approved access with Kyle.");}
 finally{button.disabled=false;}
});
el("verify").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter;if(button.disabled)return;button.disabled=true;const g=generation;
 try{const d=await request("/verify",{email,code:el("code").value.trim()});if(g!==generation)return;
 if(typeof d.session!=="string"||!d.session)throw new Error("No session");
 session=d.session;el("code").value="";el("verify").hidden=true;await refresh(g);}
 catch{if(g===generation)status("Could not verify code. Try again or change email to request a new one.");}
 finally{button.disabled=false;}
});
el("back").addEventListener("click",lock);el("lock").addEventListener("click",lock);
window.addEventListener("pagehide",lock);window.addEventListener("pageshow",e=>{if(e.persisted)lock();});
})();