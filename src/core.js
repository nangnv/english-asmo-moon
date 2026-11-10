export const CATEGORIES = {vocab:'Từ vựng',grammar:'Ngữ pháp',cloze:'Điền từ',reading:'Đọc hiểu'};
export function dayKey(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function daysLeft(target,today=dayKey()){return Math.max(0,Math.ceil((Date.parse(target+'T00:00:00+07:00')-Date.parse(today+'T00:00:00+07:00'))/86400000));}
export function initialState(){return {version:1,profile:{name:'Nhà thám hiểm',examDate:'2026-11-22',minutes:20},answers:{},sessions:[],xp:0,coins:0,redemptions:[],reward:{name:'Một buổi đi chơi cùng gia đình',cost:120},lessonDays:[],draft:null};}
export function stats(bank,state){return Object.entries(CATEGORIES).map(([id,label])=>{const qs=bank.filter(q=>q.category===id);const seen=qs.filter(q=>state.answers[q.id]);const right=seen.filter(q=>state.answers[q.id].firstCorrect);return {id,label,total:seen.length,correct:right.length,percent:seen.length?Math.round(right.length/seen.length*100):null,pending:seen.filter(q=>!state.answers[q.id].mastered).length};});}
// Question types ("dạng bài") with a parent-facing fix. Shared by the app, the parent dashboard and the report email.
export const TYPES={
 synonym:['Từ đồng nghĩa','Học từ mới theo cặp đồng nghĩa (huge = enormous) và tự đặt một câu cho mỗi cặp. Khi làm bài, thay thử từng đáp án vào câu xem nghĩa có giữ nguyên không.'],
 antonym:['Từ trái nghĩa','Ghi từ mới kèm một từ trái nghĩa (generous ↔ selfish). Đọc kỹ chữ OPPOSITE/NOT trong đề và gạch chân trước khi chọn.'],
 collocation:['Cụm từ cố định','Học cả cụm, không học từ lẻ: make a decision, do homework, take a photo. Mỗi ngày chép 3 cụm vào sổ và dùng trong một câu nói.'],
 'word-form':['Từ loại (danh/động/tính/trạng từ)','Trước khi chọn, xác định chỗ trống cần loại từ gì (sau a/the cần danh từ, trước danh từ cần tính từ). Học họ từ: decide, decision, decisive, decisively.'],
 'phrasal-verb':['Cụm động từ','Học cụm động từ theo chủ đề (look after, look for, look up) bằng câu ví dụ. Ôn 5 cụm mỗi ngày bằng thẻ hai mặt.'],
 idiom:['Thành ngữ','Học thành ngữ qua hình ảnh và câu chuyện ngắn (over the moon = rất vui). Mỗi tuần học 3–4 thành ngữ, nhờ phụ huynh hỏi lại nghĩa.'],
 'word-choice':['Chọn từ theo ngữ cảnh','Đọc cả câu, đoán nghĩa chỗ trống bằng tiếng Việt trước, rồi mới nhìn đáp án. Đọc thêm truyện ngắn để gặp từ trong ngữ cảnh.'],
 spelling:['Chính tả','Chép lại từ hay sai 3 lần, chia âm tiết (ne-ces-sa-ry) và tự kiểm tra bằng cách đọc chính tả với phụ huynh.'],
 'verb-tense':['Thì của động từ','Gạch chân dấu hiệu thời gian (yesterday, since, already, by the time) rồi vẽ trục thời gian: việc nào trước, việc nào sau. Ôn bảng 6 thì chính bằng ví dụ của chính con.'],
 'subject-verb':['Hòa hợp chủ ngữ – động từ','Tìm đúng chủ ngữ chính (bỏ qua cụm "of …", "with …") rồi chia động từ. Luyện riêng các trường hợp each, every, neither… nor, one of.'],
 conditional:['Câu điều kiện','Học 3 khuôn: If + hiện tại, will…; If + quá khứ, would…; If + had V3, would have V3. Nhận dạng loại câu qua vế If trước khi chọn.'],
 'relative-clause':['Mệnh đề quan hệ','Hỏi: từ cần thay là người, vật, nơi chốn hay sở hữu? who/which/where/whose. Tập nối hai câu ngắn thành một câu dùng đại từ quan hệ.'],
 passive:['Câu bị động','Nhớ công thức be + V3 và xác định ai/cái gì chịu tác động. Tập đổi 5 câu chủ động sang bị động mỗi tuần, giữ đúng thì.'],
 'reported-speech':['Câu tường thuật','Lùi thì một bậc và đổi đại từ, trạng từ thời gian. Câu hỏi tường thuật không đảo ngữ: asked where I lived.'],
 comparison:['So sánh','Phân biệt so sánh hơn (-er/more … than) và so sánh nhất (the -est/most). Học thuộc các dạng bất quy tắc: good–better–best, bad–worse–worst.'],
 'gerund-infinitive':['V-ing hay to V','Học theo nhóm: enjoy/finish/look forward to + V-ing; want/decide/hope + to V. Ghi vào sổ mỗi động từ con gặp kèm dạng theo sau.'],
 preposition:['Giới từ','Học giới từ theo cụm: interested in, good at, on Monday, at 7 o’clock, in July. Làm bảng giới từ thời gian/nơi chốn và dán ở bàn học.'],
 modal:['Động từ khuyết thiếu','Hiểu nghĩa từng từ: must (bắt buộc), should (lời khuyên), can (khả năng), might (có thể xảy ra). Sau modal luôn là động từ nguyên mẫu.'],
 'article-quantifier':['Mạo từ và lượng từ','Phân biệt danh từ đếm được/không đếm được trước: many/few đi với đếm được, much/little đi với không đếm được; a/an/the theo việc đã nhắc đến hay chưa.'],
 connector:['Từ nối','Xác định quan hệ hai ý: tương phản (although, however), nguyên nhân (because), kết quả (so, therefore), bổ sung (in addition). Lưu ý despite + danh từ/V-ing.'],
 punctuation:['Dấu câu','Ôn dấu phẩy trong lời nói trực tiếp, dấu nháy sở hữu (Tom’s) và rút gọn (let’s). Đọc to câu để nghe chỗ ngắt.'],
 'main-idea':['Đọc hiểu: ý chính','Sau mỗi đoạn, nói một câu tóm tắt bằng tiếng Việt. Ý chính phải bao quát cả bài, không chỉ một chi tiết.'],
 detail:['Đọc hiểu: tìm chi tiết','Gạch chân từ khóa trong câu hỏi, quét bài tìm từ đó hoặc từ đồng nghĩa, đọc kỹ câu chứa nó. Không chọn theo hiểu biết bên ngoài bài.'],
 inference:['Đọc hiểu: suy luận','Tìm câu làm bằng chứng rồi hỏi: "Điều này cho thấy gì?". Đáp án suy luận đúng luôn dựa trên một chi tiết trong bài.'],
 'vocab-in-context':['Đọc hiểu: đoán nghĩa từ','Đọc câu trước và sau từ đó, thay từng đáp án vào câu xem có hợp nghĩa không. Chú ý từ trái nghĩa ở gần đó.'],
 purpose:['Đọc hiểu: mục đích tác giả','Hỏi: bài viết để thông báo, thuyết phục, kể chuyện hay hướng dẫn? Xem tiêu đề, câu đầu và câu cuối.'],
 sequence:['Đọc hiểu: trình tự sự việc','Đánh số các sự việc theo thứ tự trong bài, chú ý first, then, later, finally và các mốc năm.'],
 reference:['Đọc hiểu: từ thay thế','Khi gặp it/they/this/which, nhìn lại câu ngay trước để tìm danh từ mà nó thay thế, rồi thay vào thử.']
};
export function typeOf(q){return q?.type&&Object.hasOwn(TYPES,q.type)?q.type:null;}
// First-attempt accuracy per question type. A question counts once, at its first try; hinted tries count as not correct.
export function typeStats(bank,state){
 const out={};for(const q of bank){const t=typeOf(q),a=state.answers[q.id];if(!t||!a)continue;const s=out[t]??={type:t,label:TYPES[t][0],category:q.category,seen:0,correct:0,pending:0};s.seen++;if(a.firstCorrect)s.correct++;if(!a.mastered)s.pending++;}
 return Object.values(out).map(s=>({...s,percent:Math.round(s.correct/s.seen*100)}));
}
// 0 (strong) … 1 (weak), smoothed so a type with one or two answers is not judged on luck.
function weakness(stats){const w={};for(const s of stats)w[s.type]=(s.seen-s.correct+s.pending+1)/(s.seen+s.pending+2);return w;}
// Types with enough answers to judge, weakest first. Used by focus practice, the dashboard and the report email.
export function weakTypes(bank,state,min=3){return typeStats(bank,state).filter(s=>s.seen>=min&&s.percent<80).sort((a,b)=>a.percent-b.percent||b.seen-a.seen);}
export function strongTypes(bank,state,min=3){return typeStats(bank,state).filter(s=>s.seen>=min&&s.percent>=80).sort((a,b)=>b.percent-a.percent||b.seen-a.seen);}
const levelFor=p=>p===null?2:p<50?1:p<80?2:3;
// Questions sharing a passage are served together (up to `max`) so one reading is not wasted on a single item.
function withSiblings(q,pool,taken,max){if(!q.passage)return [q];return [q,...pool.filter(x=>x!==q&&x.passage===q.passage&&!taken.has(x.id))].slice(0,max);}
export function chooseQuestions(bank,state,mode='daily',category,{today=dayKey(),random=Math.random,type,types=[]}={}){
 let pool=bank.filter(q=>!category||q.category===category);
 if(mode==='drill')return drillSet(bank.filter(q=>q.type===type),state,5,today,random);
 // Daily review of the weak types, weakest first (4, 3, 3), mistakes not yet fixed before new questions, types interleaved.
 if(mode==='today'){const sets=types.map((t,i)=>drillSet(bank.filter(q=>q.type===t),state,[4,3,3][i]||0,today,random,true)),out=[];for(let i=0;i<4;i++)for(const s of sets)if(s[i])out.push(s[i]);return out;}
 if(mode==='mock')return mockSet(pool,state,random);
 if(mode==='review')return pool.filter(q=>state.answers[q.id]&&!state.answers[q.id].mastered).sort((a,b)=>(state.answers[a.id].due||'').localeCompare(state.answers[b.id].due||'')).slice(0,8);
 if(mode==='diagnostic')return Object.keys(CATEGORIES).flatMap(cat=>{const fresh=pool.filter(q=>q.category===cat&&!state.answers[q.id]&&q.level!==3);const first=fresh[Math.floor(random()*fresh.length)];return first?withSiblings(first,fresh,new Set(),3).concat(fresh.filter(q=>!q.passage&&q!==first)).slice(0,3):[];});
 const size=Math.max(4,Math.min(12,Math.round(state.profile.minutes/2))),ts=typeStats(bank,state),w=weakness(ts),cat=Object.fromEntries(stats(bank,state).map(x=>[x.id,levelFor(x.percent)]));
 const due=pool.filter(q=>state.answers[q.id]&&!state.answers[q.id].mastered&&state.answers[q.id].due<=today).slice(0,3);
 // Fresh questions: weak types first, near the right level for the skill, with some randomness so sessions differ.
 const score=q=>(w[typeOf(q)]??0.5)-Math.abs((q.level||2)-cat[q.category])*0.2+random()*0.35;
 const fresh=pool.filter(q=>!state.answers[q.id]).map(q=>[score(q),q]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);
 const picked=[...due],taken=new Set(due.map(q=>q.id)),perCat={},cap=mode==='daily'?Math.ceil(size/2):size;
 for(const q of fresh){if(picked.length>=size)break;if(taken.has(q.id)||(perCat[q.category]||0)>=cap)continue;for(const x of withSiblings(q,fresh,taken,3)){if(picked.length>=size)break;picked.push(x);taken.add(x.id);perCat[x.category]=(perCat[x.category]||0)+1;}}
 // Only when every fresh question is used: revisit answered ones, least recently seen first.
 const old=pool.filter(q=>state.answers[q.id]&&!taken.has(q.id)).sort((a,b)=>(state.answers[a.id].lastDate||'').localeCompare(state.answers[b.id].lastDate||''));
 return [...picked,...old].slice(0,size);
}
// Short drill on one question type: unseen first, then unfixed mistakes, then the least recently seen.
// Questions answered in the last two days go last so a new round does not feel like a repeat.
function drillSet(pool,state,n,today,random,mistakesFirst=false){
 const recent=new Date(today+'T12:00:00+07:00');recent.setUTCDate(recent.getUTCDate()-2);const cut=dayKey(recent);
 const rank=q=>{const a=state.answers[q.id];if(!a)return mistakesFirst?1:0;if(a.lastDate>cut)return 3;return a.mastered?2:mistakesFirst?0:1;};
 return pool.map(q=>[rank(q),state.answers[q.id]?.lastDate||'',random(),q]).sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1])||a[2]-b[2]).slice(0,n).map(x=>x[3]);
}
// A timed test shaped like the 40-question practice PDF: 10 vocab, 10 grammar, one cloze passage, reading passages to ~40. Unseen first.
function mockSet(pool,state,random){
 const fresh=q=>state.answers[q.id]?1:0,last=q=>state.answers[q.id]?.lastDate||'';
 const order=qs=>qs.map(q=>[fresh(q),last(q),random(),q]).sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1])||a[2]-b[2]).map(x=>x[3]);
 // Passage sets: fully unseen sets first, then the least recently seen.
 const sets=cat=>{const m=new Map();for(const q of pool.filter(q=>q.category===cat))m.set(q.passage,[...(m.get(q.passage)||[]),q]);return [...m.values()].map(g=>[g.some(q=>state.answers[q.id])?1:0,g.map(last).sort().pop(),random(),g]).sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1])||a[2]-b[2]).map(x=>x[3]);};
 const out=[...order(pool.filter(q=>q.category==='vocab')).slice(0,10),...order(pool.filter(q=>q.category==='grammar')).slice(0,10),...(sets('cloze')[0]||[])];
 for(const g of sets('reading')){if(out.length>=40)break;out.push(...g.slice(0,40-out.length));}
 return out;
}
export function recordAnswer(state,q,choice,{assisted=false,today=dayKey()}={}){
 const old=state.answers[q.id],correct=choice===q.answer;let xp=0,coins=0;
 if(!old){xp=correct&&!assisted?10:3;coins=correct&&!assisted?2:1;}
 else if(correct&&!old.mastered&&!assisted){xp=5;coins=1;}
 const streak=correct&&!assisted?(old?.correctStreak||0)+1:0;
 const next=new Date(today+'T12:00:00+07:00');next.setUTCDate(next.getUTCDate()+(correct?Math.min(7,2**Math.min(streak,3)):1));
 state.answers[q.id]={firstCorrect:old?.firstCorrect??(correct&&!assisted),firstChoice:old?.firstChoice??choice,firstAssisted:old?.firstAssisted??assisted,firstDate:old?.firstDate??today,lastChoice:choice,lastDate:today,correctStreak:streak,mastered:correct&&!assisted,attempts:(old?.attempts||0)+1,due:dayKey(next),rewarded:(old?.rewarded||false)||correct&&!assisted};
 // A correction earns once. Repeated wrong/right cycles must not mint more rewards.
 if(old?.rewarded){xp=0;coins=0;}
 state.xp+=xp;state.coins+=coins;
 return {correct,fresh:!old,assisted,xp,coins};
}
export function currentStreak(s,today=dayKey()){
 const days=[...new Set(s.sessions.filter(x=>x.count>0).map(x=>x.date))].sort().reverse();
 if(!days.length)return 0;
 const yesterday=new Date(today+'T12:00:00+07:00');yesterday.setUTCDate(yesterday.getUTCDate()-1);
 if(days[0]!==today&&days[0]!==dayKey(yesterday))return 0;
 let n=1;for(let i=1;i<days.length;i++){if((Date.parse(days[i-1])-Date.parse(days[i]))/86400000!==1)break;n++;}return n;
}
// Study time: newer sessions record active seconds (idle gaps and hidden tabs excluded); older ones only have wall time.
export function studySeconds(x){return Number.isFinite(x.active)?x.active:x.seconds;}
export function weekStart(day){const d=new Date(day+'T12:00:00+07:00');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return dayKey(d);}
export function timeTotals(state,today=dayKey()){
 const sum=f=>state.sessions.filter(f).reduce((s,x)=>s+studySeconds(x),0),week=weekStart(today),days=[];
 for(let i=13;i>=0;i--){const d=new Date(today+'T12:00:00+07:00');d.setUTCDate(d.getUTCDate()-i);const k=dayKey(d);days.push({date:k,seconds:sum(x=>x.date===k)});}
 const count=state.sessions.filter(x=>x.count>0).length;
 return {today:sum(x=>x.date===today),week:sum(x=>x.date>=week&&x.date<=today),month:sum(x=>x.date.slice(0,7)===today.slice(0,7)),total:sum(()=>true),perSession:count?Math.round(sum(x=>x.count>0)/count):0,days};
}
// What one session says to a parent: score, time, and which question types went wrong, with the fix for the worst one.
export function sessionReport(bank,x){
 const wrong={};for(const id of x.wrong||[]){const t=typeOf(bank.find(q=>q.id===id));if(t)wrong[t]=(wrong[t]||0)+1;}
 const types=Object.entries(wrong).sort((a,b)=>b[1]-a[1]).map(([type,n])=>({type,label:TYPES[type][0],count:n,fix:TYPES[type][1]}));
 return {date:x.date,label:x.label,count:x.count,correct:x.correct,percent:x.count?Math.round(x.correct/x.count*100):0,minutes:Math.max(1,Math.round(studySeconds(x)/60)),completed:x.completed!==false,types};
}
// Shared by the browser (backups, AI questions) and the Worker (synced progress).
export function validQuestion(q){return q&&typeof q.id==='string'&&q.id.length<100&&Object.hasOwn(CATEGORIES,q.category)&&(q.type===undefined||Object.hasOwn(TYPES,q.type))&&typeof q.prompt==='string'&&q.prompt.length<2500&&Array.isArray(q.choices)&&q.choices.length===4&&q.choices.every(x=>typeof x==='string'&&x.length<1000)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&typeof q.explanation==='string'&&typeof q.passage==='string';}
export function validateBackup(s,bank){
 if(!s||s.version!==1||!s.profile||typeof s.profile.name!=='string'||s.profile.name.length>40||!/^\d{4}-\d{2}-\d{2}$/.test(s.profile.examDate)||!Number.isFinite(Date.parse(s.profile.examDate))||!Number.isInteger(s.profile.minutes)||s.profile.minutes<5||s.profile.minutes>60)throw Error('Hồ sơ không hợp lệ.');
 if(!s.answers||typeof s.answers!=='object'||Array.isArray(s.answers)||!Array.isArray(s.sessions)||s.sessions.length>10000||!Array.isArray(s.redemptions)||!Array.isArray(s.lessonDays)||!s.reward||typeof s.reward.name!=='string'||s.reward.name.length>120||!Number.isInteger(s.reward.cost)||s.reward.cost<10||s.reward.cost>10000)throw Error('Dữ liệu sao lưu không hợp lệ.');
 for(const k of ['xp','coins'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>10000000)throw Error('Điểm thưởng không hợp lệ.');
 for(const [id,a] of Object.entries(s.answers)){if(!bank.some(q=>q.id===id)||!a||typeof a.firstCorrect!=='boolean'||typeof a.mastered!=='boolean'||!Number.isInteger(a.attempts)||a.attempts<1||!Number.isInteger(a.lastChoice)||a.lastChoice<0||a.lastChoice>3||typeof a.due!=='string')throw Error('Câu trả lời trong bản sao lưu không hợp lệ.');}
 for(const x of s.sessions)if(!x||typeof x.date!=='string'||!Number.isInteger(x.count)||x.count<0||!Number.isInteger(x.correct)||x.correct<0||x.correct>x.count||!Number.isFinite(x.seconds)||typeof x.label!=='string')throw Error('Lịch sử không hợp lệ.');
 for(const x of s.redemptions)if(!x||typeof x.name!=='string'||typeof x.date!=='string')throw Error('Lịch sử quà không hợp lệ.');
 s.draft=null;return s;
}
