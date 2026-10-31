// Home screen. Reads only real learner state from localStorage (via `state`).
// HOME_DEFAULTS are product defaults, not learner data: the profile has no weekly-goal setting yet.
const HOME_DEFAULTS={weeklyDays:5,minutesPerQuestion:1.5};
const SKILL_INFO={vocab:{en:'Vocabulary',sample:'abc'},grammar:{en:'Grammar',sample:'is · are'},cloze:{en:'Cloze',sample:'a __ b'},reading:{en:'Reading',sample:'¶'}};
const WEEKDAYS=['T2','T3','T4','T5','T6','T7','CN'];
function shiftDay(key,n){const d=new Date(key+'T12:00:00+07:00');d.setUTCDate(d.getUTCDate()+n);return dayKey(d);}
function dailyTarget(){return Math.max(4,Math.min(12,Math.round(state.profile.minutes/2)));}
function draftSkills(ids){const cats=[...new Set(ids.map(id=>BANK.find(q=>q.id===id)?.category).filter(Boolean))];return cats.length===1?CATEGORIES[cats[0]]:cats.length+' kỹ năng xen kẽ';}
function meter(value,max,label,cls=''){const v=Math.max(0,Math.min(max,value));return '<div class="h-meter '+cls+'" role="progressbar" aria-label="'+esc(label)+'" aria-valuemin="0" aria-valuemax="'+max+'" aria-valuenow="'+v+'"><i style="--w:'+(max?v/max*100:0)+'%"></i></div>';}
function homeLesson(first){
 const d=state.draft;
 if(d){const answered=d.results.length,left=d.ids.length-answered,mins=d.deadline?Math.max(0,Math.ceil((d.deadline-Date.now())/60000)):Math.max(1,Math.round(left*HOME_DEFAULTS.minutesPerQuestion));
  return {kicker:'Bài đang học',title:labels[d.mode],skill:d.category?CATEGORIES[d.category]:draftSkills(d.ids),done:answered,total:d.ids.length,time:(d.deadline?'còn '+mins+' phút làm bài':'khoảng '+mins+' phút nữa'),action:'resume'};}
 if(first)return {kicker:'Bài đầu tiên',title:labels.diagnostic,skill:'4 kỹ năng',done:0,total:chooseQuestions(BANK,state,'diagnostic').length,time:'khoảng 15 phút · không tính giờ',action:'start',mode:'diagnostic'};
 const ids=chooseQuestions(BANK,state,'daily').map(q=>q.id);
 return {kicker:'Bài tiếp theo',title:labels.daily,skill:draftSkills(ids),done:0,total:ids.length,time:'khoảng '+state.profile.minutes+' phút',action:'start',mode:'daily'};
}
function homeRecommendation(today){
 if(!state.sessions.length)return '';
 const last=state.sessions[state.sessions.length-1],due=Object.values(state.answers).filter(a=>!a.mastered&&a.due<=today).length;
 const weak=stats(BANK,state).filter(x=>x.total>=3&&x.percent<80).sort((a,b)=>a.percent-b.percent)[0];
 let title,body,button;
 if(due){title='Ôn lại '+due+' câu sai đến hạn';body='Sửa lỗi khi còn nhớ ngữ cảnh giúp con nhớ lâu hơn.';button='<button class="btn secondary" data-action="start" data-mode="review">Ôn lỗi sai</button>';}
 else if(weak){title='Luyện thêm '+weak.label.toLowerCase();body='Đúng ngay lần đầu '+weak.percent+'% trên '+weak.total+' câu: thấp nhất trong các kỹ năng đã làm. Xem mẹo trước rồi luyện.';button='<button class="btn secondary" data-action="lesson" data-category="'+weak.id+'">Xem mẹo '+weak.label.toLowerCase()+'</button>';}
 else{title='Thử sức với bài có giờ';body='Chưa thấy kỹ năng nào dưới 80% (cần ít nhất 3 câu mỗi kỹ năng). Bài 40 câu giúp con quen nhịp làm bài.';button='<button class="btn secondary" data-action="mock-confirm">Xem đề thi thử</button>';}
 return '<section class="h-panel h-next" aria-labelledby="h-next-title"><div class="h-kicker">Gợi ý học tiếp</div><h2 id="h-next-title">'+title+'</h2><p>'+body+'</p><p class="h-source">Dựa trên bài gần nhất: '+esc(last.label)+' · đúng '+last.correct+'/'+last.count+' câu · '+new Date(last.date+'T12:00:00+07:00').toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})+'</p>'+button+'</section>';
}
function homeHTML(){
 const today=dayKey(),first=state.sessions.length===0,target=dailyTarget(),days=daysLeft(state.profile.examDate);
 const done=state.sessions.filter(s=>s.date===today).reduce((a,s)=>a+s.count,0)+(state.draft&&dayKey(new Date(state.draft.started))===today?state.draft.results.length:0);
 const goalMet=done>=target&&!state.draft,lesson=homeLesson(first&&!state.draft);
 const mascot=goalMet?'correct':first?'welcome':'study';
 const dateLabel=new Date(today+'T12:00:00+07:00').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'numeric',timeZone:'Asia/Ho_Chi_Minh'});
 const lead=state.draft?'Con đang làm dở một bài. Tiếp tục từ câu tiếp theo nhé.':first?'Bắt đầu bằng 12 câu ngắn để biết con mạnh phần nào. Không áp lực, cứ thử sức nhé!':goalMet?'Con đã xong mục tiêu hôm nay. Muốn học thêm thì cứ tiếp tục.':'Hôm nay mình học tiếp một chút, từng câu một.';
 const cta=first&&!state.draft?'Bắt đầu học':goalMet?'Học thêm một bài':'Tiếp tục học';
 // 1–3. Greeting, today's goal, current lesson and the single primary action.
 let html='<div class="home"><section class="h-today" aria-labelledby="h-greeting"><div class="h-today-copy"><div class="h-dateline"><span>'+esc(dateLabel)+'</span><span class="h-chip">Còn <strong>'+days+'</strong> ngày đến ASMO</span></div><h1 id="h-greeting">Chào '+esc(state.profile.name)+'!</h1><p class="h-lead">'+lead+'</p>'+
 '<div class="h-goal"><div class="h-goal-top"><span>Mục tiêu hôm nay</span><strong>'+Math.min(done,target)+'/'+target+' câu</strong></div>'+meter(done,target,'Mục tiêu hôm nay: '+done+' trên '+target+' câu','sun')+'<small>Khoảng '+state.profile.minutes+' phút mỗi ngày · đổi trong Góc phụ huynh</small></div>'+
 '<div class="h-lesson"><div class="h-kicker">'+lesson.kicker+'</div><h2>'+esc(lesson.title)+'</h2><ul class="h-facts"><li><span>Kỹ năng</span>'+esc(lesson.skill)+'</li><li><span>Tiến độ</span>'+lesson.done+'/'+lesson.total+' câu</li><li><span>Thời gian</span>'+lesson.time+'</li></ul>'+(state.draft?meter(lesson.done,lesson.total,'Tiến độ bài đang học'):'')+'</div>'+
 '<button class="btn h-cta" data-action="'+lesson.action+'"'+(lesson.mode?' data-mode="'+lesson.mode+'"':'')+'>'+cta+'<span aria-hidden="true">→</span></button></div>'+
 '<div class="h-today-art" aria-hidden="true"><img class="h-mascot" src="'+MASCOT[mascot]+'" alt="" width="440" height="440"></div></section>';
 // 4–5. Short skill drills vs. the timed practice paper.
 const skills=stats(BANK,state),pdfCount=BANK.filter(q=>q.id.startsWith('pdf-')).length,lastMock=[...state.sessions].reverse().find(s=>s.mode==='mock');
 html+='<div class="h-practice"><section aria-labelledby="h-skills-title"><div class="h-section-head"><h2 id="h-skills-title">Luyện theo dạng bài</h2><p>Bài ngắn theo từng dạng câu ASMO, có gợi ý và giải thích ngay.</p></div><div class="h-skills">'+
 skills.map(x=>{const total=BANK.filter(q=>q.category===x.id).length;return '<button class="h-skill" data-action="start" data-mode="topic" data-category="'+x.id+'"><span class="h-skill-sample" aria-hidden="true">'+SKILL_INFO[x.id].sample+'</span><span class="h-skill-name">'+x.label+'<small lang="en">'+SKILL_INFO[x.id].en+'</small></span><span class="h-skill-stat">'+(x.percent===null?'Chưa làm · '+total+' câu':'Đúng lần đầu '+x.percent+'% · đã gặp '+x.total+'/'+total)+'</span>'+meter(x.total,total,x.label+': đã gặp '+x.total+' trên '+total+' câu')+'</button>';}).join('')+'</div></section>'+
 '<section class="h-panel h-mock" aria-labelledby="h-mock-title"><div class="h-kicker">Đề thi thử ASMO</div><h2 id="h-mock-title">'+pdfCount+' câu · 60 phút</h2><p>Làm liền một mạch, đồng hồ chạy cả khi rời trang. Lời giải mở sau khi nộp bài.</p><p class="h-source">Theo PDF luyện gia đình cung cấp, không phải đề ASMO chính thức.</p>'+(lastMock?'<p class="h-last">Lần gần nhất: <strong>'+lastMock.correct+'/'+lastMock.count+'</strong> câu đúng</p>':'')+'<button class="btn secondary" data-action="mock-confirm">Vào phòng thi thử</button></section></div>';
 // 6–7. Light progress summary and one data-backed next step.
 const studied=new Set(state.sessions.filter(s=>s.count>0).map(s=>s.date));if(state.draft?.results.length)studied.add(dayKey(new Date(state.draft.started)));
 const monday=shiftDay(today,-((new Date(today+'T12:00:00+07:00').getUTCDay()+6)%7)),week=WEEKDAYS.map((label,i)=>({label,key:shiftDay(monday,i)})),weekDone=week.filter(d=>studied.has(d.key)).length;
 const seen=Object.values(state.answers),right=seen.filter(a=>a.firstCorrect).length;
 const next=homeRecommendation(today);
 html+='<div class="h-bottom'+(next?'':' solo')+'"><section class="h-panel h-progress" aria-labelledby="h-progress-title"><div class="h-section-head row"><h2 id="h-progress-title">Tiến bộ của con</h2><button class="text-link" data-page="progress">Xem chi tiết</button></div>';
 if(first&&!seen.length)html+='<div class="h-empty"><img src="'+MASCOT.rest+'" alt="" width="440" height="440"><p>Chưa có dữ liệu. Sau bài đầu tiên, con sẽ thấy số bài đã xong, độ chính xác và tuần học của mình ở đây.</p></div>';
 else html+='<div class="h-week"><div class="h-goal-top"><span>Mục tiêu tuần</span><strong>'+weekDone+'/'+HOME_DEFAULTS.weeklyDays+' ngày học</strong></div><ol class="h-days">'+week.map(d=>'<li class="'+(studied.has(d.key)?'on':'')+(d.key===today?' today':'')+'"><span aria-hidden="true">'+d.label+'</span><span class="sr-only">'+d.label+(studied.has(d.key)?': đã học':': chưa học')+(d.key===today?' (hôm nay)':'')+'</span></li>').join('')+'</ol></div>'+
 '<dl class="h-numbers"><div><dt>Bài đã hoàn thành</dt><dd>'+state.sessions.length+'</dd></div><div><dt>Đúng ngay lần đầu</dt><dd>'+(seen.length?pct(right,seen.length)+'%':'—')+'</dd><small>trên '+seen.length+' câu đã gặp</small></div></dl>';
 html+='</section>'+next+'</div></div>';
 return html;
}
