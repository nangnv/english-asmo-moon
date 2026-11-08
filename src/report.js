// Parent report email after each study session, sent by the Worker through Resend when RESEND_API_KEY and REPORT_EMAIL are set.
// Only sessions that are new in this save are reported, so a retry or a merge never sends the same session twice.
const escHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function newSessions(before,after,today=dayKey()){
 const seen=new Set((before?.sessions||[]).map(s=>s.id));
 const yesterday=new Date(today+'T12:00:00+07:00');yesterday.setUTCDate(yesterday.getUTCDate()-1);
 // Old sessions arriving from another device's backlog are not news; only today's and yesterday's are reported, at most 3.
 return (after?.sessions||[]).filter(s=>s.count>0&&!seen.has(s.id)&&(s.date===today||s.date===dayKey(yesterday))).slice(-3);
}
function reportEmail(bank,state,sessions,origin){
 const name=state.profile?.name||'Con',reports=sessions.map(s=>sessionReport(bank,s)),t=timeTotals(state),weak=weakTypes(bank,state).slice(0,3);
 const mins=s=>Math.round(s/60)+' phút';
 const lines=reports.map(r=>`• ${r.label}: đúng ${r.correct}/${r.count} câu (${r.percent}%), ${r.minutes} phút${r.completed?'':' (dừng sớm)'}.`+(r.types.length?`\n  Sai nhiều nhất: ${r.types.map(x=>x.label+' ('+x.count+')').join(', ')}.\n  Cách khắc phục: ${r.types[0].fix}`:'\n  Không có câu sai.'));
 const text=`${name} vừa học xong.\n\n${lines.join('\n\n')}\n\nThời gian học: hôm nay ${mins(t.today)}, tuần này ${mins(t.week)}, tháng này ${mins(t.month)}.\n`+(weak.length?`\nDạng bài cần luyện thêm (tính trên mọi buổi học):\n${weak.map(w=>`• ${w.label}: đúng ${w.percent}% trong ${w.seen} câu. ${TYPES[w.type][1]}`).join('\n')}\n`:'')+`\nXem bảng theo dõi: ${origin}/#dashboard\nCác con số đo trên câu luyện trong app, chưa phải điểm thi chuẩn hóa.`;
 const html=`<div style="font-family:Arial,sans-serif;color:#302638;max-width:560px"><h2 style="color:#6930B3">${escHTML(name)} vừa học xong</h2>`+reports.map(r=>`<div style="border:1px solid #E8E0EF;border-radius:12px;padding:12px 16px;margin:12px 0"><strong>${escHTML(r.label)}</strong><br>Đúng <strong>${r.correct}/${r.count}</strong> câu (${r.percent}%) · ${r.minutes} phút${r.completed?'':' · dừng sớm'}`+(r.types.length?`<p style="margin:8px 0 0">Sai nhiều nhất: ${r.types.map(x=>escHTML(x.label)+' ('+x.count+')').join(', ')}</p><p style="margin:6px 0 0;background:#FFF4D6;padding:8px;border-radius:8px"><strong>Cách khắc phục:</strong> ${escHTML(r.types[0].fix)}</p>`:'<p style="margin:8px 0 0">Không có câu sai.</p>')+`</div>`).join('')+`<p>Thời gian học: hôm nay <strong>${mins(t.today)}</strong>, tuần này <strong>${mins(t.week)}</strong>, tháng này <strong>${mins(t.month)}</strong>.</p>`+(weak.length?`<h3>Dạng bài cần luyện thêm</h3><ul>${weak.map(w=>`<li><strong>${escHTML(w.label)}</strong>: đúng ${w.percent}% trong ${w.seen} câu. ${escHTML(TYPES[w.type][1])}</li>`).join('')}</ul>`:'')+`<p><a href="${escHTML(origin)}/#dashboard" style="color:#6930B3">Xem bảng theo dõi</a></p><p style="color:#756B80;font-size:12px">Các con số đo trên câu luyện trong app, chưa phải điểm thi chuẩn hóa.</p></div>`;
 const subject=`${name} đã học xong: ${reports.map(r=>r.correct+'/'+r.count+' câu').join(', ')}`;
 return {subject,text,html};
}
async function sendReport(env,before,after,origin){
 if(!env.RESEND_API_KEY||!env.REPORT_EMAIL)return;
 const sessions=newSessions(before,after);if(!sessions.length)return;
 const bank=BANK.concat(Array.isArray(after.generated)?after.generated:[]),mail=reportEmail(bank,after,sessions,origin);
 try{
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.REPORT_FROM||'ASMO English <onboarding@resend.dev>',to:env.REPORT_EMAIL.split(',').map(s=>s.trim()).filter(Boolean),...mail}),signal:AbortSignal.timeout(15000)});
  // Logs carry only the status, never the address or the learner's data.
  if(!res.ok)console.log('report email failed',res.status);
 }catch(e){console.log('report email failed',e.name);}
}
