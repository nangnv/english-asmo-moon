// Weak-type drills: a 30-second "Học nhanh" card per question type and 5-question rounds where a wrong answer comes back at the end.
// Card text follows the family's rule for Vietnamese copy: commas and full stops, no semicolons or dashes as punctuation.
const LEARN={
 'reported-speech':{what:'Kể lại lời người khác đã nói, không dùng ngoặc kép.',steps:['Lùi thì một bậc: am/is thành was, do thành did, will thành would, can thành could, have thành had.','Đổi đại từ cho hợp người kể: I thành he hoặc she, my thành his hoặc her.','Đổi từ chỉ thời gian: now thành then, today thành that day, tomorrow thành the next day, yesterday thành the day before.'],tip:'Câu hỏi tường thuật không đảo ngữ (asked where I lived). Câu hỏi Yes/No dùng if hoặc whether. Lệnh phủ định dùng told + người + not to + động từ.',example:{quote:'"I am tired," she said.',right:'She said that she was tired.',wrong:'She said that she is tired.',why:'chưa lùi thì'}},
 'phrasal-verb':{what:'Động từ ghép với một từ nhỏ (up, after, off...) tạo ra nghĩa hoàn toàn mới.',steps:['Đừng dịch từng chữ, học cả cụm như một từ.','Học theo nhóm, ví dụ look after là chăm sóc, look for là tìm kiếm, look up là tra cứu.','Nhớ nghĩa từ nhỏ: up là lên hoặc hoàn tất, off là rời khỏi hoặc tắt, out là hết hoặc ra ngoài, on là mặc hoặc bật.'],tip:'Mỗi ngày chỉ nhớ 5 cụm, học bằng câu ví dụ.',example:{right:'I look after my cat. (chăm sóc mèo)',wrong:'I look for my cat. (đi tìm mèo, nghĩa khác hẳn)',why:'đổi từ nhỏ là đổi nghĩa'}},
 connector:{what:'Từ nối cho biết hai ý trong câu có quan hệ gì với nhau.',steps:['Nhận dạng quan hệ: tương phản (although, however, but, despite), nguyên nhân (because, because of), kết quả (so, therefore), bổ sung (and, in addition).','Sau because, although, so là một mệnh đề có chủ ngữ và động từ.','Sau because of, despite, in spite of là danh từ hoặc V-ing.'],tip:'However, therefore, in addition đứng đầu câu và có dấu phẩy phía sau.',example:{right:'Although it rained, we played outside. Despite the rain, we played outside.',wrong:'Despite it rained, we played outside.',why:'despite không đi với mệnh đề'}}
};
// Rounds that bring a wrong answer back at the end: one type, or today's mixed review.
const DRILL_MODES=new Set(['drill','today']);
// Default drill types before there is enough data; the parent's latest report named these three.
const DRILL_DEFAULTS=['reported-speech','phrasal-verb','connector'];
function drillTypes(){const weak=weakTypes(BANK,state).map(s=>s.type);return [...new Set([...weak,...DRILL_DEFAULTS])].filter(t=>BANK.some(q=>q.type===t)).slice(0,3);}
function learnHTML(type){
 const c=LEARN[type],label=TYPES[type][0];
 if(!c)return '<div class="learn-card"><section><h3>Cách làm</h3><p>'+esc(TYPES[type][1])+'</p></section></div>';
 return '<div class="learn-card"><section><h3>Là gì</h3><p>'+esc(c.what)+'</p></section><section><h3>Cách làm</h3><ol>'+c.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol></section><section class="learn-tip"><h3>Mẹo</h3><p>'+esc(c.tip)+'</p></section><section><h3>Ví dụ</h3>'+(c.example.quote?'<p>'+esc(c.example.quote)+'</p>':'')+'<p class="learn-right"><span aria-hidden="true">✓</span> <strong>Đúng:</strong> '+esc(c.example.right)+'</p><p class="learn-wrong"><span aria-hidden="true">✗</span> <strong>Sai:</strong> '+esc(c.example.wrong)+' ('+esc(c.example.why)+')</p></section></div>';
}
function learnCard(type){if(!TYPES[type])return;modal('Học nhanh: '+TYPES[type][0],learnHTML(type),'<button class="btn" data-action="close">Con hiểu rồi</button>');}
// On a second try the choices are shuffled so the answer is not remembered by position. The order is stored with the session.
function choiceOrder(){
 const q=currentQuestion(),base=q.choices.map((_,i)=>i);
 // A retry is a later copy of an id already earlier in the round.
 if(!DRILL_MODES.has(session.mode)||session.ids.indexOf(q.id)===session.index)return base;
 session.perm??={};if(!session.perm[session.index]){const o=base.map(i=>[Math.random(),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  // Never the original order, and the answer never stays in the same place.
  session.perm[session.index]=o.indexOf(q.answer)===q.answer?[...o.slice(1),o[0]]:o;}
 return session.perm[session.index];
}
// The gap filled with the right answer, so the finished sentence is seen once.
function filledSentence(q){return q.prompt.includes('______')?q.prompt.split('\n').pop().replace('______',q.choices[q.answer]):'';}
// Mastery = first-try accuracy on this type so far.
function masteryHTML(t){const s=typeStats(BANK,state).find(x=>x.type===t),left=BANK.filter(q=>q.type===t&&!state.answers[q.id]).length;return '<div class="mastery"><div class="mastery-top"><span>Thành thạo</span><strong>'+(s?s.percent+'% · '+s.correct+'/'+s.seen+' câu':'Chưa làm')+'</strong></div><div class="mastery-bar" role="progressbar" aria-label="Thành thạo '+esc(TYPES[t][0])+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(s?s.percent:0)+'"><i style="width:'+(s?s.percent:0)+'%"></i></div><small class="muted">Còn '+left+' câu mới</small></div>';}
function drillCardsHTML(){
 return '<div class="section-heading mt"><h2>Ôn dạng con hay sai</h2><span class="subtle">5 câu mỗi lượt, câu sai quay lại cuối lượt</span></div><div class="three-col">'+drillTypes().map(t=>'<section class="card drill-card"><h3>'+esc(TYPES[t][0])+'</h3>'+masteryHTML(t)+'<div class="button-row"><button class="btn ghost" data-action="learn" data-type="'+t+'">Học nhanh</button><button class="btn" data-action="start" data-mode="drill" data-type="'+t+'">Luyện</button></div></section>').join('')+'</div>';
}
function todayCardHTML(){
 const done=state.sessions.some(x=>x.mode==='today'&&x.date===dayKey()&&x.completed!==false),types=drillTypes();
 return '<section class="card today-card"><div><span class="tag orange">MỖI NGÀY 10 ĐẾN 15 PHÚT</span><h2>'+(done?'Hôm nay con đã ôn xong':'Ôn hôm nay')+'</h2><p>10 câu trộn '+types.map(t=>'<strong>'+esc(TYPES[t][0])+'</strong>').join(', ')+'. Dạng yếu nhất ra nhiều câu hơn, câu từng sai được ôn trước.</p></div><button class="btn today-btn" data-action="start" data-mode="today">'+(done?'Ôn thêm 10 câu':'Ôn hôm nay (10 câu)')+'</button></section>';
}
// Explorer ranks by total XP.
const RANKS=[[0,'Tập sự'],[60,'Người khám phá'],[160,'Thám hiểm viên'],[320,'Nhà thám hiểm'],[550,'Thuyền trưởng'],[900,'Huyền thoại']];
function rankOf(xp){const i=RANKS.findLastIndex(r=>xp>=r[0]),next=RANKS[i+1];return {name:RANKS[i][1],next:next?.[1]||null,need:next?next[0]-xp:0,progress:next?Math.round((xp-RANKS[i][0])/(next[0]-RANKS[i][0])*100):100};}
function rankHTML(){const r=rankOf(state.xp);return '<div class="rank-strip"><div class="mastery-top"><span>Cấp của con: <strong>'+r.name+'</strong> · '+state.xp+' XP</span><span class="muted">'+(r.next?'Còn '+r.need+' XP lên '+r.next:'Cấp cao nhất')+'</span></div><div class="mastery-bar" role="progressbar" aria-label="Tiến tới cấp tiếp theo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+r.progress+'"><i style="width:'+r.progress+'%"></i></div></div>';}
const MEDAL_SVG=c=>'<svg viewBox="0 0 48 56" width="56" height="64" aria-hidden="true"><path d="M14 2h8l6 16h-8zM34 2h-8l-6 16h8z" fill="#8E7CC3"/><circle cx="24" cy="34" r="17" fill="'+c[0]+'" stroke="'+c[1]+'" stroke-width="3"/><path d="M24 24l3 6.2 6.8 1-4.9 4.8 1.2 6.8L24 39.6l-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1z" fill="'+c[1]+'"/></svg>';
// End of a drill or today's review: 1 to 3 medals (bronze from any finish, silver from 70%, gold from 90% right on the first try).
function drillResultHTML(r){
 const acc=pct(r.correct,r.count),n=acc>=90?3:acc>=70?2:1,colors=[['#E8A86B','#9A5B22'],['#E3E7EC','#8A96A3'],['#FFD54A','#B98900']],names=['đồng','bạc','vàng'];
 return '<div class="finish drill-finish"><div class="finish-hero"><div class="finish-burst" aria-hidden="true">'+Array.from({length:12},(_,i)=>'<i style="--a:'+i*30+'deg"></i>').join('')+'</div><img class="finish-mascot" src="'+MASCOT[n>1?'correct':'try-again']+'" alt="" width="440" height="440"></div><h1>'+(n===3?'Tuyệt vời, huy chương vàng!':n===2?'Giỏi lắm, huy chương bạc!':'Hoàn thành lượt luyện!')+'</h1><p class="finish-sub">'+esc(r.label)+'</p>'+
 '<div class="medal-row" role="img" aria-label="Đạt '+n+' trên 3 huy chương, huy chương '+names[n-1]+'">'+[0,1,2].map(i=>'<span class="medal-slot'+(i<n?' won':'')+'">'+MEDAL_SVG(i<n?colors[i]:['#ECE7F1','#C9BFD6'])+'</span>').join('')+'</div>'+
 '<div class="finish-stats"><div class="fstat acc"><span>Đúng ngay</span><strong>'+r.correct+'/'+r.count+'</strong></div><div class="fstat xp"><span>XP nhận được</span><strong>'+ICONS.bolt+'+'+(r.xp||0)+'</strong></div><div class="fstat time"><span>Chuỗi dài nhất</span><strong>'+(r.bestStreak||0)+' câu</strong></div></div>'+
 (r.retryCorrect?'<p class="finish-note">Con đã sửa đúng '+r.retryCorrect+' câu ở lần làm lại.</p>':'')+
 (r.rankUp?'<p class="rank-up">Lên cấp mới: <strong>'+esc(r.rankUp)+'</strong></p>':'')+
 (r.newBadges?.length?'<p class="rank-up">Huy hiệu mới: <strong>'+r.newBadges.map(esc).join(', ')+'</strong></p>':'')+
 (n<3?'<p class="finish-note">'+(n===2?'Đúng ngay từ 90% để nhận huy chương vàng.':'Đúng ngay từ 70% để nhận huy chương bạc. Không sao, ôn thêm một lượt là nhớ hơn.')+'</p>':'')+
 '<div class="finish-actions"><button class="btn" data-action="start" data-mode="'+r.mode+'"'+(r.type?' data-type="'+r.type+'"':'')+'>Ôn tiếp</button><button class="btn secondary" data-page="practice">Về Luyện tập</button></div>'+
 (r.wrong?.length?resultTypesHTML(r):'')+'</div>';
}
