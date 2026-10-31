export const CATEGORIES = {vocab:'Từ vựng',grammar:'Ngữ pháp',cloze:'Điền từ',reading:'Đọc hiểu'};
export function dayKey(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function daysLeft(target,today=dayKey()){return Math.max(0,Math.ceil((Date.parse(target+'T00:00:00+07:00')-Date.parse(today+'T00:00:00+07:00'))/86400000));}
export function initialState(){return {version:1,profile:{name:'Nhà thám hiểm',examDate:'2026-11-22',minutes:20},answers:{},sessions:[],xp:0,coins:0,redemptions:[],reward:{name:'Một buổi đi chơi cùng gia đình',cost:120},lessonDays:[],draft:null};}
export function stats(bank,state){return Object.entries(CATEGORIES).map(([id,label])=>{const qs=bank.filter(q=>q.category===id);const seen=qs.filter(q=>state.answers[q.id]);const right=seen.filter(q=>state.answers[q.id].firstCorrect);return {id,label,total:seen.length,correct:right.length,percent:seen.length?Math.round(right.length/seen.length*100):null,pending:seen.filter(q=>!state.answers[q.id].mastered).length};});}
export function chooseQuestions(bank,state,mode='daily',category){
 let pool=bank.filter(q=>!category||q.category===category);
 if(mode==='mock')return pool.slice();
 if(mode==='review')return pool.filter(q=>state.answers[q.id]&&!state.answers[q.id].mastered).sort((a,b)=>(state.answers[a.id].due||'').localeCompare(state.answers[b.id].due||'')).slice(0,8);
 const weak=stats(bank,state).sort((a,b)=>(a.percent??50)-(b.percent??50)).map(x=>x.id);
 if(mode==='diagnostic')return Object.keys(CATEGORIES).flatMap(cat=>pool.filter(q=>q.category===cat&&!state.answers[q.id]).slice(0,3));
 const due=pool.filter(q=>state.answers[q.id]&&!state.answers[q.id].mastered&&state.answers[q.id].due<=dayKey()).slice(0,3);
 const fresh=pool.filter(q=>!state.answers[q.id]).sort((a,b)=>weak.indexOf(a.category)-weak.indexOf(b.category));
 // Interleave categories: focus on weaknesses without consuming a whole skill in one sitting.
 const mixed=[];for(let round=0;round<10;round++) for(const cat of weak){const q=fresh.filter(q=>q.category===cat)[round];if(q)mixed.push(q);}
 return [...due,...mixed,...pool.filter(q=>state.answers[q.id]&&!due.includes(q)&&!mixed.includes(q))].slice(0,Math.max(4,Math.min(12,Math.round(state.profile.minutes/2))));
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
export function validateBackup(s,bank){
 if(!s||s.version!==1||!s.profile||typeof s.profile.name!=='string'||s.profile.name.length>40||!/^\d{4}-\d{2}-\d{2}$/.test(s.profile.examDate)||!Number.isFinite(Date.parse(s.profile.examDate))||!Number.isInteger(s.profile.minutes)||s.profile.minutes<5||s.profile.minutes>60)throw Error('Hồ sơ không hợp lệ.');
 if(!s.answers||typeof s.answers!=='object'||Array.isArray(s.answers)||!Array.isArray(s.sessions)||s.sessions.length>10000||!Array.isArray(s.redemptions)||!Array.isArray(s.lessonDays)||!s.reward||typeof s.reward.name!=='string'||s.reward.name.length>120||!Number.isInteger(s.reward.cost)||s.reward.cost<10||s.reward.cost>10000)throw Error('Dữ liệu sao lưu không hợp lệ.');
 for(const k of ['xp','coins'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>10000000)throw Error('Điểm thưởng không hợp lệ.');
 for(const [id,a] of Object.entries(s.answers)){if(!bank.some(q=>q.id===id)||!a||typeof a.firstCorrect!=='boolean'||typeof a.mastered!=='boolean'||!Number.isInteger(a.attempts)||a.attempts<1||!Number.isInteger(a.lastChoice)||a.lastChoice<0||a.lastChoice>3||typeof a.due!=='string')throw Error('Câu trả lời trong bản sao lưu không hợp lệ.');}
 for(const x of s.sessions)if(!x||typeof x.date!=='string'||!Number.isInteger(x.count)||x.count<0||!Number.isInteger(x.correct)||x.correct<0||x.correct>x.count||!Number.isFinite(x.seconds)||typeof x.label!=='string')throw Error('Lịch sử không hợp lệ.');
 for(const x of s.redemptions)if(!x||typeof x.name!=='string'||typeof x.date!=='string')throw Error('Lịch sử quà không hợp lệ.');
 s.draft=null;return s;
}
