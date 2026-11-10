import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the real browser logic with inert DOM nodes. No browser, keys, or network required.
function app() {
  const nodes=new Map(),events=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{open:false,value:'',textContent:'',innerHTML:'',focus(){},close(){this.open=false;},showModal(){this.open=true;},classList:{add(){},remove(){},toggle(){}}});return nodes.get(selector);};
  const document={querySelector:node,body:{classList:{toggle(){}}},addEventListener(name,handler){if(!events.has(name))events.set(name,[]);events.get(name).push(handler);}};
  const context=vm.createContext({document,console,Intl,Date,Math,JSON,Map,Set,Object,Array,String,Number,Boolean,Error,location:{hash:''},window:{scrollTo(){},addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){},AbortSignal,structuredClone,fetch(){return new Promise(()=>{});},MASCOT:{},MEDALS:{},BANK:JSON.parse(fs.readFileSync('src/bank.json','utf8'))});
  // One script, like the bundle: client files share function hoisting.
  vm.runInContext(['core.js','home.js','lesson.js','app.js','dashboard.js','drill.js','account.js'].map(file=>fs.readFileSync('src/'+file,'utf8').replaceAll('export ','')).join('\n'),context,{filename:'bundle.js'});
  return {run:code=>vm.runInContext(code,context),key(key,target){const e={key,target,altKey:false,ctrlKey:false,metaKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const handler of events.get('keydown')||[])handler(e);return e;}};
}
const target=(kind,choice=1)=>({dataset:kind==='choice'?{choice:String(choice)}:{},closest(selector){if(selector==='button')return kind==='choice'||kind==='button'?this:null;if(selector==='[data-choice]')return kind==='choice'?this:null;return null;}});

test('number choice then Enter records one answer instead of selecting it again',()=>{
  const a=app();a.run("start('diagnostic')");const key=a.run('currentQuestion().answer');
  a.key(String(key+1),target('page'));
  assert.equal(a.run('session.choice'),key);
  const enter=a.key('Enter',target('choice',key));
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

test('merging two devices keeps every session, the most-attempted answers and never refunds a reward',()=>{
  const a=app();
  const out=a.run(`(()=>{const base=initialState();base.generated=[];
    const server={...structuredClone(base),sessions:[{id:1,date:'2026-11-03',label:'x',count:2,correct:1,seconds:9},{id:3,date:'2026-11-04',label:'x',count:1,correct:1,seconds:9}],answers:{'pdf-1':{firstCorrect:true,mastered:true,attempts:1,lastChoice:0,due:'2026-11-05'}},xp:40,coins:5,redemptions:[{name:'Quà',date:'2026-11-04'}]};
    const local={...structuredClone(base),sessions:[{id:1,date:'2026-11-03',label:'x',count:2,correct:1,seconds:9},{id:2,date:'2026-11-03',label:'x',count:4,correct:2,seconds:9}],answers:{'pdf-1':{firstCorrect:true,mastered:false,attempts:3,lastChoice:1,due:'2026-11-06'},'pdf-2':{firstCorrect:false,mastered:false,attempts:1,lastChoice:2,due:'2026-11-04'}},xp:55,coins:30,redemptions:[]};
    const m=mergeProgress(server,local);return {ids:m.sessions.map(s=>s.id),attempts:m.answers['pdf-1'].attempts,has2:Boolean(m.answers['pdf-2']),xp:m.xp,coins:m.coins,redemptions:m.redemptions.length};})()`);
  assert.deepEqual({...out,ids:[...out.ids]},{ids:[1,2,3],attempts:3,has2:true,xp:55,coins:5,redemptions:1});
});

test('a parent account cannot start lessons or change the profile',()=>{
  const a=app();a.run("account={mode:'cloud',readOnly:true,role:'parent',email:'p@example.com'}");
  assert.equal(a.run("viewOnly('start')"),true);
  assert.equal(a.run("viewOnly('edit')"),true);
  assert.equal(a.run("viewOnly('close')"),false);
  a.run("globalThis.__writes=0;localStorage.setItem=()=>{globalThis.__writes++;};state.xp=999;save()");
  assert.equal(a.run('globalThis.__writes'),0);
});

test('work done before the account loads is marked unsaved so it is merged, not overwritten',()=>{
  const a=app();
  a.run("localStorage.setItem=(k,v)=>{globalThis.__stored=globalThis.__stored||{};globalThis.__stored[k]=v;}");
  a.run("start('daily');choose(0);checkAnswer()");
  assert.equal(JSON.parse(a.run("globalThis.__stored['asmo-quest-sync']")).dirty,true);
});

test('a drill round brings a wrong answer back once and scores XP and the streak bonus',()=>{
  const a=app();a.run("start('drill',undefined,'connector')");
  assert.equal(a.run('session.ids.length'),5);
  const first=a.run('session.ids[0]');
  a.run('choose((currentQuestion().answer+1)%4);checkAnswer()');
  assert.equal(a.run('session.ids.length'),6);assert.equal(a.run('session.ids[5]'),first);
  a.run('nextQuestion()');
  for(let i=0;i<4;i++)a.run('choose(currentQuestion().answer);checkAnswer();nextQuestion()');
  // The retry shows the same question, choices still addressed by their original index.
  assert.equal(a.run('currentQuestion().id'),first);assert.equal(a.run('choiceOrder().slice().sort().join()'),'0,1,2,3');
  a.run('choose(currentQuestion().answer);checkAnswer();nextQuestion()');
  // 3 for the wrong try, 10+10, then 15+15 with the streak bonus, then 5 for the correction + 5 bonus.
  assert.equal(a.run('state.xp'),63);
  const s=a.run('JSON.parse(JSON.stringify(state.sessions.at(-1)))');
  assert.equal(s.count,5);assert.equal(s.correct,4);assert.equal(s.retryCorrect,1);assert.equal(s.bestStreak,5);
  assert.deepEqual(s.wrong,[first]);assert.equal(s.items.length,6);assert.equal(s.items[5].n,2);assert.equal(s.type,'connector');
  assert.equal(s.label,'Luyện từ nối');
});

test('a drill picks unseen questions of the requested type first',()=>{
  const a=app();a.run("start('drill',undefined,'reported-speech')");
  assert.ok(a.run("session.ids.every(id=>BANK.find(q=>q.id===id).type==='reported-speech'&&!state.answers[id])"));
});

test('a right answer on the drill retry is shown as right, with the answer number in shuffled order',()=>{
  const a=app();a.run("start('drill',undefined,'phrasal-verb')");
  a.run('choose((currentQuestion().answer+1)%4);checkAnswer();nextQuestion()');
  for(let i=0;i<4;i++)a.run('choose(currentQuestion().answer);checkAnswer();nextQuestion()');
  a.run("choiceOrder=()=>[3,2,1,0];choose(currentQuestion().answer);checkAnswer()");
  const html=a.run('quizHTML()');
  assert.match(html,/is-ok/);assert.doesNotMatch(html,/Chưa đúng rồi/);
  a.run('session.results.at(-1).correct=false');
  assert.match(a.run('quizHTML()'),new RegExp('Đáp án đúng: '+(4-a.run('currentQuestion().answer'))+'\\.'));
});
