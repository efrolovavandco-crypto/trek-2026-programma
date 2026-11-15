'use strict';
function parseProgram(text, fallback, base) {
 if(/ТРАНСРАДИАЛЬНЫЙ ЭНДОВАСКУЛЯРНЫЙ КУРС/i.test(text)&&/\d{4}\s*•/.test(text))return parseTimedCourse(text,fallback,base);
 const result=structuredClone(base), added={days:[],halls:[],sessions:[],talks:[],speakers:[]};
 const push=(group,obj)=>{const x={id:crypto.randomUUID(),...obj};result[group].push(x);added[group].push(x);return x};
 let date=fallback, hall=null,session=null,talk=null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Выберите дату для страниц без даты.');
 const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 for(const raw of text.split(/\r?\n/)){
  let line=raw.trim();if(!line)continue;
  const d=line.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  const m=line.toLowerCase().match(/^(\d{1,2})\s+([а-я]+)(?:\s+(\d{4}))?(?:\s*г\.?)?$/);
  if(d||(m&&months.includes(m[2]))){
   date=d?d[3]+'-'+d[2].padStart(2,'0')+'-'+d[1].padStart(2,'0'):(m[3]||fallback.slice(0,4))+'-'+String(months.indexOf(m[2])+1).padStart(2,'0')+'-'+m[1].padStart(2,'0');
   if(new Date(date).toISOString().slice(0,10)!==date)throw Error('Некорректная дата '+date);
   session=null;talk=null;continue;
  }
  if(/^зал\s*[:«]/i.test(line)){const name=line.replace(/^зал\s*:?\s*/i,'');hall=result.halls.find(h=>h.name===name)||push('halls',{name});session=null;talk=null;continue}
  if(/^(докладчики|спикеры|авторы):/i.test(line)){
   if(!talk)continue;
   for(const name of line.replace(/^[^:]+:/,'').split(/;|,/).map(s=>s.trim()).filter(Boolean)){
    const p=result.speakers.find(p=>p.name===name)||push('speakers',{name,role:'',bio:''});if(!talk.speakerIDs.includes(p.id))talk.speakerIDs.push(p.id);
   }continue;
  }
  const timing=line.match(/^(\d{1,2}[:.]\d{2})(?:\s*[–—-]\s*(\d{1,2}[:.]\d{2}))?\s*/);
  const minute=s=>{const [h,m]=s.split(/[:.]/).map(Number);if(h>23||m>59)throw Error('Некорректное время '+s);return h*60+m};
  const start=timing?minute(timing[1]):null,end=timing?.[2]?minute(timing[2]):null;
  if(timing)line=line.slice(timing[0].length);
  const heading=/^(сессия|заседание|симпозиум)(?=\s|:|$)/i;
  const standalone=/^(регистрация|открытие|перерыв|обед|закрытие)(?=\s|:|$)/i.test(line);
  const explicit=heading.test(line);
  if(explicit || (timing && standalone) || (!session && (timing || /^доклад:/i.test(line)))){
   if(start==null||end==null||end<=start)throw Error('Для строки «'+raw.trim()+'» нужен интервал сессии. Укажите начало и окончание этой строки или вставьте выше заголовок, например «09:00–10:00 Сессия: Практикум».');
   hall??=result.halls[0]||push('halls',{name:'Основной зал'});
   const day=result.days.find(x=>x.date===date)||push('days',{date});
   const title=line.replace(heading,'').replace(/^\s*:\s*/,'').trim();
   if(!title)throw Error('Добавьте название в строке «'+raw.trim()+'».');
   session=push('sessions',{title:title.replace(/^доклад:\s*/i,''),dayID:day.id,hallID:hall.id,track:'',summary:'',start,end});talk=null;
   if(explicit)continue;
   if(standalone){session=null;continue}
   talk=push('talks',{title:session.title,sessionID:session.id,abstract:'',speakerIDs:[],order:0,start,end});
   session=null;
  }else if(timing||/^доклад:/i.test(line)){
   talk=push('talks',{title:line.replace(/^доклад:\s*/i,''),sessionID:session.id,abstract:'',speakerIDs:[],order:result.talks.filter(t=>t.sessionID===session.id).length,start,end});
  }else if(talk)talk.abstract+=(talk.abstract?'\n':'')+line;
  else if(session)session.summary+=(session.summary?'\n':'')+line;
 }
 if(!added.sessions.length)throw Error('Сессии не найдены. Проверьте формат строк по примеру.');
 validate(result);return {result,added};
}
function parseTimedCourse(text, fallback, base) {
 const result=structuredClone(base);
 const added={days:[],halls:[],sessions:[],talks:[],speakers:[]};
 function add(group, fields) {
  const entry={id:crypto.randomUUID(),...fields};
  result[group].push(entry); added[group].push(entry);
  return entry;
 }
 let date=fallback, hallName='Основной зал', current=null;
 const entries=[];
 const months='января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split(' ');
 for(const raw of text.split('\n')){
  const line=raw.trim().replace(/\s+/g,' ');
  if(!line || /^(?:WWW\.|XIII ТРАНСРАДИАЛЬНЫЙ|ПРОГРАММА$|\d+$|PAGE \d+$)/i.test(line))continue;
  const header=line.match(/^(\d+) ([А-Яа-я]+) (\d{4})\s*•\s*[^•]+?(?:\s*•\s*(.+?)(?=\s+\d{1,2} [А-Я]+ \d{4}|$)|$)/u);
  if(header){
   const month=months.indexOf(header[2].toLowerCase())+1;
   const previousDate=date;
   if(month)date=header[3]+'-'+String(month).padStart(2,'0')+'-'+header[1].padStart(2,'0');
   const headerParts=line.split(/\s*•\s*/);
   const room=headerParts.slice(2).map(part=>part.split(/\s+\d{1,2}\s+[А-Я]+\s+\d{4}/u)[0].trim()).find(part=>/зал|аудитория/i.test(part));
   if(room?.toUpperCase()==='АУДИТОРИЯ «' && /Ф\s*(?:Ф\s*)?ОРУМ»/i.test(line)){
    hallName='Аудитория «Форум»';
    continue;
   }
   if(date==="2026-06-18" && !room){hallName="Зал ВМВ";continue}
   hallName=room || (previousDate!==date || /\d{4}.*\d{4}/.test(line)?'Зал не указан':hallName);
   continue;
  }
  const timed=line.match(/^(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})\s+(.+)/);
  if(timed){
   current={date,hallName,start:minutes(timed[1]),end:minutes(timed[2]),title:timed[3],lines:[]};
   entries.push(current);
  }else if(current)current.lines.push(line);
 }
 const containers=entries.filter(e=>/^(?:[IVX]+\s+СЕССИЯ|ПЛЕНАРНОЕ ЗАСЕДАНИЕ|САТЕЛЛИТНЫЙ СИМПОЗИУМ)/i.test(e.title)
  ||entries.some(other=>other!==e&&other.date===e.date&&other.hallName===e.hallName&&other.start>=e.start&&other.end<=e.end&&(other.start>e.start||other.end<e.end)));
 const sessions=new Map();
 function makeSession(e){
  const day=result.days.find(d=>d.date===e.date)||add('days',{date:e.date});
  const hall=result.halls.find(h=>h.name.toLowerCase()===e.hallName.toLowerCase())||add('halls',{name:e.hallName});
  let split=e.lines.findIndex(l=>/^(ведущ|председател|модератор|\(продолжительность)/i.test(l));
  if(split<0)split=e.lines.length;
  return add('sessions',{dayID:day.id,hallID:hall.id,start:e.start,end:e.end,title:[e.title,...e.lines.slice(0,split)].join(' '),summary:e.lines.slice(split).join('\n'),track:''});
 }
 // Explicit session headings take precedence over a long, overlapping talk.
 const named=containers.filter(e=>/^(?:[IVX]+\s+СЕССИЯ|ПЛЕНАРНОЕ ЗАСЕДАНИЕ|САТЕЛЛИТНЫЙ СИМПОЗИУМ)/i.test(e.title));
 const parents=containers.filter(e=>named.includes(e)||!named.some(s=>s.date===e.date&&s.hallName===e.hallName&&s.start<=e.start&&s.end>=e.end));
 for(const e of parents)sessions.set(e,makeSession(e));
 for(const e of entries){
  if(sessions.has(e))continue;
  const parent=parents.filter(s=>s.date===e.date&&s.hallName===e.hallName&&s.start<=e.start&&s.end>=e.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
  if(!parent){makeSession(e);continue}
  const speakerIDs=[], continuation=[];
  for(const l of e.lines){
   const name=/^(?:[А-ЯЁ][а-яё-]+\s+[А-ЯЁ]\.\s*(?:[А-ЯЁ]\.)?|\p{Lu}[\p{Ll}’-]+\s+\p{Lu}[\p{Ll}’-]+)$/u.test(l);
   if(name){const p=result.speakers.find(p=>p.name===l)||add('speakers',{name:l,role:'',bio:''});speakerIDs.push(p.id)}
   else continuation.push(l);
  }
  add('talks',{sessionID:sessions.get(parent).id,title:[e.title,...continuation].join(' '),abstract:'',start:e.start,end:e.end,order:0,speakerIDs});
 }
 result.sessions.sort((a,b)=>result.days.find(d=>d.id===a.dayID).date.localeCompare(result.days.find(d=>d.id===b.dayID).date)||a.start-b.start);
 added.sessions.sort((a,b)=>result.sessions.indexOf(a)-result.sessions.indexOf(b));
 for(const s of added.sessions)added.talks.filter(t=>t.sessionID===s.id).sort((a,b)=>a.start-b.start).forEach((t,i)=>{t.order=i});
 validate(result);return {result,added};
}

let pending=null,pdfBusy=false;
const pdfDialog=$('pdfDialog');
$('pdfBtn').onclick=()=>{pdfDialog.showModal();$('pdfDate').value=data.days[0]?.date||''};
$('pdfClose').onclick=()=>pdfDialog.close();
function invalidatePDF(){pending=null;$('pdfApply').disabled=true;$('pdfPreview').replaceChildren()}
$('pdfText').oninput=invalidatePDF;$('pdfDate').oninput=invalidatePDF;
$('pdfFile').onchange=async()=>{
 invalidatePDF();const file=$('pdfFile').files[0];if(!file)return;
 pdfBusy=true;$('pdfParse').disabled=true;$('pdfFile').disabled=true;$('pdfText').value='';
 let pdf;
 try{
  $('pdfStatus').textContent='Читаем PDF…';
  pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
   $('pdfStatus').textContent='Страница '+i+' из '+pdf.numPages;
   const content=await (await pdf.getPage(i)).getTextContent();
   const rows=[];
   for(const item of content.items){
    if(!item.str)continue;
    let row=rows.find(r=>Math.abs(r.y-item.transform[5])<3);
    if(!row){row={y:item.transform[5],items:[]};rows.push(row)}row.items.push(item);
   }
   pages.push(rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n'));
  }
  $('pdfText').value=pages.join('\n\n');
  $('pdfStatus').textContent=pages.join('').trim()?'Текст извлечён. Проверьте порядок строк и нажмите «Распознать».':'В PDF нет текстового слоя. Для скана требуется OCR. Можно вставить распознанный текст вручную.';
 }catch(e){$('pdfStatus').textContent='Не удалось прочитать PDF. '+e.message}
 finally{if(pdf)await pdf.destroy();pdfBusy=false;$('pdfParse').disabled=false;$('pdfFile').disabled=false}
};
$('pdfParse').onclick=()=>{
 invalidatePDF();try{
  pending=parseProgram($('pdfText').value,$('pdfDate').value,data);
  for(const s of pending.added.sessions){
   const card=node('div');card.className='row';card.append(node('strong',time(s.start)+'–'+time(s.end)+' '+s.title));
   for(const t of pending.added.talks.filter(t=>t.sessionID===s.id).sort((a,b)=>a.order-b.order))card.append(node('small',(time(t.start)||'Без времени')+' · '+t.title+' · '+t.speakerIDs.map(id=>title(pending.result.speakers.find(p=>p.id===id))).join(', ')));
   $('pdfPreview').append(card);
  }
  $('pdfStatus').textContent='Готово: сессий '+pending.added.sessions.length+', докладов '+pending.added.talks.length+'. Проверьте результат ниже.';
  $('pdfApply').disabled=false;
 }catch(e){$('pdfStatus').textContent=e.message}
};
$('pdfApply').onclick=()=>{
 if(!pending||pdfBusy)return;
 try{fillSpeakerProfiles(pending.result);validate(pending.result);localStorage.setItem(key,JSON.stringify(pending.result));data=pending.result;invalidatePDF();pdfDialog.close();tab='sessions';render()}
 catch(e){$('pdfStatus').textContent='Не удалось сохранить: '+e.message}
};
