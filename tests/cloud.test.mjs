import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.js';

// D1 stand-in on real SQLite with the real migration; Google's token endpoint is mocked. Emails are fictional.
function d1(){
  const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('migrations/0001_init.sql','utf8'));
  return {raw:db,prepare(sql){return {bind(...args){const st=db.prepare(sql);return {first:async()=>st.get(...args)??null,run:async()=>({meta:{changes:Number(st.run(...args).changes)}})};}};}};
}
const ORIGIN='https://asmo.example.workers.dev';
const envFor=(db=d1())=>({DB:db,AUTH_MODE:'google',GOOGLE_CLIENT_ID:'client-123',GOOGLE_CLIENT_SECRET:'secret-xyz',ACCOUNTS:'student:learner@example.com, parent:Parent@Example.com'});
const b64=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
const idToken=claims=>b64({alg:'RS256'})+'.'+b64({iss:'https://accounts.google.com',aud:'client-123',exp:Math.floor(Date.now()/1000)+3600,email_verified:true,...claims})+'.sig';
const cookieOf=(res,name)=>res.headers.getSetCookie().find(c=>c.startsWith(name+'='))?.split(';')[0];
const get=(path,cookie,headers={})=>new Request(ORIGIN+path,{headers:{...(cookie?{cookie}:{}),...headers}});
async function withGoogle(claims,fn){const original=globalThis.fetch;let sent;globalThis.fetch=async(url,init)=>{sent={url:String(url),body:new URLSearchParams(init.body)};return new Response(JSON.stringify({id_token:idToken(claims)}));};try{return await fn(()=>sent);}finally{globalThis.fetch=original;}}
async function signIn(env,email){
  const login=await worker.fetch(get('/auth/login'),env);
  const oauth=cookieOf(login,'__Host-asmo-oauth'),state=new URL(login.headers.get('location')).searchParams.get('state');
  return withGoogle({email},async()=>{const res=await worker.fetch(get('/auth/callback?code=abc&state='+state,oauth),env);return {res,cookie:cookieOf(res,'__Host-asmo-session')};});
}
const progress={version:1,profile:{name:'Test',examDate:'2026-11-22',minutes:20},answers:{},sessions:[{id:1,date:'2026-11-03',label:'Nhiệm vụ hôm nay',mode:'daily',count:2,correct:1,seconds:60}],xp:20,coins:3,redemptions:[],reward:{name:'Quà',cost:120},lessonDays:[],draft:null,generated:[]};
const put=(cookie,body,origin=ORIGIN)=>new Request(ORIGIN+'/api/progress',{method:'PUT',headers:{cookie,'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});

test('signed-out visitors get the login page, not the app',async()=>{
  const res=await worker.fetch(get('/'),envFor());
  const html=await res.text();
  assert.equal(res.status,200);assert.match(html,/Đăng nhập bằng Google/);assert.doesNotMatch(html,/const BANK/);
});

test('Sites identity headers are not trusted on Cloudflare',async()=>{
  const req=new Request(ORIGIN+'/api/coach',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'spoof',Origin:ORIGIN},body:'{}'});
  assert.equal((await worker.fetch(req,{...envFor(),OPENAI_API_KEY:'test'})).status,401);
  assert.equal((await worker.fetch(get('/api/progress',null,{'oai-authenticated-user-id':'spoof'}),envFor())).status,401);
});

test('a D1 binding alone forces cloud mode, so a missing AUTH_MODE fails closed',async()=>{
  const env=envFor();delete env.AUTH_MODE;
  assert.match(await (await worker.fetch(get('/'),env)).text(),/Đăng nhập bằng Google/);
});

test('login uses PKCE and a short-lived state cookie',async()=>{
  const res=await worker.fetch(get('/auth/login'),envFor());
  const to=new URL(res.headers.get('location'));
  assert.equal(res.status,303);assert.equal(to.origin,'https://accounts.google.com');
  assert.equal(to.searchParams.get('code_challenge_method'),'S256');assert.equal(to.searchParams.get('redirect_uri'),ORIGIN+'/auth/callback');
  const set=res.headers.getSetCookie()[0];
  assert.match(set,/^__Host-asmo-oauth=/);assert.match(set,/HttpOnly/);assert.match(set,/Secure/);assert.match(set,/Max-Age=600/);
});

test('callback rejects a state that does not match the cookie',async()=>{
  const login=await worker.fetch(get('/auth/login'),envFor());
  const res=await worker.fetch(get('/auth/callback?code=abc&state=forged',cookieOf(login,'__Host-asmo-oauth')),envFor());
  assert.equal(res.status,400);assert.equal(cookieOf(res,'__Host-asmo-session'),undefined);
});

test('an approved Google account gets a hashed session and the app',async()=>{
  const env=envFor();const {res,cookie}=await signIn(env,'Learner@Example.com');
  assert.equal(res.status,303);assert.ok(cookie);
  const token=cookie.split('=')[1];const rows=env.DB.raw.prepare('SELECT token_hash,email FROM sessions').all();
  assert.equal(rows.length,1);assert.notEqual(rows[0].token_hash,token);assert.equal(rows[0].email,'learner@example.com');
  assert.match(await (await worker.fetch(get('/',cookie),env)).text(),/const BANK/);
  const me=await (await worker.fetch(get('/api/progress',cookie),env)).json();
  assert.deepEqual([me.role,me.readOnly,me.version,me.data],['student',false,0,null]);
});

test('the code exchange sends the PKCE verifier and client secret only to Google',async()=>{
  const env=envFor();const login=await worker.fetch(get('/auth/login'),env);
  const state=new URL(login.headers.get('location')).searchParams.get('state');
  await withGoogle({email:'learner@example.com'},async sent=>{await worker.fetch(get('/auth/callback?code=abc&state='+state,cookieOf(login,'__Host-asmo-oauth')),env);
    assert.equal(sent().url,'https://oauth2.googleapis.com/token');assert.ok(sent().body.get('code_verifier'));assert.equal(sent().body.get('client_secret'),'secret-xyz');});
});

test('unapproved, unverified or foreign-audience tokens get no session',async()=>{
  for(const claims of [{email:'stranger@example.com'},{email:'learner@example.com',email_verified:false},{email:'learner@example.com',aud:'other-app'},{email:'learner@example.com',iss:'https://evil.test'}]){
    const env=envFor();const login=await worker.fetch(get('/auth/login'),env);
    const state=new URL(login.headers.get('location')).searchParams.get('state');
    const res=await withGoogle(claims,()=>worker.fetch(get('/auth/callback?code=abc&state='+state,cookieOf(login,'__Host-asmo-oauth')),env));
    assert.ok(res.status>=400,JSON.stringify(claims));assert.equal(cookieOf(res,'__Host-asmo-session'),undefined);
    assert.equal(env.DB.raw.prepare('SELECT count(*) AS n FROM sessions').get().n,0);
  }
});

test('student saves with versions; a stale save gets the newer copy back',async()=>{
  const env=envFor();const {cookie}=await signIn(env,'learner@example.com');
  const first=await worker.fetch(put(cookie,{baseVersion:0,data:progress}),env);
  assert.equal(first.status,200);assert.equal((await first.json()).version,1);
  assert.equal((await worker.fetch(put(cookie,{baseVersion:1,data:{...progress,xp:30}}),env)).status,200);
  const stale=await worker.fetch(put(cookie,{baseVersion:1,data:{...progress,xp:99}}),env);
  const body=await stale.json();
  assert.equal(stale.status,409);assert.equal(body.version,2);assert.equal(body.data.xp,30);
});

test('progress writes reject invalid data, other origins and missing sessions',async()=>{
  const env=envFor();const {cookie}=await signIn(env,'learner@example.com');
  assert.equal((await worker.fetch(put(cookie,{baseVersion:0,data:{...progress,xp:-5}}),env)).status,400);
  assert.equal((await worker.fetch(put(cookie,{baseVersion:0,data:{...progress,answers:{'not-a-question':{}}}}),env)).status,400);
  assert.equal((await worker.fetch(put(cookie,{baseVersion:0,data:progress},'https://evil.test'),env)).status,403);
  assert.equal((await worker.fetch(put('__Host-asmo-session=made-up',{baseVersion:0,data:progress}),env)).status,401);
  assert.equal(env.DB.raw.prepare('SELECT count(*) AS n FROM progress').get().n,0);
});

test('parent reads the student progress but cannot write it',async()=>{
  const env=envFor();
  const student=(await signIn(env,'learner@example.com')).cookie,parent=(await signIn(env,'parent@example.com')).cookie;
  await worker.fetch(put(student,{baseVersion:0,data:progress}),env);
  const view=await (await worker.fetch(get('/api/progress',parent),env)).json();
  assert.deepEqual([view.role,view.readOnly,view.version,view.data.xp],['parent',true,1,20]);
  assert.equal((await worker.fetch(put(parent,{baseVersion:1,data:progress}),env)).status,403);
});

test('removing an email from ACCOUNTS ends its sessions; logout deletes the session',async()=>{
  const env=envFor();const {cookie}=await signIn(env,'parent@example.com');
  assert.equal((await worker.fetch(get('/api/progress',cookie),{...env,ACCOUNTS:'student:learner@example.com'})).status,401);
  assert.equal((await worker.fetch(new Request(ORIGIN+'/auth/logout',{method:'POST',headers:{cookie,Origin:'https://evil.test'}}),env)).status,403);
  const out=await worker.fetch(new Request(ORIGIN+'/auth/logout',{method:'POST',headers:{cookie,Origin:ORIGIN}}),env);
  assert.equal(out.status,303);assert.match(out.headers.getSetCookie()[0],/Max-Age=0/);
  assert.equal((await worker.fetch(get('/api/progress',cookie),env)).status,401);
});

test('incomplete configuration explains itself instead of starting a login',async()=>{
  const env=envFor();delete env.GOOGLE_CLIENT_SECRET;
  assert.equal((await worker.fetch(get('/auth/login'),env)).status,503);
});

test('without Cloudflare bindings the Sites/local behaviour is unchanged',async()=>{
  assert.equal((await worker.fetch(get('/api/progress'),{})).status,404);
  assert.match(await (await worker.fetch(get('/'),{})).text(),/const BANK/);
});

// Family-password mode. These passwords are fixtures, not real ones.
const pwEnv=(db=(()=>{const x=d1();x.raw.exec(fs.readFileSync('migrations/0002_login_failures.sql','utf8'));return x;})())=>({DB:db,AUTH_MODE:'password',STUDENT_PASSWORD:'fixture-student-pass',PARENT_PASSWORD:'fixture-parent-pass'});
const pwLogin=(password,{origin=ORIGIN,ip='203.0.113.1'}={})=>new Request(ORIGIN+'/auth/password',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:origin,'cf-connecting-ip':ip},body:new URLSearchParams({password})});

