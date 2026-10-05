import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBrief,mediaMinimums} from '../lfma/demo/ad-to-intake/demo.mjs';
import {createPlan} from '../campaign-system/model.mjs';
const root=new URL('../lfma/demo/ad-to-intake/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const js=readFileSync(new URL('demo.mjs',root),'utf8');
test('flat build fee remains separate and media minimums match canonical campaign model',()=>{
 for(const [category,minimum] of Object.entries(mediaMinimums)){
  const p=createBrief(category);assert.equal(p.buildFeeUSD,2500);assert.equal(p.planningTotalUSD,2500+minimum);assert.equal(p.buildFeeBasis,'flat_campaign_build');
  const plan=createPlan({brand:'lfma',topic:category==='mva'?'mva':category==='personal_injury'?'personal-injury':'talc',campaignClass:category,start:'2026-10-12'});
  assert.equal(p.mediaMinimumUSD*100,plan.mediaCents);assert.equal(p.status,'synthetic_demo_not_submitted');
 }
 assert.throws(()=>createBrief('unknown'));
});
test('demo forbids live connections and exposes no webhook or personal-data form',()=>{
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);
 assert.doesNotMatch(html+js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|hook\..*make|mailto:|tel:|<form|type="(?:email|tel|text)"/i);
 assert.match(html,/disabled>Send campaign inquiry/);assert.match(html,/No contact details are collected or sent/);
});
test('all four journey stages, synthetic boundaries, existing assets and corrected proof are present',()=>{
 for(let i=0;i<4;i++)assert.ok(html.includes(`data-step="${i}"`));
 for(const text of ['TEN TOES','Ready for the evolution','Experience the demo','../mva-sprint/journey.svg','18 CRM Converted','Executed retainers are unverified','not calculable']) assert.ok(html.includes(text));
 assert.doesNotMatch(html,/18 signed|74\.12|monthly management|2,500 a minute/i);
});
