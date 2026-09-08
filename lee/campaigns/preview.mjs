import {createPlan} from './model.mjs';
import {renderIntakePage} from './pages.mjs';
try{const q=new URLSearchParams(location.search);const p=createPlan(Object.fromEntries(q));document.getElementById('preview').srcdoc=renderIntakePage(p,q.get('mode'));document.title=p.title+' · '+q.get('mode')+' preview';}catch(e){document.getElementById('error').textContent=e.message;document.getElementById('preview').hidden=true;}
