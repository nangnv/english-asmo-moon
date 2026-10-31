import re,json
from pathlib import Path
from pypdf import PdfReader
raw='\n'.join(p.extract_text() for p in PdfReader(Path(__file__).resolve().parents[1] / 'reference/asmo-grade6-practice.pdf').pages[:5])
raw=re.sub(r'ASMO English Practice – Grade 6 – Page \d+','',raw)
starts=[]
expected=1
for match in re.finditer(r'(?m)^(\d+)\. ',raw):
 if int(match.group(1))==expected:
  starts.append(match)
  expected+=1
keys='BBBCDACCBA CABDBCBABB ABCB BDBB'.replace(' ','')
answers=['B','B','B','C','D','A','C','C','B','A','C','A','B','D','B','C','B','A','B','B','A','B','C','B','B','D','B','B','B','C','B','C','A','C','B','A','C','C','C','B']
exps=[
'Enormous = huge: rất lớn. Tiny mang nghĩa ngược lại.',
'Reliable = dependable: đáng tin cậy. Count on someone = tin cậy ai.',
'Generous là hào phóng; trái nghĩa là selfish (ích kỷ).',
'Cụm cố định là make a decision: đưa ra quyết định.',
'Compass là la bàn, một dụng cụ; ba từ còn lại chỉ hiện tượng thiên nhiên nguy hiểm.',
'Proofread = đọc soát lỗi, phù hợp với spelling mistakes.',
'Necessary viết với một c và hai s. Mẹo: one collar, two sleeves.',
'Abandoned = bị bỏ hoang, không còn người ở.',
'Over the moon = rất vui. Under the weather = không khỏe.',
'Terrified = rất sợ hãi, phù hợp phản ứng khi thấy nhện bò tới.',
'Hành động tàu rời xảy ra trước lúc chúng tôi đến trong quá khứ: had already left.',
'Điều kiện loại 1: If + hiện tại đơn, will + động từ. Chủ ngữ it nên rains.',
'Neither…nor: động từ theo chủ ngữ gần nhất. The teacher số ít nên was.',
'Whose diễn tả sở hữu: chiếc xe đạp của cậu bé.',
'For + khoảng thời gian (five years); since + mốc thời gian.',
'Câu hỏi gián tiếp dùng trật tự câu kể; trong cách lùi thì của bài này, did buy chuyển thành had bought.',
'Bị động với động từ khuyết thiếu: must + be + quá khứ phân từ → must be finished.',
'So sánh hai người: taller than. So sánh nhất trong cả lớp: the best.',
'Trong look forward to, to là giới từ nên theo sau bởi V-ing: hearing.',
'Let’s có dấu nháy; lời nói trực tiếp có dấu phẩy trước dấu đóng ngoặc kép; Mum viết hoa.',
'Worker bees là chủ ngữ số nhiều, dùng collect ở hiện tại đơn.',
'Where thay cho địa điểm the hive: nơi mật hoa được biến thành mật ong.',
'Despite + cụm danh từ their small size. Although cần một mệnh đề đầy đủ.',
'Which thay cho hành động mang phấn hoa trong mệnh đề trước.',
'Chủ ngữ chính là one (một phần trong ba phần), nên động từ là depends.',
'Câu sau nói số lượng ong giảm: Unfortunately (đáng tiếc) báo hiệu tin xấu.',
'To + động từ diễn tả mục đích: trồng vườn để giúp ong.',
'Cụm cố định make a difference: tạo ra sự khác biệt.',
'Đoạn đầu nói hạn hán khiến mùa màng thất bát và gia đình không trả nổi học phí.',
'William thấy hình cối xay gió trên bìa sách Using Energy ở thư viện.',
'Scarce = khan hiếm, khó tìm thấy; gắn với bối cảnh thiếu thức ăn.',
'Dân làng cười và gọi cậu là điên, cho thấy ban đầu họ không tin dự án thành công.',
'Thứ tự: đọc sách → bóng đèn sáng → nhà báo đến → tốt nghiệp đại học.',
'William tự học và kiên trì vượt khó: đó là thông điệp bao quát của cả bài.',
'Thông báo ghi rõ readers aged 8–13.',
'Bản nhập đã đổi before thành by 15 June để tránh mâu thuẫn đáp án trong PDF. By bao gồm ngày 15/6.',
'Sau mỗi quyển, người đọc viết review dài 50–100 từ vào Reading Passport.',
'12 quyển đạt mốc 10 nhưng chưa đạt mốc 15: certificate + £10 voucher.',
'Thông báo cho phép audiobooks nhưng tối đa ba quyển.',
'Mục đích chung là khuyến khích trẻ đọc sách trong mùa hè; giải thưởng là động lực phụ.'
]
honey=raw[raw.index('Honeybees are'):raw.index('21. (21)')].strip()
wind=raw[raw.index('When William'):raw.index('29. Why')].strip()
notice=raw[raw.index('GREENWOOD PUBLIC'):raw.index('35. Who')].strip().replace('before 15 June','by 15 June').replace('\x7f','•')
bank=[]
for i,m in enumerate(starts):
 n=int(m.group(1))
 if n>40: continue
 chunk=raw[m.end():starts[i+1].start() if i+1<len(starts) else len(raw)]
 opts=list(re.finditer(r'(?m)^([ABCD])\.\s*',chunk))
 if len(opts)!=4: raise Exception((n,len(opts)))
 question=chunk[:opts[0].start()].strip()
 choices=[]
 for j,o in enumerate(opts):
  value=chunk[o.end():opts[j+1].start() if j<3 else len(chunk)].strip()
  if j==3:
   value=re.split(r'\n(?:PART |Passage \d|GREENWOOD PUBLIC|ANSWER)',value)[0].strip()
  choices.append(value)
 category='vocab' if n<=10 else 'grammar' if n<=20 else 'cloze' if n<=28 else 'reading'
 passage=honey if 21<=n<=28 else wind if 29<=n<=34 else notice if n>=35 else ''
 bank.append(dict(id=f'pdf-{n}',category=category,prompt=question,choices=choices,answer=ord(answers[n-1])-65,explanation=exps[n-1],passage=passage,source='PDF luyện lớp 6 · câu '+str(n),level=2 if n>10 else 1))
Path('src/bank.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2))
print('Imported',len(bank),'questions; Q36 wording corrected, original source preserved.')