test('password mode shows the form and no Google route starts a login',async()=>{
  const env=pwEnv();const html=await (await worker.fetch(get('/'),env)).text();
  assert.match(html,/type="password"/);assert.doesNotMatch(html,/const BANK/);
  assert.equal((await worker.fetch(get('/auth/login'),env)).headers.get('location'),'/');
});

test('each password opens its role; the session is hashed and contains no password',async()=>{
  const env=pwEnv();
  const student=cookieOf(await worker.fetch(pwLogin('fixture-student-pass'),env),'__Host-asmo-session');
  const parent=cookieOf(await worker.fetch(pwLogin('fixture-parent-pass'),env),'__Host-asmo-session');
  assert.equal((await (await worker.fetch(get('/api/progress',student),env)).json()).role,'student');
  const view=await (await worker.fetch(get('/api/progress',parent),env)).json();
  assert.deepEqual([view.role,view.readOnly],['parent',true]);
  assert.equal((await worker.fetch(put(student,{baseVersion:0,data:progress}),env)).status,200);
  assert.equal((await worker.fetch(put(parent,{baseVersion:1,data:progress}),env)).status,403);
  const dump=JSON.stringify(env.DB.raw.prepare('SELECT * FROM sessions').all());
  assert.doesNotMatch(dump,/fixture-/);assert.ok(!dump.includes(student.split('=')[1]));
});

