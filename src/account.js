// Account sync, only when the Worker runs on Cloudflare (it answers /api/progress). Otherwise the app stays local-only.
// localStorage remains the working copy; the server copy carries a version so two devices cannot silently overwrite each other.
const SYNC_KEY='asmo-quest-sync',VIEW_ONLY=new Set(['start','resume','redeem','mock-confirm','generate','hint','import','edit']);
let syncTimer=null,syncing=false;
function syncMeta(){try{return JSON.parse(localStorage.getItem(SYNC_KEY))||{};}catch{return {};}}
function setSyncMeta(meta){try{localStorage.setItem(SYNC_KEY,JSON.stringify(meta));}catch{}}
function hasProgress(s){return s.sessions.length>0||Object.keys(s.answers).length>0||Boolean(s.draft);}
function viewOnly(action){if(!account.readOnly||!VIEW_ONLY.has(action))return false;toast('Tài khoản phụ huynh chỉ xem tiến độ. Con đăng nhập tài khoản của mình để học.');return true;}
function accountBanner(){return account.readOnly?'<div class="view-banner" role="status"><strong>Phụ huynh đang xem tiến độ (chỉ xem)</strong><span>'+(account.updatedAt?'Cập nhật lần cuối '+new Date(account.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'numeric',month:'numeric'}):'Con chưa lưu tiến độ nào lên tài khoản.')+'</span></div>':'';}
// Replace the working state with a synced copy, using the same validation as on page load.
function adopt(data){
 const generated=(Array.isArray(data.generated)?data.generated:[]).filter(validQuestion);
 for(const q of generated)if(!BANK.some(x=>x.id===q.id))BANK.push(q);
 state=validateBackup(structuredClone(data),BANK);state.generated=generated;state.draft=data.draft??null;
}
// Merge a local copy into the server copy: union sessions and AI questions, keep the most-attempted answer record.
// XP takes the larger total; stars follow whichever copy has more redemptions so a reward is never refunded.
function mergeProgress(server,local){
 const out=structuredClone(server),key=s=>s.id??JSON.stringify([s.date,s.label,s.count,s.seconds]);
 const seen=new Set(out.sessions.map(key));for(const s of local.sessions)if(!seen.has(key(s)))out.sessions.push(s);
 out.sessions.sort((a,b)=>(a.id??0)-(b.id??0));
 for(const [id,a] of Object.entries(local.answers)){const b=out.answers[id];if(!b||a.attempts>b.attempts)out.answers[id]=a;}
 out.xp=Math.max(out.xp,local.xp);
 if(local.redemptions.length>out.redemptions.length){out.redemptions=local.redemptions;out.coins=local.coins;}else if(local.redemptions.length===out.redemptions.length)out.coins=Math.max(out.coins,local.coins);
 out.lessonDays=[...new Set([...out.lessonDays,...local.lessonDays])];
 const ids=new Set((out.generated||[]).map(q=>q.id));out.generated=[...(out.generated||[]),...(local.generated||[]).filter(q=>!ids.has(q.id))];
 out.draft=local.draft??out.draft??null;
 return out;
}
function setSyncStatus(status){account.status=status;accountBox();}
function accountBox(){
 const box=$('#account-box');if(!box||account.mode!=='cloud')return;
 const text={saved:'✓ Đã lưu vào tài khoản',saving:'Đang lưu…',offline:'Chưa lưu được, sẽ thử lại khi có mạng',expired:'Phiên đăng nhập đã hết hạn',error:'Chưa tải được tiến độ từ tài khoản'}[account.status]||'';
 box.hidden=false;$('#local-note').hidden=true;
 box.innerHTML='<p class="account-who"><strong>'+(account.role==='parent'?'Phụ huynh':'Học sinh')+'</strong><span>'+esc(account.email)+'</span></p>'+(account.readOnly?'':'<p class="account-sync '+account.status+'">'+text+'</p>')+(account.status==='expired'?'<a class="btn small" href="/auth/login">Đăng nhập lại</a>':'<form method="post" action="/auth/logout"><button class="btn ghost small" type="submit">Đăng xuất</button></form>');
}
function syncSoon(){
 // Before the account answers (or while the family decides about this device's old progress) only mark work as unsaved.
 if(account.readOnly)return;
 if(account.mode!=='cloud'||account.awaitingChoice){if(account.pendingInit||account.awaitingChoice)setSyncMeta({...syncMeta(),dirty:true});return;}
 setSyncMeta({email:account.email,version:account.version,dirty:true});
 clearTimeout(syncTimer);syncTimer=setTimeout(pushProgress,1500);
}
async function pushProgress(retries=2){
 if(account.mode!=='cloud'||account.readOnly)return;
 if(syncing){clearTimeout(syncTimer);syncTimer=setTimeout(pushProgress,1500);return;}
 syncing=true;setSyncStatus('saving');
 try{
  const res=await fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseVersion:account.version,data:state}),signal:AbortSignal.timeout(20000)});
  if(res.status===401){setSyncStatus('expired');return;}
  const d=await res.json();
  if(res.status===409&&retries>0){
   // Another device saved first: fold this device's work into its copy, then save again on top of it.
   adopt(mergeProgress(d.data,state));account.version=d.version;
   try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}
   if(!session)render();
   syncing=false;return await pushProgress(retries-1);
  }
  if(!res.ok)throw Error(d.error);
  account.version=d.version;account.updatedAt=d.updatedAt;
  setSyncMeta({email:account.email,version:account.version,dirty:false});setSyncStatus('saved');
 }catch{setSyncStatus('offline');}
 finally{syncing=false;}
}
// Pick up progress saved on another device when this tab comes back, unless there is unsaved work or a lesson open.
async function pullProgress(){
 if(account.mode!=='cloud'||session||syncMeta().dirty&&!account.readOnly)return;
 try{const res=await fetch('/api/progress');if(!res.ok)return;const d=await res.json();if(d.version>account.version&&d.data){adopt(d.data);account.version=d.version;account.updatedAt=d.updatedAt;if(!account.readOnly){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}setSyncMeta({email:account.email,version:d.version,dirty:false});}render();}}catch{}
}
function askToUpload(d,local){
 const count=local.sessions.length;account.awaitingChoice=true;
 // Keep the device's old progress recoverable whichever button is chosen.
 try{localStorage.setItem(STORAGE+'-before-sync',JSON.stringify(local));}catch{}
 modal(d.data?'Gộp tiến độ trên máy này?':'Lưu tiến độ trên máy này vào tài khoản?','<p>Trình duyệt này đang có <strong>'+count+' phiên học</strong> chưa gắn với tài khoản <strong>'+esc(account.email)+'</strong>.'+(d.data?' Tài khoản đã có tiến độ riêng; gộp sẽ thêm các phiên và câu trả lời của máy này vào.':'')+'</p><p>Chỉ chọn nếu đây là tiến độ của chính con.</p>','<button class="btn" id="upload-local">'+(d.data?'Gộp vào tài khoản':'Lưu vào tài khoản')+'</button><button class="btn secondary" id="skip-local">'+(d.data?'Dùng tiến độ trên tài khoản':'Bắt đầu mới')+'</button>');
 $('#dialog').oncancel=e=>e.preventDefault();
 const done=()=>{account.awaitingChoice=false;$('#dialog').oncancel=null;closeModal();};
 $('#upload-local').onclick=()=>{done();if(d.data)adopt(mergeProgress(d.data,local));save();render();toast('Đang lưu tiến độ vào tài khoản.');};
 $('#skip-local').onclick=()=>{done();if(d.data)adopt(d.data);else{state=initialState();state.generated=[];}save();render();};
}
async function initAccount(){
 let res=null;try{res=await fetch('/api/progress',{signal:AbortSignal.timeout(20000)});}catch{}
 if(res?.status===404){account.pendingInit=false;return;}
 // The page is only served to a signed-in account, so 401 here means the session ended: reload to the login page.
 if(res?.status===401){location.reload();return;}
 // Server unreachable: keep learning on this device, mark the work unsaved, and try again shortly.
 if(!res?.ok){account.pendingInit=true;if(!initAccount.warned)toast('Chưa tải được tiến độ từ tài khoản. Bài làm được giữ trên máy này và sẽ lưu sau.');initAccount.warned=true;setTimeout(initAccount,30000);return;}
 const d=await res.json(),meta=syncMeta(),local=state;
 account={mode:'cloud',pendingInit:false,email:d.email,role:d.role,readOnly:d.readOnly,version:d.version,updatedAt:d.updatedAt,status:'saved'};
 if(d.readOnly){session=null;if(d.data)adopt(d.data);else{state=initialState();state.generated=[];}}
 else if(meta.email===d.email&&meta.dirty){
  // Unsaved work from this device: push it, merging if the server moved on meanwhile.
  if(d.data&&meta.version!==d.version)adopt(mergeProgress(d.data,local));
  account.version=d.version;save();
 }
 else if(meta.email!==d.email&&hasProgress(local))askToUpload(d,local);
 else if(d.data){adopt(d.data);setSyncMeta({email:d.email,version:d.version,dirty:false});try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}}
 else save();
 render();accountBox();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullProgress();});
window.addEventListener('online',()=>{if(syncMeta().dirty)pushProgress();});
// Best effort when the tab closes mid-wait; the next load merges if this save did not land.
window.addEventListener('pagehide',()=>{if(account.mode!=='cloud'||account.readOnly||!syncMeta().dirty)return;const body=JSON.stringify({baseVersion:account.version,data:state});if(body.length<60000)fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});});
initAccount();
