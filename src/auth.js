// Cloudflare hosting: Google sign-in for family-approved emails, cookie sessions and synced progress in D1.
// Cloud mode is on whenever a D1 binding exists, so a misconfigured deploy fails closed instead of trusting Sites headers.
const SESSION_COOKIE='__Host-asmo-session',OAUTH_COOKIE='__Host-asmo-oauth',SESSION_DAYS=30,MAX_PROGRESS=1000000;
const pageHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"};
function cloudMode(env){return env.AUTH_MODE==='google'||Boolean(env.DB);}
// ACCOUNTS secret: "student:moon@gmail.com, parent:parent@gmail.com". Unknown roles are ignored.
function accounts(env){const map=new Map();for(const part of String(env.ACCOUNTS||'').split(',')){const m=part.trim().match(/^(student|parent):(\S+@\S+)$/i);if(m)map.set(m[2].toLowerCase(),m[1].toLowerCase());}return map;}
function cloudReady(env){return Boolean(env.DB&&env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&[...accounts(env).values()].includes('student'));}
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const randomToken=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
const sha256=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
const hashHex=async text=>[...await sha256(text)].map(b=>b.toString(16).padStart(2,'0')).join('');
function cookies(request){const out={};for(const part of (request.headers.get('cookie')||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=part.slice(i+1).trim();}return out;}
const cookie=(name,value,maxAge)=>name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
const sameOrigin=(request,url)=>request.headers.get('origin')===url.origin;
async function currentUser(request,env){
 const token=cookies(request)[SESSION_COOKIE];if(!token||!env.DB||token.length>100)return null;
 const row=await env.DB.prepare('SELECT email FROM sessions WHERE token_hash=? AND expires_at>?').bind(await hashHex(token),Date.now()).first();
 // Roles come from the current ACCOUNTS secret, so removing an email revokes its live sessions.
 const role=row&&accounts(env).get(row.email);return role?{email:row.email,role}:null;
}
function authPage(title,body,status=200,headers={}){
 const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' · ASMO English</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FCFAFF;color:#302638;font:600 16px/1.6 Nunito,system-ui,sans-serif;padding:24px;box-sizing:border-box}main{box-sizing:border-box;background:#fff;border:2px solid #E8E0EF;border-radius:24px;max-width:420px;width:100%;padding:36px 28px;text-align:center}.mark{display:inline-grid;place-items:center;width:56px;height:56px;border-radius:16px;background:#7C3FCB;color:#fff;font-size:28px;font-weight:900;box-shadow:0 4px 0 #54278E}h1{font-size:26px;line-height:1.25;margin:18px 0 8px;font-weight:900}p{color:#756B80;margin:0 0 22px}.btn{display:inline-block;background:#7C3FCB;color:#fff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:16px;box-shadow:0 4px 0 #54278E}.btn:active{transform:translateY(4px);box-shadow:none}.btn:focus-visible{outline:3px solid #7C3FCB;outline-offset:3px}small{display:block;margin-top:22px;color:#756B80;font-size:13px}</style></head><body><main><span class="mark" aria-hidden="true">A</span>'+body+'</main></body></html>';
 return new Response(html,{status,headers:{...pageHeaders,...headers}});
}
const loginPage=(note='',headers={})=>authPage('Đăng nhập','<h1>Chào mừng đến ASMO English</h1><p>'+(note||'Đăng nhập bằng tài khoản Google gia đình đã đăng ký để học tiếp và lưu tiến độ.')+'</p><a class="btn" href="/auth/login">Đăng nhập bằng Google</a><small>Chỉ những email gia đình cho phép mới vào được.</small>',200,headers);
const redirect=(location,headers={})=>new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store',...headers}});
async function handleAuth(request,env,url){
 if(url.pathname==='/auth/login'&&request.method==='GET'){
  if(!cloudReady(env))return authPage('Chưa cấu hình','<h1>Đăng nhập chưa được cấu hình</h1><p>Phụ huynh cần hoàn tất cấu hình Google và cơ sở dữ liệu theo hướng dẫn triển khai.</p>',503);
  const state=randomToken(),verifier=randomToken(),challenge=b64url(await sha256(verifier));
  const q=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:url.origin+'/auth/callback',response_type:'code',scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'});
  return redirect('https://accounts.google.com/o/oauth2/v2/auth?'+q,{'Set-Cookie':cookie(OAUTH_COOKIE,state+'.'+verifier,600)});
 }
 if(url.pathname==='/auth/callback'&&request.method==='GET'){
  const clear={'Set-Cookie':cookie(OAUTH_COOKIE,'',0)};
  const [state,verifier]=(cookies(request)[OAUTH_COOKIE]||'').split('.');
  if(!cloudReady(env))return redirect('/',clear);
  if(url.searchParams.get('error'))return loginPage('Con chưa hoàn tất đăng nhập. Thử lại nhé.',clear);
  if(!state||!verifier||url.searchParams.get('state')!==state||!url.searchParams.get('code'))return authPage('Đăng nhập lại','<h1>Phiên đăng nhập đã hết hạn</h1><p>Hãy bấm đăng nhập lại.</p><a class="btn" href="/auth/login">Đăng nhập bằng Google</a>',400,clear);
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:url.searchParams.get('code'),client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:url.origin+'/auth/callback',grant_type:'authorization_code',code_verifier:verifier}),signal:AbortSignal.timeout(15000)});
  let claims=null;
  // The ID token comes straight from Google's token endpoint over TLS, so its claims are checked without a JWKS fetch.
  if(res.ok){try{const {id_token}=await res.json();claims=JSON.parse(atob(id_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{claims=null;}}
  const valid=claims&&['https://accounts.google.com','accounts.google.com'].includes(claims.iss)&&claims.aud===env.GOOGLE_CLIENT_ID&&claims.exp*1000>Date.now()&&claims.email_verified===true&&typeof claims.email==='string';
  if(!valid)return authPage('Lỗi đăng nhập','<h1>Chưa đăng nhập được</h1><p>Google chưa xác nhận được tài khoản. Hãy thử lại.</p><a class="btn" href="/auth/login">Thử lại</a>',502,clear);
  const email=claims.email.toLowerCase();
  if(!accounts(env).has(email))return authPage('Chưa được phép','<h1>Tài khoản này chưa được phép</h1><p>Email <strong>'+email.replace(/[&<>"']/g,'')+'</strong> chưa nằm trong danh sách gia đình. Hãy chọn tài khoản khác hoặc nhờ phụ huynh thêm email.</p><a class="btn" href="/auth/login">Chọn tài khoản khác</a>',403,clear);
  const token=randomToken(),now=Date.now();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash,email,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashHex(token),email,now,now+SESSION_DAYS*86400000).run();
  const headers=new Headers({Location:'/','Cache-Control':'no-store'});headers.append('Set-Cookie',clear['Set-Cookie']);headers.append('Set-Cookie',cookie(SESSION_COOKIE,token,SESSION_DAYS*86400));
  return new Response(null,{status:303,headers});
 }
 if(url.pathname==='/auth/logout'&&request.method==='POST'){
  if(!sameOrigin(request,url))return new Response('Forbidden',{status:403});
  const token=cookies(request)[SESSION_COOKIE];if(token&&env.DB)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hashHex(token)).run();
  return redirect('/',{'Set-Cookie':cookie(SESSION_COOKIE,'',0)});
 }
 return null;
}
// Parents read the (first) student's progress; only the student account writes it.
function studentOf(env,user){return user.role==='student'?user.email:[...accounts(env)].find(([,r])=>r==='student')?.[0];}
function checkProgress(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const generated=data.generated??[];if(!Array.isArray(generated)||generated.length>400||!generated.every(validQuestion))return false;
 if(data.draft!=null&&(typeof data.draft!=='object'||!Array.isArray(data.draft.ids)||data.draft.ids.length>100||!Array.isArray(data.draft.results)||data.draft.results.length>100))return false;
 try{validateBackup(structuredClone(data),BANK.concat(generated));return true;}catch{return false;}
}
async function handleProgress(request,env,url,user){
 const student=studentOf(env,user);if(!student)return json({error:'Chưa cấu hình tài khoản học sinh.'},503);
 const read=()=>env.DB.prepare('SELECT data,version,updated_at FROM progress WHERE student=?').bind(student).first();
 const view=row=>({role:user.role,email:user.email,readOnly:user.role!=='student',version:row?.version||0,updatedAt:row?.updated_at||null,data:row?JSON.parse(row.data):null});
 if(request.method==='GET')return json(view(await read()));
 if(request.method!=='PUT')return json({error:'Method not allowed'},405);
 if(!sameOrigin(request,url))return json({error:'Yêu cầu không hợp lệ.'},403);
 if(user.role!=='student')return json({error:'Tài khoản phụ huynh chỉ xem tiến độ.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Cần nội dung JSON.'},415);
 const raw=await request.text();if(raw.length>MAX_PROGRESS)return json({error:'Dữ liệu tiến độ quá lớn.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Không đọc được dữ liệu.'},400);}
 if(!Number.isInteger(body.baseVersion)||body.baseVersion<0||!checkProgress(body.data))return json({error:'Dữ liệu tiến độ không hợp lệ.'},400);
 const data=JSON.stringify(body.data),now=Date.now();
 const r=body.baseVersion===0
  ?await env.DB.prepare('INSERT INTO progress (student,data,version,updated_at,updated_by) VALUES (?,?,1,?,?) ON CONFLICT(student) DO NOTHING').bind(student,data,now,user.email).run()
  :await env.DB.prepare('UPDATE progress SET data=?,version=version+1,updated_at=?,updated_by=? WHERE student=? AND version=?').bind(data,now,user.email,student,body.baseVersion).run();
 // Another device saved first: return its copy so the browser can merge and retry.
 if(!r.meta?.changes)return json({conflict:true,...view(await read())},409);
 return json({version:body.baseVersion+1,updatedAt:now});
}
