// Prepared examples only: no AI request, publication, lead capture or platform action.
const examplesElement=document.getElementById('audience-examples');
if(examplesElement){
  const examples=JSON.parse(examplesElement.textContent);
  document.querySelectorAll('[data-audience]').forEach(button=>button.addEventListener('click',()=>{
    const example=examples.find(item=>item.id===button.dataset.audience);if(!example)return;
    document.querySelectorAll('[data-audience]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    document.getElementById('draft-for').textContent=example.label;
    document.getElementById('draft-headline').textContent=example.headline;
    document.getElementById('draft-message').textContent=example.message;
  }));
}
document.querySelectorAll('[data-scope]').forEach(link=>link.addEventListener('click',()=>{
  const notes=document.querySelector('#system-inquiry [name="notes"]');
  if(notes&&!notes.value.trim()){notes.value=`I'm interested in ${link.dataset.scope}. My goal is: `;notes.dispatchEvent(new Event('input',{bubbles:true}));}
}));
