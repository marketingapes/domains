// Fixed fictional demonstration. No persistence, transport, microphone or provider API.
'use strict';
const forms=document.querySelectorAll('form');
forms.forEach(form=>{
 form.querySelectorAll('input,select').forEach(field=>{if(field.tagName==='SELECT'){field.selectedIndex=field.options.length>1?1:0;field.disabled=true;}else{field.readOnly=true;field.removeAttribute('required');field.value=field.type==='checkbox'?'':field.id==='email'?'example@example.invalid':'Fictional example';}});
 const submit=form.querySelector('[type="submit"]');if(submit)submit.textContent='Simulate review handoff';
 form.addEventListener('submit',event=>{
  event.preventDefault();event.stopImmediatePropagation();form.hidden=true;
  const done=document.getElementById('done');done.hidden=false;
  done.textContent='SIMULATED HANDOFF · DEMO-001. No inquiry was sent, no callback was requested and no firm received a record. The next step would be human review.';
  const link=document.createElement('a');link.href='../#perspective';link.textContent=' View the synthetic reporting journey →';done.append(link);
  done.tabIndex=-1;done.focus();
 },true);
});
const questions=[...document.querySelectorAll('#quiz .q')],back=document.getElementById('back');let step=0;
function show(i){
 questions.forEach((q,n)=>q.classList.toggle('on',n===i));step=i;
 if(back)back.hidden=i===0;
 const count=document.getElementById('count');
 if(count)count.textContent=i<questions.length-1?`${i+1} of ${questions.length-1}`:'Fictional result';
 const bar=document.getElementById('bar');if(bar)bar.style.width=Math.round(100*i/(questions.length-1))+'%';
 if(i===questions.length-1){
  const heading=document.createElement('h2');heading.className='qh';
  heading.textContent='DEMO: Human review remains required. This is not a case assessment.';
  document.getElementById('res').replaceChildren(heading);
 }
 const heading=questions[i].querySelector('h2');
 if(heading){heading.tabIndex=-1;heading.setAttribute('aria-label',`${count.textContent}. ${heading.textContent}`);heading.focus();}
}
questions.forEach((q,i)=>q.querySelectorAll('.opts button').forEach(button=>button.addEventListener('click',()=>show(Math.min(i+1,questions.length-1)))));
if(back)back.addEventListener('click',()=>show(Math.max(0,step-1)));
const turns=[...document.querySelectorAll('.chat .msg')];let turn=1;
if(turns.length){
 turns.forEach((el,i)=>el.hidden=i>0);
 document.getElementById('next-turn').addEventListener('click',event=>{
  if(turn>=turns.length)return;
  const message=turns[turn++];message.hidden=false;
  const speaker=message.classList.contains('s')?'Sofia':'Fictional caller';
  let announcement=`${speaker}: ${message.textContent}`;
  if(turn===turns.length){
   event.target.textContent='Simulated conversation complete · no handoff occurred';
   event.target.setAttribute('aria-disabled','true');
   announcement+=' Simulated conversation complete. No handoff occurred.';
  }
  document.getElementById('sofia-announcement').textContent=announcement;
 });
}
