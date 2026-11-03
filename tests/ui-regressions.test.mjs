import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the real browser logic with inert DOM nodes. No browser, keys, or network required.
function app() {
  const nodes=new Map(),events=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{open:false,value:'',textContent:'',innerHTML:'',focus(){},close(){this.open=false;},showModal(){this.open=true;},classList:{add(){},remove(){},toggle(){}}});return nodes.get(selector);};
  const document={querySelector:node,body:{classList:{toggle(){}}},addEventListener(name,handler){if(!events.has(name))events.set(name,[]);events.get(name).push(handler);}};
  const context=vm.createContext({document,console,Intl,Date,Math,JSON,Map,Set,Object,Array,String,Number,Boolean,Error,location:{hash:''},window:{scrollTo(){},addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){},fetch(){return new Promise(()=>{});},MASCOT:{},MEDALS:{},BANK:JSON.parse(fs.readFileSync('src/bank.json','utf8'))});
  for(const file of ['core.js','home.js','lesson.js','app.js'])vm.runInContext(fs.readFileSync('src/'+file,'utf8').replaceAll('export ',''),context,{filename:file});
  return {run:code=>vm.runInContext(code,context),key(key,target){const e={key,target,altKey:false,ctrlKey:false,metaKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const handler of events.get('keydown')||[])handler(e);return e;}};
}
const target=(kind,choice=1)=>({dataset:kind==='choice'?{choice:String(choice)}:{},closest(selector){if(selector==='button')return kind==='choice'||kind==='button'?this:null;if(selector==='[data-choice]')return kind==='choice'?this:null;return null;}});

test('number choice then Enter records one answer instead of selecting it again',()=>{
  const a=app();a.run("start('diagnostic')");
  a.key('2',target('page'));
  assert.equal(a.run('session.choice'),1);
  const enter=a.key('Enter',target('choice'));
  assert.equal(enter.defaultPrevented,true);
  assert.equal(a.run('session.checked'),true);
  assert.equal(a.run('session.results.length'),1);
  assert.equal(a.run('state.xp'),10);
});

test('Enter on a different focused choice selects it before checking',()=>{
  const a=app();a.run("start('diagnostic'); choose(0)");
  const e=a.key('Enter',target('choice',2));
  assert.equal(e.defaultPrevented,true);
  assert.equal(a.run('session.choice'),2);
  assert.equal(a.run('session.checked'),false);
  a.key('Enter',target('choice',2));
  assert.equal(a.run('session.checked'),true);
  assert.equal(a.run('session.results[0].choice'),2);
});

test('Enter on another button keeps that button native behavior',()=>{
  const a=app();a.run("start('diagnostic'); choose(1)");
  const e=a.key('Enter',target('button'));
  assert.equal(e.defaultPrevented,false);
  assert.equal(a.run('session.results.length'),0);
});

test('ending one of twelve diagnostic questions does not complete the path',()=>{
  const a=app();a.run("start('diagnostic'); choose(1); checkAnswer(); finish(true)");
  assert.equal(a.run('state.sessions[0].count'),1);
  assert.equal(a.run('state.sessions[0].completed'),false);
  assert.equal(a.run("pathUnits()[0].nodes[0].done"),false);
});

test('a complete diagnostic unlocks its path node',()=>{
  const a=app();a.run("start('diagnostic'); while(session){choose(currentQuestion().answer);checkAnswer();nextQuestion();}");
  assert.equal(a.run('state.sessions[0].count'),12);
  assert.equal(a.run('state.sessions[0].completed'),true);
  assert.equal(a.run('pathUnits()[0].nodes[0].done'),true);
});

test('a full diagnostic with fewer than twelve unseen questions still completes',()=>{
  const a=app();a.run("for(const q of BANK.filter(q=>q.category==='vocab').slice(2))state.answers[q.id]={firstCorrect:true,mastered:true}; start('diagnostic'); while(session){choose(currentQuestion().answer);checkAnswer();nextQuestion();}");
  assert.equal(a.run('state.sessions[0].count'),11);
  assert.equal(a.run("hasCompletedSession('diagnostic')"),true);
  assert.equal(a.run('state.sessions[0].completed'),true);
  assert.equal(a.run('pathUnits()[0].nodes[0].done'),true);
});

test('legacy sessions use the short-session label, not a fixed question count',()=>{
  const a=app();
  a.run("state.sessions=[{mode:'diagnostic',count:3,label:'Khám phá điểm xuất phát · phiên ngắn'}]");
  assert.equal(a.run("hasCompletedSession('diagnostic')"),false);
  a.run("state.sessions.push({mode:'diagnostic',count:10,label:'Khám phá điểm xuất phát'})");
  assert.equal(a.run("hasCompletedSession('diagnostic')"),true);
  a.run("state.sessions.push({mode:'mock',count:40,answered:25,label:'Bài tổng hợp có thời gian'})");
  assert.equal(a.run("hasCompletedSession('mock')"),true);
  a.run("state.sessions=[{mode:'mock',count:40,answered:5,label:'Bài tổng hợp có thời gian · phiên ngắn'}]");
  assert.equal(a.run("hasCompletedSession('mock')"),false);
});

test('a mock abandoned for a new session is not completed; one submitted early is',()=>{
  const a=app();a.run("start('mock'); choose(0); checkAnswer(); finish(true)");
  assert.equal(a.run('state.sessions[0].completed'),false);
  a.run("start('mock'); choose(0); checkAnswer(); finish()");
  assert.equal(a.run('state.sessions[1].completed'),true);
  assert.equal(a.run("pathUnits()[2].nodes[1].done"),true);
});
