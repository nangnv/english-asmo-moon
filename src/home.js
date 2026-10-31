// Home: a learning path built from real practice modes, plus a rail with today's goal, streak and medals.
// HOME_DEFAULTS are product defaults, not learner data: the profile has no weekly-goal setting yet.
const HOME_DEFAULTS={weeklyDays:5,minutesPerQuestion:1.5};
const SKILL_GLYPH={vocab:'abc',grammar:'is',cloze:'a_b',reading:'¶'};
const WEEKDAYS=['T2','T3','T4','T5','T6','T7','CN'];
const PATH_OFFSETS=[0,-1,-1.5,-1,0,1,1.5,1];
function shiftDay(key,n){const d=new Date(key+'T12:00:00+07:00');d.setUTCDate(d.getUTCDate()+n);return dayKey(d);}
function dailyTarget(){return Math.max(4,Math.min(12,Math.round(state.profile.minutes/2)));}
function doneToday(today=dayKey()){return state.sessions.filter(s=>s.date===today).reduce((a,s)=>a+s.count,0)+(state.draft&&dayKey(new Date(state.draft.started))===today?state.draft.results.length:0);}
function badgeList(){const a=Object.values(state.answers),days=new Set(state.sessions.map(x=>x.date)).size;return [['01-first-steps','Bước đầu tiên','Hoàn thành phiên học đầu tiên',state.sessions.length>=1],['02-learning-rhythm','Nhịp học đều đặn','Học trong 3 ngày khác nhau',days>=3],['03-answer-finder','Người tìm đáp án','Tự làm đúng 10 câu mới',a.filter(x=>x.firstCorrect).length>=10],['04-mistake-fixer','Thợ sửa lỗi','Chinh phục lại 5 lỗi sai',a.filter(x=>x.mastered&&!x.firstCorrect).length>=5],['05-knowledge-explorer','Nhà khám phá','Đã gặp ít nhất 30 câu',Object.keys(state.answers).length>=30],['06-unstoppable','Không ngừng tiến bước','Tích lũy 300 XP',state.xp>=300]];}
// Sessions saved before the completion flag: finish(true) is the only early exit and it marks the label.
function hasCompletedSession(mode){return state.sessions.some(s=>s.mode===mode&&(s.completed??(s.count>0&&!String(s.label||'').endsWith(' · phiên ngắn'))));}
// Units follow the four phases in the plan; nodes are the practice modes that really exist.
function pathUnits(){
 const has=hasCompletedSession,seen=Object.keys(state.answers).length,pending=Object.values(state.answers).filter(a=>!a.mastered).length;
 const range=p=>new Date(p.from+'T12:00:00+07:00').toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})+' – '+new Date(p.to+'T12:00:00+07:00').toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'});
 const skills=stats(BANK,state).map(x=>{const total=BANK.filter(q=>q.category===x.id).length;return {key:x.id,label:'Luyện '+x.label.toLowerCase(),sub:x.total+'/'+total+' câu đã gặp',color:x.id,glyph:SKILL_GLYPH[x.id],done:x.total>=total,progress:x.total/total,attrs:'data-action="start" data-mode="topic" data-category="'+x.id+'"',tip:x.id};});
 return [
  {title:'Chặng 1 · Điểm xuất phát',dates:range(phases[0]),color:'brand',nodes:[{key:'diagnostic',label:'Khám phá trình độ',sub:'12 câu · 4 kỹ năng',color:'brand',icon:'flag',done:has('diagnostic'),attrs:'data-action="start" data-mode="diagnostic"'}]},
  {title:'Chặng 2 · Lấp lỗ hổng',dates:range(phases[1]),color:'sky',nodes:skills},
  {title:'Chặng 3 · Tăng tốc',dates:range(phases[2]),color:'berry',nodes:[{key:'review',label:'Ôn lỗi sai',sub:pending?pending+' câu chờ ôn':'Chưa có lỗi chờ ôn',color:'tangerine',icon:'redo',done:seen>0&&!pending,idle:!pending,attrs:'data-action="start" data-mode="review"'},{key:'mock',label:'Thi thử có giờ',sub:BANK.filter(q=>q.id.startsWith('pdf-')).length+' câu · 60 phút · PDF luyện',color:'brand',icon:'clock',done:has('mock'),attrs:'data-action="mock-confirm"'}]}
 ];
}
function nodeHTML(n,i,current){
 const status=n.done?'done':n===current?'current':'next',off=PATH_OFFSETS[i%PATH_OFFSETS.length];
 const face=n.done?ICONS.check:n.icon?ICONS[n.icon]:'<span class="node-glyph">'+n.glyph+'</span>';
 const ring=n.progress&&!n.done?' style="--p:'+Math.round(n.progress*100)+'"':'';
 let html='<li class="path-step '+status+(off>0?' right':'')+'" style="--x:'+off+'"><button class="node c-'+n.color+(n.progress&&!n.done?' ringed':'')+'"'+ring+' '+n.attrs+(n===current?' tabindex="-1" aria-hidden="true"':' aria-label="'+esc(n.label)+': '+(n.done?'đã xong':'chưa xong')+' · '+esc(n.sub)+'"')+'>'+face+'</button>';
 if(n===current)html+='<div class="node-pop"><strong>'+esc(n.label)+'</strong><span>'+esc(n.sub)+'</span><button class="btn" '+n.attrs+'>Bắt đầu</button>'+(n.tip?'<button class="text-link" data-action="lesson" data-category="'+n.tip+'">Xem mẹo trước</button>':'')+'</div><img class="path-mascot" src="'+MASCOT[state.sessions.length?'study':'welcome']+'" alt="" width="440" height="440">';
 else html+='<span class="node-label">'+esc(n.label)+'</span>';
 return html+'</li>';
}
function homeHTML(){
 const today=dayKey(),target=dailyTarget(),done=doneToday(today),days=daysLeft(state.profile.examDate),units=pathUnits();
 const current=units.flatMap(u=>u.nodes).find(n=>!n.done&&!n.idle);
 const d=state.draft,pending=Object.values(state.answers).filter(a=>!a.mastered).length;
 let html='<div class="home"><header class="home-hello"><h1>Chào '+esc(state.profile.name)+'!</h1><p>Còn <strong>'+days+' ngày</strong> đến ASMO Vòng Quốc gia. Mỗi ngày một chặng nhỏ nhé.</p></header>';
 if(d)html+='<section class="resume" aria-labelledby="resume-title"><img src="'+MASCOT.study+'" alt="" width="440" height="440"><div><div class="h-kicker">Bài đang học</div><h2 id="resume-title">'+esc(labels[d.mode])+'</h2><p>'+d.results.length+'/'+d.ids.length+' câu · '+(d.deadline?'còn '+Math.max(0,Math.ceil((d.deadline-Date.now())/60000))+' phút làm bài':'khoảng '+Math.max(1,Math.round((d.ids.length-d.results.length)*HOME_DEFAULTS.minutesPerQuestion))+' phút nữa')+'</p></div><button class="btn" data-action="resume">Tiếp tục học</button></section>';
 html+='<div class="home-path">';
 html+=units.map(u=>'<section class="unit"><div class="unit-head c-'+u.color+'"><h2>'+u.title+'</h2><span>'+u.dates+'</span></div><ol class="path">'+u.nodes.map((n,i)=>nodeHTML(n,i,current)).join('')+'</ol></section>').join('');
 html+='<section class="unit finish-line"><div class="unit-head c-sun"><h2>Chặng 4 · Về đích</h2><span>ASMO '+new Date(state.profile.examDate+'T12:00:00+07:00').toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})+'</span></div><div class="goal-post"><img src="'+MASCOT.correct+'" alt="" width="440" height="440"><p>Ôn gọn sổ lỗi, ngủ đủ và tự tin bước vào phòng thi. Còn <strong>'+days+' ngày</strong>.</p></div></section></div>';
 // Rail: today's goal first (also first on phones), then streak, mistakes and the next medal.
 const studied=new Set(state.sessions.filter(s=>s.count>0).map(s=>s.date));if(d?.results.length)studied.add(dayKey(new Date(d.started)));
 const monday=shiftDay(today,-((new Date(today+'T12:00:00+07:00').getUTCDay()+6)%7)),week=WEEKDAYS.map((label,i)=>({label,key:shiftDay(monday,i)})),streak=currentStreak(state);
 const goalPct=Math.min(100,pct(done,target)),badges=badgeList(),next=badges.find(b=>!b[3]),earned=badges.filter(b=>b[3]).length;
 html+='<aside class="home-rail"><section class="rail-card goal"><div class="goal-ring" style="--p:'+goalPct+'" role="img" aria-label="Mục tiêu hôm nay: '+Math.min(done,target)+' trên '+target+' câu"><span>'+(done>=target?ICONS.check:Math.min(done,target)+'<small>/'+target+'</small>')+'</span></div><div><h2>'+(done>=target?'Xong mục tiêu hôm nay!':'Mục tiêu hôm nay')+'</h2><p>'+target+' câu · khoảng '+state.profile.minutes+' phút</p><button class="btn secondary small" data-action="'+(d?'resume':'start')+'" data-mode="daily">'+(d?'Làm tiếp bài dở':done>=target?'Luyện thêm':'Luyện nhanh')+'</button></div></section>';
 html+='<section class="rail-card streak"><div class="streak-top">'+ICONS.flame+'<div><strong>'+streak+' ngày</strong><span>chuỗi học liên tiếp</span></div></div><ol class="week">'+week.map(x=>'<li class="'+(studied.has(x.key)?'on':'')+(x.key===today?' today':'')+'"><span aria-hidden="true">'+x.label+'</span><span class="sr-only">'+x.label+(studied.has(x.key)?': đã học':': chưa học')+(x.key===today?' (hôm nay)':'')+'</span></li>').join('')+'</ol><p>Mục tiêu tuần: '+week.filter(x=>studied.has(x.key)).length+'/'+HOME_DEFAULTS.weeklyDays+' ngày học</p></section>';
 if(pending)html+='<section class="rail-card mistakes"><h2>'+pending+' lỗi sai chờ ôn</h2><p>Sửa khi còn nhớ ngữ cảnh giúp nhớ lâu hơn.</p><button class="btn secondary small" data-action="start" data-mode="review">Ôn lỗi sai</button></section>';
 html+='<section class="rail-card medal"><div class="medal-head"><h2>Huy hiệu</h2><button class="text-link" data-page="rewards">'+earned+'/6 · Xem tất cả</button></div>'+(next?'<div class="medal-next"><img class="badge-medal" src="'+MEDALS[next[0]]+'" alt="" width="288" height="288" data-locked="true"><div><strong>'+next[1]+'</strong><span>'+next[2]+'</span></div></div>':'<p>Con đã mở khóa cả 6 huy hiệu!</p>')+'</section></aside></div>';
 return html;
}