test('wrong passwords, other origins and a missing password get no session',async()=>{
  const env=pwEnv();
  const wrong=await worker.fetch(pwLogin('nope'),env);
  assert.equal(wrong.status,401);assert.equal(cookieOf(wrong,'__Host-asmo-session'),undefined);
  assert.equal((await worker.fetch(pwLogin('fixture-student-pass',{origin:'https://evil.test'}),env)).status,403);
  assert.equal((await worker.fetch(new Request(ORIGIN+'/auth/password',{method:'POST',headers:{Origin:ORIGIN}}),env)).status,401);
  assert.equal(env.DB.raw.prepare('SELECT count(*) AS n FROM sessions').get().n,0);
});

test('five failures block that IP, even with the right password, but not other IPs',async()=>{
  const env=pwEnv();
  for(let i=0;i<5;i++)assert.equal((await worker.fetch(pwLogin('nope'),env)).status,401);
  const blocked=await worker.fetch(pwLogin('fixture-student-pass'),env);
  assert.equal(blocked.status,429);assert.equal(cookieOf(blocked,'__Host-asmo-session'),undefined);
  assert.equal((await worker.fetch(pwLogin('fixture-student-pass',{ip:'203.0.113.2'}),env)).status,303);
  assert.doesNotMatch(JSON.stringify(env.DB.raw.prepare('SELECT key FROM login_failures').all()),/203\.0\.113/);
});

