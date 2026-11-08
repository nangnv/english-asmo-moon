import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chooseQuestions,recordAnswer,initialState,typeStats,weakTypes,timeTotals,sessionReport} from '../src/core.js';

const BANK=JSON.parse(fs.readFileSync('src/bank.json','utf8'));
const seeded=seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const today='2026-11-08';

test('daily sessions do not repeat a question while unseen ones remain',()=>{
  const state=initialState(),seen=new Set(),random=seeded(7);
  for(let day=0;seen.size+12<=BANK.length;day++){
    const qs=chooseQuestions(BANK,state,'daily',undefined,{today,random});
    for(const q of qs){if(state.answers[q.id])continue;assert.ok(!seen.has(q.id));seen.add(q.id);recordAnswer(state,q,q.answer,{today});}
  }
  assert.ok(seen.size>=BANK.length-12);
});

test('passage questions come in consecutive groups',()=>{
  const qs=chooseQuestions(BANK,initialState(),'topic','reading',{today,random:seeded(3)});
  assert.ok(qs.length>=2);assert.equal(qs[0].passage,qs[1].passage);
});

test('focus practice targets the weakest question type',()=>{
  const state=initialState(),wrong=BANK.filter(q=>q.type==='passive').slice(0,1).concat(BANK.filter(q=>q.type==='verb-tense').slice(0,3));
  for(const q of wrong)recordAnswer(state,q,(q.answer+1)%4,{today});
  for(const q of BANK.filter(q=>q.type==='synonym').slice(0,3))recordAnswer(state,q,q.answer,{today});
  assert.equal(weakTypes(BANK,state)[0].type,'verb-tense');
  const qs=chooseQuestions(BANK,state,'focus',undefined,{today,random:seeded(5)});
  assert.ok(qs.length>0);assert.ok(qs.every(q=>q.type==='verb-tense'),qs.map(q=>q.type).join());
  assert.equal(typeStats(BANK,state).find(s=>s.type==='synonym').percent,100);
});

test('the timed test mixes all skills and prefers unseen questions',()=>{
  const state=initialState(),first=chooseQuestions(BANK,state,'mock',undefined,{random:seeded(1)});
  assert.ok(first.length>=30&&first.length<=40);
  for(const c of ['vocab','grammar','cloze','reading'])assert.ok(first.some(q=>q.category===c),c);
  for(const q of first)recordAnswer(state,q,q.answer,{today});
  const second=chooseQuestions(BANK,state,'mock',undefined,{random:seeded(2)});
  const fresh=BANK.filter(q=>!state.answers[q.id]).length;
  // With a larger bank the second test is new questions only.
  if(fresh>=60)assert.ok(second.every(q=>!state.answers[q.id]));
});

test('study time uses active seconds and groups by day, week and month',()=>{
  const state=initialState();
  state.sessions=[{id:1,date:'2026-11-08',count:5,correct:4,seconds:1200,active:600,label:'a'},{id:2,date:'2026-11-03',count:5,correct:4,seconds:300,label:'b'},{id:3,date:'2026-11-01',count:5,correct:4,seconds:900,label:'c'},{id:4,date:'2026-10-30',count:5,correct:4,seconds:60,label:'d'}];
  const t=timeTotals(state,'2026-11-08');
  assert.equal(t.today,600);assert.equal(t.week,900);assert.equal(t.month,1800);assert.equal(t.total,1860);assert.equal(t.days.length,14);
});

test('a session report names the wrong question types with a fix',()=>{
  const ids=BANK.filter(q=>q.type==='verb-tense').slice(0,2).map(q=>q.id).concat(BANK.find(q=>q.type==='detail').id);
  const r=sessionReport(BANK,{date:today,label:'x',count:10,correct:7,seconds:900,active:480,wrong:ids});
  assert.equal(r.percent,70);assert.equal(r.minutes,8);assert.equal(r.types[0].type,'verb-tense');assert.equal(r.types[0].count,2);assert.ok(r.types[0].fix.length>20);
});
