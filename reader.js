'use strict';
const el=(tag,text)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;return x};
const $=id=>document.getElementById(id);
function button(label,action){const b=el('button',label);b.onclick=action;return b}
const clock=n=>n==null?'':String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
let d,day,hall='',tab='Программа';
const saved=new Set(JSON.parse(localStorage.getItem('trek-plan')||'[]'));
function bookmark(id){return button(saved.has(id)?'✓ В моём плане':'+ В мой план',()=>{if(saved.has(id))saved.delete(id);else saved.add(id);localStorage.setItem('trek-plan',JSON.stringify([...saved]));render()})}
function drawSession(s,talks){const a=el('article'), e=el('details'), h=el('summary',s.title);
const hallName=d.halls.find(h=>h.id===s.hallID)?.name||'';
a.append(el('small',[d.days.find(x=>x.id===s.dayID)?.date,clock(s.start)+'–'+clock(s.end),hallName].join(' · ')),e,bookmark(s.id));e.append(h);
if(s.summary)e.append(el('p',s.summary));
for(const t of talks){const x=el('div');x.className='talk';x.append(el('small',clock(t.start)||'В порядке программы'),el('strong',t.title),el('small',d.speakers.filter(p=>t.speakerIDs.includes(p.id)).map(p=>p.name).join(', ')));if(t.abstract)x.append(el('p',t.abstract));x.append(bookmark(t.id));e.append(x)}
return a}
function render(){
 const tabs=$('tabs'),filters=$('filters'),list=$('list');tabs.replaceChildren();filters.replaceChildren();list.replaceChildren();$('heading').textContent=tab;
 for(const label of ['Программа','Спикеры','Мой план','Меню']){const b=button(label,()=>{tab=label;$('q').value='';render()});b.setAttribute('aria-pressed',String(tab===label));tabs.append(b)}
 const query=$('q').value.trim().toLowerCase(),matches=t=>t.toLowerCase().includes(query);$('q').hidden=tab==='Меню';
 if(tab==='Меню'){for(const [label,text,url] of [['Информация','XIII ежегодный трансрадиальный эндоваскулярный курс','https://trec-course.ru/'],['Место проведения','Отель Хаятт Ридженси, Ленинградский проспект, 36, стр. 33','https://maps.apple.com/?q=Хаятт+Ридженси+Москва'],['Спонсоры','Страница официальной программы','Sponsors.pdf'],['Новости','Материалы конференции','https://trec-course.ru/page/programme'],['Задать вопрос','info@trec-course.ru','mailto:info@trec-course.ru'],['Голосование','В разработке','']]){const a=el('article'),link=el(url?'a':'strong',label);if(url)link.href=url;a.append(link,el('p',text));list.append(a)}return}
 if(tab==='Программа'){
  for(const x of [...d.days].sort((a,b)=>a.date.localeCompare(b.date))){const b=button(new Date(x.date+'T12:00:00').toLocaleDateString('ru',{day:'numeric',month:'long'}),()=>{day=x.id;hall='';render()});b.setAttribute('aria-pressed',String(day===x.id));filters.append(b)}
  const select=el('select');select.setAttribute('aria-label','Зал');select.add(new Option('Все залы',''));for(const h of d.halls.filter(h=>d.sessions.some(s=>s.dayID===day&&s.hallID===h.id)))select.add(new Option(h.name,h.id));select.value=hall;select.onchange=()=>{hall=select.value;render()};filters.append(select)
 }
 if(tab==='Спикеры'){for(const p of [...d.speakers].sort((a,b)=>a.name.localeCompare(b.name,'ru')).filter(p=>matches(p.name))){const a=el('details');a.append(el('summary',p.name),el('p',[p.role,p.city,p.bio].filter(Boolean).join(' · ')));for(const t of d.talks.filter(t=>t.speakerIDs.includes(p.id)))a.append(el('p',t.title));list.append(a)}}
 else for(const s of [...d.sessions].sort((a,b)=>d.days.find(x=>x.id===a.dayID).date.localeCompare(d.days.find(x=>x.id===b.dayID).date)||a.start-b.start)){
  if(tab==='Программа'&&(s.dayID!==day||(hall&&s.hallID!==hall)))continue;
  let ts=d.talks.filter(t=>t.sessionID===s.id).sort((a,b)=>a.order-b.order);
  if(tab==='Мой план'&&!saved.has(s.id)){ts=ts.filter(t=>saved.has(t.id));if(!ts.length)continue}
  if(!matches(s.title)&&!ts.some(t=>matches(t.title)||d.speakers.some(p=>t.speakerIDs.includes(p.id)&&matches(p.name))))continue;
  list.append(drawSession(s,ts))
 }
 if(!list.children.length)list.append(el('p',tab==='Мой план'?'Сохраните сессию или доклад в программе.':'Записей не найдено.'))
}
$('q').oninput=()=>d&&render();fetch('program.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{d=data;day=[...d.days].sort((a,b)=>a.date.localeCompare(b.date))[0]?.id;render()}).catch(()=>{$('list').textContent='Не удалось загрузить программу. Обновите страницу.'});
