export const mediaMinimums = Object.freeze({mva:10000,personal_injury:10000,major_mass_tort:10000,standard:5000});
export function createBrief(category) {
  if(!Object.hasOwn(mediaMinimums,category)) throw new Error('Unknown campaign category');
  return {status:'synthetic_demo_not_submitted',campaignCategory:category,buildFeeUSD:2500,buildFeeBasis:'flat_campaign_build',mediaMinimumUSD:mediaMinimums[category],planningTotalUSD:2500+mediaMinimums[category],firmIdentity:'Not provided',geography:'Requires firm approval',criteria:'Requires firm approval',intakeDestination:'Unverified; live submission disabled',signedCases:'Unverified',note:'Planning only. No order, invoice, advertising or outreach authorized.'};
}
if(typeof document!=='undefined') {
  const $=id=>document.getElementById(id);
  let outcome=null;
  function show(step){
    if(step===3&&!outcome) return;
    document.querySelectorAll('[data-step]').forEach(el=>el.hidden=Number(el.dataset.step)!==step);
    document.querySelectorAll('.demo-progress li').forEach((el,i)=>i===step?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));
    document.querySelector(`[data-step="${step}"] h2`).focus({preventScroll:true});
    $('journey').scrollIntoView({behavior:'instant',block:'start'});
  }
  function clearReceipt(){outcome=null;$('receipt').hidden=true;$('to-inquiry').hidden=true;}
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>show(Number(el.dataset.go))));
  $('permission').addEventListener('change',()=>{clearReceipt();$('simulate').disabled=!$('permission').checked;});
  document.querySelectorAll('.fixture-fields select').forEach(el=>el.addEventListener('change',()=>{clearReceipt();$('permission').checked=false;$('simulate').disabled=true;}));
  function receipt(accepted){
    if(accepted&&!$('permission').checked)return;
    outcome=accepted?'acknowledged':'declined';
    if(!accepted){$('permission').checked=false;$('simulate').disabled=true;}
    $('receipt').textContent=accepted?'Synthetic receipt: the example intake is acknowledged. No firm received anything. Case acceptance and signed outcomes remain unverified.':'Sample permission declined. No handoff occurred. You can still explore a campaign for your firm.';
    $('receipt').hidden=false;$('to-inquiry').hidden=false;
  }
  $('simulate').addEventListener('click',()=>receipt(true));$('decline').addEventListener('click',()=>receipt(false));
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  function pricing(){const brief=createBrief($('category').value);$('media').textContent=money(brief.mediaMinimumUSD);$('total').textContent=money(brief.planningTotalUSD);$('download-status').textContent='';}
  $('category').addEventListener('change',pricing);
  $('reset').addEventListener('click',()=>{clearReceipt();$('permission').checked=false;$('simulate').disabled=true;document.querySelectorAll('select').forEach(el=>el.selectedIndex=0);pricing();show(0);});
  $('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(createBrief($('category').value),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lfma-synthetic-campaign-brief.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('download-status').textContent='Demo brief downloaded locally. Nothing was submitted.';});
}
