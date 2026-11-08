import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TYPES,CATEGORIES,validQuestion} from '../src/core.js';

// Rules every question must pass, including the weekly additions. docs/QUESTION_BANK.md explains them.
const BANK=JSON.parse(fs.readFileSync('src/bank.json','utf8'));
const READING_TYPES=['main-idea','detail','inference','vocab-in-context','purpose','sequence','reference'];

test('ids are unique and every question is well formed',()=>{
  assert.equal(new Set(BANK.map(q=>q.id)).size,BANK.length);
  for(const q of BANK){
    assert.ok(validQuestion(q),q.id);assert.ok(Object.hasOwn(TYPES,q.type),q.id+' type');assert.ok([1,2,3].includes(q.level),q.id+' level');
    assert.equal(new Set(q.choices.map(c=>c.trim().toLowerCase())).size,4,q.id+' duplicate choices');
    assert.ok(q.explanation.length>=20,q.id+' explanation');assert.ok(q.source,q.id+' source');
    assert.equal(READING_TYPES.includes(q.type),q.category==='reading',q.id+' reading types only on reading questions');
    if(q.category==='vocab'||q.category==='grammar')assert.equal(q.passage,'',q.id+' passage');else assert.ok(q.passage.length>=300,q.id+' passage');
  }
});

test('no question is repeated with different ids',()=>{
  const key=q=>(q.prompt+'|'+q.passage).toLowerCase().replace(/[^a-z0-9]/g,''),seen=new Map();
  for(const q of BANK){const k=key(q);assert.ok(!seen.has(k),q.id+' repeats '+seen.get(k));seen.set(k,q.id);}
});

test('the bank covers every skill and keeps answer positions balanced',()=>{
  for(const c of Object.keys(CATEGORIES))assert.ok(BANK.filter(q=>q.category===c).length>=20,c);
  const pos=[0,1,2,3].map(i=>BANK.filter(q=>q.answer===i).length/BANK.length);
  for(const p of pos)assert.ok(p>0.15&&p<0.35,'answer positions '+pos.map(x=>x.toFixed(2)));
});