test('failures across many IPs hit the overall limit; the IP limit window expires',async()=>{
  const env=pwEnv();
  for(let i=0;i<100;i++)await worker.fetch(pwLogin('nope',{ip:'198.51.100.'+(i%250)+'.'+i}),env);
  assert.equal((await worker.fetch(pwLogin('fixture-student-pass',{ip:'203.0.113.9'}),env)).status,429);
  const other=pwEnv();
  for(let i=0;i<5;i++)await worker.fetch(pwLogin('nope'),other);
  other.DB.raw.exec('UPDATE login_failures SET window_start=window_start-'+(16*60000));
  assert.equal((await worker.fetch(pwLogin('fixture-student-pass'),other)).status,303);
});

test('changing a password ends its sessions; the other role stays signed in',async()=>{
  const env=pwEnv();
  const student=cookieOf(await worker.fetch(pwLogin('fixture-student-pass'),env),'__Host-asmo-session');
  const parent=cookieOf(await worker.fetch(pwLogin('fixture-parent-pass'),env),'__Host-asmo-session');
  const changed={...env,STUDENT_PASSWORD:'fixture-student-new'};
  assert.equal((await worker.fetch(get('/api/progress',student),changed)).status,401);
  assert.equal((await worker.fetch(get('/api/progress',parent),changed)).status,200);
});

test('missing or identical passwords fail closed',async()=>{
  const none=pwEnv();delete none.STUDENT_PASSWORD;
  assert.equal((await worker.fetch(get('/'),none)).status,503);
  assert.equal((await worker.fetch(pwLogin('fixture-parent-pass'),none)).status,503);
  const same={...pwEnv(),PARENT_PASSWORD:'fixture-student-pass'};
  assert.equal((await worker.fetch(pwLogin('fixture-student-pass'),same)).status,503);
});

test('AUTH_MODE alone also fails closed without a database',async()=>{
  assert.equal((await worker.fetch(get('/'),{AUTH_MODE:'password',STUDENT_PASSWORD:'fixture-student-pass'})).status,503);
  assert.equal((await worker.fetch(get('/api/progress',null,{'oai-authenticated-user-id':'spoof'}),{AUTH_MODE:'password'})).status,401);
});

// Parent report email. Resend is mocked; the address is fictional.
test('a new study session sends one report email; resaving it does not',async()=>{
  const env={...pwEnv(),RESEND_API_KEY:'re_fixture',REPORT_EMAIL:'parent@example.com'};
  const cookie=cookieOf(await worker.fetch(pwLogin('fixture-student-pass'),env),'__Host-asmo-session');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const day={...progress,answers:{'pdf-11':{firstCorrect:false,mastered:false,attempts:1,lastChoice:0,due:today}},sessions:[{id:7,date:today,label:'Nhiệm vụ hôm nay',mode:'daily',count:2,correct:1,seconds:600,active:420,wrong:['pdf-11']}]};
  const original=globalThis.fetch,sent=[];globalThis.fetch=async(url,init)=>{sent.push({url:String(url),body:JSON.parse(init.body)});return new Response('{}');};
  try{
    assert.equal((await worker.fetch(put(cookie,{baseVersion:0,data:day}),env)).status,200);
    assert.equal(sent.length,1);assert.equal(sent[0].url,'https://api.resend.com/emails');
    assert.deepEqual(sent[0].body.to,['parent@example.com']);
    assert.match(sent[0].body.text,/đúng 1\/2 câu/);assert.match(sent[0].body.text,/7 phút/);assert.match(sent[0].body.text,/Thì của động từ/);
    assert.equal((await worker.fetch(put(cookie,{baseVersion:1,data:{...day,xp:30}}),env)).status,200);
    assert.equal(sent.length,1);
  }finally{globalThis.fetch=original;}
});

test('without Resend settings no email is attempted',async()=>{
  const env=pwEnv(),cookie=cookieOf(await worker.fetch(pwLogin('fixture-student-pass'),env),'__Host-asmo-session');
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}');};
  try{assert.equal((await worker.fetch(put(cookie,{baseVersion:0,data:progress}),env)).status,200);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
