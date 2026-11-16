// BTL-SSDI-001 web screening: the rules file, the three quizzes and the page copy must agree with the buyer's
// criteria as written in the signed Insertion Order (age 53 to 64, U.S. citizen, plus the four original checks).
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,statSync} from 'node:fs';import vm from 'node:vm';
const root=new URL('../btl/ssdi/',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
function rules(){const window={};vm.runInNewContext(read('criteria.js'),{window,Intl,Date,Number,Object});return window.SSDI_RULES;}
const FIT={state:'AZ',age:'53_64',out_of_work:'yes',doctor:'yes',benefits:'no',lawyer:'no',citizen:'yes'};
const QUIZZES=['quiz/quiz.js','quiz-b/quiz-b.js','b/quiz/quiz.js'];
function pages(dir=''){const out=[];for(const name of readdirSync(new URL(dir||'.',root))){const p=dir+name;if(statSync(new URL(p,root)).isDirectory())out.push(...pages(p+'/'));else if(name==='index.html')out.push(p);}return out;}

test('every answer that fits qualifies; each single miss is not a fit; each "not sure" goes to review',()=>{
 const R=rules();assert.equal(R.version,'btl-ssdi-001-criteria-io-2026-10-29');
 assert.equal(R.outcome(FIT),'QUALIFIED');assert.equal(R.route('QUALIFIED'),'sofia_transfer');
 for(const [k,v] of [['state','CA'],['state','CO'],['age','under_53'],['age','65_plus'],['out_of_work','no'],['doctor','no'],['benefits','yes'],['lawyer','yes'],['citizen','no']])
  assert.equal(R.outcome({...FIT,[k]:v}),'NOT_A_FIT',`${k}=${v}`);
 for(const k of ['out_of_work','doctor','benefits','lawyer','citizen'])assert.equal(R.outcome({...FIT,[k]:'not_sure'}),'FIRM_REVIEW',k);
 assert.equal(R.outcome({...FIT,citizen:'not_sure',age:'65_plus'}),'NOT_A_FIT','a miss outranks a not-sure');
 assert.deepEqual([...R.excludedStates],['CA','CO']);assert.equal(R.hours.label,'Monday–Friday, 9:30 AM–6:00 PM Eastern');
});

test('each quiz asks the same seven questions with answer keys the rules understand',()=>{
 const R=rules();
 for(const file of QUIZZES){const js=read(file);
  const asked=[...js.matchAll(/\{ q: '([a-z_]+)'/g)].map(m=>m[1]);
  assert.deepEqual(asked,['state','age','out_of_work','doctor','benefits','citizen','lawyer'],file);
  const age=js.match(/q: 'age'.*?opts: (\[\[.*?\]\])/)[1];
  assert.deepEqual([...age.matchAll(/\['([a-z0-9_]+)', '([^']+)'\]/g)].map(m=>[m[1],m[2]]),[['under_53','Under 53'],['53_64','53 to 64'],['65_plus','65 or older']],file);
  // every age choice is either the fitting band or one the rules reject: no choice can slip through as qualified
  for(const key of ['under_53','65_plus'])assert.equal(R.outcome({...FIT,age:key}),'NOT_A_FIT',`${file} ${key}`);
  assert.match(js,/q: 'citizen', text: 'Are you a U\.S\. citizen\?', why: 'This review is for U\.S\. citizens\.', opts: YN/,file);
  assert.match(js,/This review is for people 53 to 64\./,file);
 }
});

test('no page or script still states or scores the old criteria',()=>{
 const files=[...pages(),...QUIZZES,'criteria.js','qualifier.js','intake.js','friendly.js','pages.js'];
 for(const f of files)assert.doesNotMatch(read(f),/54 to 63|54–63 years|under_54|54_63|64_plus|[Ss]ix (quick )?questions/,f);
 assert.match(read('index.html'),/<li>53 to 64 years old<\/li>\s*<li>A U\.S\. citizen<\/li>/);
 assert.match(read('b/index.html'),/<li>53 to 64 years old<\/li>\s*<li>A U\.S\. citizen<\/li>/);
});

test('every page loads the same version of the rules, and each quiz page its matching quiz script',()=>{
 const versions=new Set();let loaded=0;
 for(const p of pages()){const html=read(p);const m=html.match(/\/ssdi\/criteria\.js\?v=([0-9a-z]+)/);if(!m)continue;loaded++;versions.add(m[1]);
  const quiz=html.match(/\/ssdi\/(quiz\/quiz|quiz-b\/quiz-b|b\/quiz\/quiz)\.js\?v=([0-9a-z]+)/);if(quiz)assert.equal(quiz[2],m[1],p);}
 assert.ok(loaded>=8,`pages loading the rules: ${loaded}`);assert.equal(versions.size,1,[...versions].join());
});

test('the Glassman SSDI pages keep their own criteria',()=>{
 const g=readFileSync(new URL('../btl/glassman/ssdi/criteria.js',import.meta.url),'utf8');
 assert.doesNotMatch(g,/btl-ssdi-001-criteria-io-2026-10-29|citizen/);
});
