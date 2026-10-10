// This preview never calls an API. Its validated draft exists only in this tab's JavaScript memory.
import {DraftStore} from './browser-store.js';
import {catalog} from './browser-catalog.js';
const store=new DraftStore(catalog);
let commands=Promise.resolve();
export async function browserApi(path,method='GET',data,credential){
 if(path==='catalog'&&method==='GET')return {catalog:structuredClone(store.catalog)};
 if(path==='session'&&method==='POST')return store.create();
 if(path.startsWith('events')&&method==='GET'){const query=new URLSearchParams(path.split('?')[1]||'');return store.read(credential,Number(query.get('after')||0));}
 if(path==='command'&&method==='POST'){const result=commands.then(()=>store.apply(credential,data));commands=result.catch(()=>{});return result;}
 throw new Error('browser_preview_action_unavailable');
}
export function clearBrowserDrafts(){store.sessions.clear();}
