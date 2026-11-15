const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const routes=['/glassman/ssdi','/glassman/ssdi/quiz','/glassman/ssdi/talk-to-sofia'];let n=0;
for(const route of routes){
const html=fs.readFileSync(__dirname+'/../btl'+route+'/index.html','utf8');
const start=html.indexOf('<!-- Normalize'),end=html.indexOf('</script>',start);
const script=html.slice(html.indexOf('<script>',start)+8,end);
assert(end<html.indexOf('<!-- Google Tag Manager'));
for(const [path,host,expected] of [[route,'besttortlawyers.com',true],[route+'/','besttortlawyers.com',false],[route+'/index.html','besttortlawyers.com',false],[route+'/extra','besttortlawyers.com',false],[route,'btl-site.onrender.com',false],['/paraquat','besttortlawyers.com',false],['/glassman/ssdi/thank-you','besttortlawyers.com',false]]){
const location=new URL('https://'+host+path+'?utm_source=test&fbclid=synthetic%2Btest&x=1&x=2&empty=#card');
let calls=[];const state={sentinel:1};const history={state,replaceState(...args){calls.push(args)}};
vm.runInNewContext(script,{window:{location,history}});assert.equal(calls.length,Number(expected));if(expected)assert.deepEqual(calls[0],[state,'',path+'/'+location.search+location.hash]);n++;
}
vm.runInNewContext(script,{window:{location:new URL('https://besttortlawyers.com'+route),history:{state:null,replaceState(){throw Error('disabled')}}}});n++;
}
console.log(n+' semantic cases passed (mock History API, not browser navigation proof)');
