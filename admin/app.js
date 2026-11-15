'use strict';
const sections={sessions:'Сессии',talks:'Доклады',speakers:'Докладчики',days:'Дни',halls:'Залы',conference:'Конференция'};
const fields={
 conference:['title','venue','timeZone'],days:['date'],halls:['name'],speakers:['name','role','city','photoURL','bio'],
 sessions:['title','dayID','hallID','track','start','end','summary'],
 talks:['title','sessionID','order','start','end','speakerIDs','abstract']
};
const labels={title:'Название',name:'Имя или название',venue:'Место проведения',timeZone:'Часовой пояс',date:'Дата',city:'Город',photoURL:'Ссылка на фотографию (HTTPS)',role:'Регалии и должность',bio:'Биография',track:'Направление',start:'Начало',end:'Окончание',summary:'Описание сессии',abstract:'Описание доклада',order:'Порядок в сессии',speakerIDs:'Докладчики',dayID:'День',hallID:'Зал',sessionID:'Сессия'};
const refs={dayID:'days',hallID:'halls',sessionID:'sessions'};
const key='trek-program-editor-v3';
localStorage.removeItem('trek-program-editor-v2');
// Retire the draft cleared before the first PDF import.
localStorage.removeItem('trek-program-editor-v1');
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e};
const title=x=>x.title||x.name||x.date;
const time=n=>n==null?'':String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const minutes=s=>s?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
let data=JSON.parse(localStorage.getItem(key)||JSON.stringify(demo)), tab='sessions', editing;
if(data.title==='ТРЭК 2026' && data.timeZone==='Asia/Yekaterinburg' && !localStorage.getItem('trek-moscow-time-v1')){
 data.timeZone='Europe/Moscow';
 localStorage.setItem(key,JSON.stringify(data));
 localStorage.setItem('trek-moscow-time-v1','1');
}
for(const hall of data.halls){
 if(hall.id==='d099ddeb-ca35-4b4f-a183-a724e5f4260e' && hall.name==='ЧЕТВЕРГ')hall.name='Зал ВМВ';
 if(hall.name.trim().toUpperCase()==='АУДИТОРИЯ «')hall.name='Аудитория «Форум»';
}
fillSpeakerProfiles(data);
const dialog=document.querySelector('dialog'),form=document.querySelector('form');
function render(){
 const nav=document.querySelector('nav');nav.replaceChildren();
 for(const [id,label] of Object.entries(sections)){
  const b=node('button',label);b.setAttribute('aria-current',String(tab===id));b.onclick=()=>{tab=id;$('query').value='';render()};nav.append(b);
 }
 document.querySelector('h1').textContent=sections[tab];$('tools').style.display=tab==='conference'?'none':'flex';
 const list=$('list');list.replaceChildren();
 const lookup=(group,id)=>title(data[group].find(x=>x.id===id)||{});
 const rows=tab==='conference'?[data]:data[tab];
 for(const x of rows.filter(x=>title(x).toLocaleLowerCase().includes($('query').value.trim().toLocaleLowerCase()))){
  const b=node('button');b.className='row';b.append(node('strong',title(x)));
  const detail=tab==='sessions'?[lookup('days',x.dayID),time(x.start)+'–'+time(x.end),lookup('halls',x.hallID)]:tab==='talks'?[lookup('sessions',x.sessionID),time(x.start)||'Без времени',...x.speakerIDs.map(id=>lookup('speakers',id))]:[x.role||x.venue];
  const sub=detail.filter(Boolean).join(' · ');if(sub)b.append(node('small',sub));b.onclick=()=>edit(x);list.append(b);
 }
 if(!list.children.length)list.append(node('p','Записей не найдено.'));
}
function edit(x){
 editing=x;form.reset();$('fields').replaceChildren();$('error').textContent='';
 document.querySelector('h2').textContent=x?'Редактирование':'Новая запись';
 $('del').hidden=!x||tab==='conference';
 for(const k of fields[tab]){
  if(k==='speakerIDs'){
   const box=node('fieldset');box.append(node('legend',labels[k]));
   for(const p of data.speakers){const l=node('label');l.className='person';const i=node('input');i.type='checkbox';i.name=k;i.value=p.id;i.checked=!!x?.speakerIDs.includes(p.id);l.append(i,p.name);box.append(l)}
   $('fields').append(box);continue;
  }
  const l=node('label',labels[k]);let i;
  if(refs[k]){i=node('select');for(const item of data[refs[k]])i.add(new Option(title(item),item.id));if(x)i.value=x[k]}
  else{
   i=node(['summary','abstract','bio'].includes(k)?'textarea':'input');
   if(k==='date')i.type='date';
   if(k==='order'){i.type='number';i.min='0';i.step='1'}
   if(['start','end'].includes(k)){i.type='time';i.value=time(x?.[k])}
   else i.value=x?.[k]??(k==='order'?Math.max(-1,...data.talks.map(t=>t.order))+1:'');
  }
  i.name=k;i.required=!!refs[k]||['name','title','date','venue','timeZone','order'].includes(k)||(tab==='sessions'&&['start','end'].includes(k));
  l.append(i);$('fields').append(l);
 }
 dialog.showModal();
}
function validate(d){
 new Intl.DateTimeFormat('ru',{timeZone:d.timeZone});
 for(const s of d.sessions){
  if(s.end<=s.start)throw Error('Окончание сессии должно быть позже начала.');
  if(!d.days.some(x=>x.id===s.dayID)||!d.halls.some(x=>x.id===s.hallID))throw Error('Сначала перенесите связанные сессии в другой день или зал.');
 }
 for(const t of d.talks){
  const s=d.sessions.find(x=>x.id===t.sessionID);
  if(!s||t.speakerIDs.some(id=>!d.speakers.some(x=>x.id===id)))throw Error('Запись используется в докладе «'+t.title+'». Сначала измените его связи.');
  if((t.start!=null&&(t.start<s.start||t.start>=s.end))||(t.end!=null&&(t.start==null||t.end<=t.start||t.end>s.end)))throw Error('Проверьте время доклада «'+t.title+'» и границы его сессии.');
 }
}
function commit(remove=false){
 try{
  const next=structuredClone(data);
  if(remove)next[tab]=next[tab].filter(x=>x.id!==editing.id);
  else{
   const fd=new FormData(form);const updated={};
   for(const k of fields[tab]){
    const v=String(fd.get(k)??'').trim();
    if(form.elements.namedItem(k)?.required&&!v)throw Error('Заполните поле «'+labels[k]+'».');
    updated[k]=k==='speakerIDs'?fd.getAll(k):['start','end'].includes(k)?minutes(v):k==='order'?Number(v):v;
   }
   if(tab==='conference')Object.assign(next,updated);
   else if(editing)Object.assign(next[tab].find(x=>x.id===editing.id),updated);
   else next[tab].push({...updated,id:crypto.randomUUID()});
  }
  validate(next);localStorage.setItem(key,JSON.stringify(next));data=next;dialog.close();render();
 }catch(e){$('error').textContent=e instanceof RangeError?'Укажите часовой пояс, например Europe/Moscow.':e.message}
}
$('add').onclick=()=>edit(null);$('query').oninput=render;$('cancel').onclick=()=>dialog.close();
$('del').onclick=()=>{if(confirm('Удалить «'+title(editing)+'»?'))commit(true)};
form.onsubmit=e=>{e.preventDefault();commit()};
$('exportBtn').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='program.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
render();
