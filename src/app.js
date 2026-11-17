import { lumoSvg } from './figure.js';
import { SAYINGS } from './sayings.js';
import { getMedia, setMedia, resizeImage } from './media.js';
import { pushState, enablePush, disablePush, testPush, ensureRegistered, isIOS, FN_URL } from './push.js';
import { parseICS, expandICS, toSpotziEvents } from './ics.js';
import { SUPABASE_KEY } from './config.js';

export function startApp(ctx){
const USERS=ctx.users;
const CATS={
  sevi_privat:{priv:true,label:USERS.sevi.name,owner:'sevi',v:'--c-sevi',sym:''},
  sie_privat:{priv:true,label:USERS.sie.name,owner:'sie',v:'--c-her',sym:''},
  gemeinsam:{label:'Beide',owner:'both',v:'--c-both',sym:'♥ '},
  filmen:{label:'Filmen',owner:'sevi',v:'--c-film',sym:'🎬 '}
};
const PICK={sevi:[['sevi_privat',USERS.sevi.name],['gemeinsam','Beide'],['filmen','Filmen']],sie:[['sie_privat',USERS.sie.name],['gemeinsam','Beide']]};
if(!ctx.filmen)PICK.sevi=PICK.sevi.filter(p=>p[0]!=='filmen');
const REM_PRESETS=[[0,'Zum Termin'],[5,'5 Min vorher'],[15,'15 Min vorher'],[30,'30 Min vorher'],[60,'1 Std vorher'],[120,'2 Std vorher'],[1440,'1 Tag vorher'],[2880,'2 Tage vorher'],[10080,'1 Woche vorher']];
const REPEAT={none:'Nie',daily:'Täglich',weekly:'Wöchentlich',biweekly:'Alle 2 Wochen',monthly:'Monatlich',yearly:'Jährlich'};
const NAG={0:'Nein',1:'1× erneut nach 10 Min',2:'2× erneut, alle 10 Min',99:'Alle 15 Min bis zum Termin'};
const CATALOG=[
 ['Obst & Gemüse',[['Äpfel','🍎'],['Bananen','🍌'],['Tomaten','🍅'],['Gurke','🥒'],['Zwiebeln','🧅'],['Knoblauch','🧄'],['Kartoffeln','🥔'],['Salat','🥬'],['Paprika','🫑'],['Karotten','🥕'],['Zitronen','🍋'],['Avocado','🥑']]],
 ['Milch & Eier',[['Milch','🥛'],['Eier','🥚'],['Butter','🧈'],['Käse','🧀'],['Joghurt','🥣']]],
 ['Brot & Gebäck',[['Brot','🍞'],['Brötchen','🥯'],['Croissants','🥐']]],
 ['Fleisch & Fisch',[['Hähnchen','🍗'],['Hackfleisch','🥩'],['Lachs','🐟'],['Würstchen','🌭']]],
 ['Vorrat',[['Nudeln','🍝'],['Reis','🍚'],['Mehl','🌾'],['Kaffee','☕'],['Tee','🫖'],['Olivenöl','🫒'],['Müsli','🥣']]],
 ['Getränke',[['Wasser','💧'],['Saft','🧃'],['Bier','🍺'],['Wein','🍷']]],
 ['Haushalt',[['Klopapier','🧻'],['Spülmittel','🧽'],['Müllbeutel','🗑️'],['Waschmittel','🧺']]],
 ['Drogerie',[['Zahnpasta','🪥'],['Duschgel','🧴'],['Shampoo','🧴']]]
];
const ICON={},CATOF={};CATALOG.forEach(([c,items])=>items.forEach(([n,i])=>{ICON[n]=i;CATOF[n]=c}));

const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const fromIso=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=fromIso(s);d.setDate(d.getDate()+n);return iso(d)};
const dayNum=s=>{const[y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/864e5};
const TODAY=iso(new Date());
const toMin=t=>{const[h,m]=t.split(':').map(Number);return h*60+m};
const fromMin=n=>{n=Math.max(0,Math.min(n,23*60+59));return pad(Math.floor(n/60))+':'+pad(n%60)};
function isoWeek(s){const d=fromIso(s);d.setHours(12);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const w1=new Date(d.getFullYear(),0,4,12);return 1+Math.round(((d-w1)/864e5-3+(w1.getDay()+6)%7)/7)}
function T(ev,d){const y=fromIso(d||ev.date).getFullYear();
  if(ev.kind==='bday')return '🎂 '+ev.title+(ev.year?' wird '+(y-ev.year):'');
  if(ev.kind==='anniv')return '💍 '+ev.title+(ev.year?' · '+(y-ev.year)+'. Jahrestag':'');
  return ev.title}
const LUMO=SAYINGS;
const dayOfYear=()=>{const n=new Date();return Math.floor((n-new Date(n.getFullYear(),0,0))/864e5)};
let lumoIdx=null;
function lumoToday(){return lumoIdx===null?(dayOfYear()-1)%LUMO.length:lumoIdx}
function renderSpotzi(){
  const [txt,mood,topic,q]=LUMO[lumoToday()];
  const note=(S.notes||{})[TODAY];
  return `<div class="section-title">Spotzi sagt<span>${topic}</span></div><div class="card">
   <div class="lumo"><div id="lumo-fig">${lumoSvg(mood)}</div><div class="bubble">${esc(txt)}</div></div>
   <p class="lumo-q"><b>Zum Nachdenken:</b> ${esc(q)}</p>
   ${note?`<div class="lumo-note">${esc(note)}</div>`:''}
   <div class="lumo-btns"><button data-lumo="breathe">Durchatmen</button><button data-lumo="note">${note?'Notiz ändern':'Gedanken notieren'}</button><button data-lumo="next">Noch ein Gedanke</button></div></div>`;
}
function openBreathe(){
  openSheet(`<div class="breathe-wrap breathing">${lumoSvg('calm')}<div class="breathe-txt" id="btxt">Einatmen …</div><div class="hint" id="bcount">Atme mit Spotzi: 4 Sekunden ein, 4 Sekunden aus.</div></div>
  <p class="hint" style="text-align:center">Wenn Angst oder Stress dich länger stark belasten, sprich mit jemandem, dem du vertraust, oder hol dir professionelle Unterstützung.</p>
  <div class="btns"><button class="btn primary" id="bdone">Fertig</button></div>`,sh=>{
    let n=0;const t=setInterval(()=>{const el=document.getElementById('btxt');if(!el){clearInterval(t);return}n++;el.textContent=n%2?'Ausatmen …':'Einatmen …';if(n>=12){clearInterval(t);el.textContent='Gut gemacht.'}},4000);
    sh.querySelector('#bdone').onclick=()=>{clearInterval(t);closeSheet()};
  });
}
function openNote(){
  const q=LUMO[lumoToday()][3];S.notes=S.notes||{};
  openSheet(`<h3>Gedanken notieren</h3><p class="hint" style="margin-top:-6px">${esc(q)}</p><div class="field"><textarea class="inp" id="nt" rows="5" placeholder="Nur für dich sichtbar">${esc(S.notes[TODAY]||'')}</textarea></div><div class="btns"><button class="btn primary" id="nok">Speichern</button></div>`,sh=>{
    const ta=sh.querySelector('#nt');setTimeout(()=>ta.focus(),50);
    sh.querySelector('#nok').onclick=()=>{const v=ta.value.trim();if(v)S.notes[TODAY]=v;else delete S.notes[TODAY];save();closeSheet();render();toast('Notiz gespeichert')};
  });
}
const CHORE_TPL=[['Küche putzen','🍳',2,'w'],['Bad putzen','🛁',1,'w'],['Staubsaugen','🧹',1,'w'],['Bettwäsche wechseln','🛏️',2,'w'],['Handtücher waschen','🧺',1,'w'],['Altpapier raus','♻️',2,'w'],['Pflanzen gießen','🪴',3,'d'],['Kühlschrank auswischen','🧊',1,'m'],['Kaffeemaschine entkalken','☕',1,'m'],['Fenster putzen','🪟',3,'m']];
const UNIT={d:['Tag','Tage'],w:['Woche','Wochen'],m:['Monat','Monate']};
const everyLabel=c=>c.every===1?'Jede '+(c.unit==='d'?'n Tag':UNIT[c.unit][0]).replace('Jede n Tag','Jeden Tag'):'Alle '+c.every+' '+UNIT[c.unit][1];
function addInterval(d,c){const x=fromIso(d);if(c.unit==='d')x.setDate(x.getDate()+c.every);if(c.unit==='w')x.setDate(x.getDate()+7*c.every);if(c.unit==='m')x.setMonth(x.getMonth()+c.every);return iso(x)}
const intervalDays=c=>c.unit==='d'?c.every:c.unit==='w'?7*c.every:30*c.every;
const choreWho=c=>c.assign==='alt'?USERS[c.next].name+' ist dran':c.assign==='both'?'Beide':USERS[c.assign].name;
const choreMine=c=>c.assign==='both'||(c.assign==='alt'?c.next===S.user:c.assign===S.user);
function choreRow(c){
  const left=dayNum(c.due)-dayNum(TODAY);const used=Math.min(1,Math.max(0,(dayNum(TODAY)-dayNum(c.last))/intervalDays(c)));
  const st=left<0?`<span class="over">${-left} ${-left===1?'Tag':'Tage'} überfällig</span>`:left===0?'<span class="over">Heute fällig</span>':left===1?'Morgen fällig':`In ${left} Tagen`;
  const ago=dayNum(TODAY)-dayNum(c.last);
  return `<div class="chore"><div class="ico">${c.icon||'✨'}</div><button class="cbody" data-chore="${c.id}"><div class="t">${esc(c.title)}</div><div class="meta"><span class="pill">${choreWho(c)}</span><span>${everyLabel(c)}</span><span>${st}</span></div><div class="meta">Zuletzt ${ago===0?'heute':ago===1?'gestern':'vor '+ago+' Tagen'}${c.lastBy?' von '+USERS[c.lastBy].name:''}</div><div class="bar"><i class="${left<0?'late':left<=1?'warn':''}" style="width:${Math.round(used*100)}%"></i></div></button>
   <button class="donebtn${left<=0?' due':''}" data-cdone="${c.id}">Erledigt</button></div>`;
}
let houseFilter='alle';
function renderHouse(){
  S.chores=S.chores||[];S.choreLog=S.choreLog||[];
  const wk=S.choreLog.filter(l=>dayNum(TODAY)-dayNum(l.d)<7);
  let list=[...S.chores].sort((a,b)=>a.due<b.due?-1:1);if(houseFilter==='mir')list=list.filter(choreMine);
  return `<div class="fair"><div><b>${wk.filter(l=>l.by==='sevi').length}</b><span>${esc(USERS.sevi.name)}, letzte 7 Tage</span></div><div><b>${wk.filter(l=>l.by==='sie').length}</b><span>${esc(USERS.sie.name)}, letzte 7 Tage</span></div></div>
  <div class="filters" role="group" aria-label="Filter">${[['alle','Alle'],['mir','Für mich']].map(([k,l])=>`<button class="chip" data-hfilter="${k}" aria-pressed="${houseFilter===k}">${l}</button>`).join('')}</div>
  <div class="todos">${list.map(choreRow).join('')||'<div class="empty">Noch keine Haushaltsaufgaben. Wähle unten eine Vorlage oder tippe auf +.</div>'}</div>
  <div class="section-title">Vorlagen<span>antippen zum Hinzufügen</span></div>
  <div class="tpls">${CHORE_TPL.map(([n,i,e,u],k)=>`<button data-tpl="${k}">${i} ${n}</button>`).join('')}</div>
  <p class="hint">Haushaltsaufgaben sind getrennt von To-dos und sehen beide. Bei „Abwechselnd“ wechselt Spotzi nach jedem Erledigen automatisch, wer dran ist.</p>`;
}
function doneChore(id){
  const c=S.chores.find(x=>x.id===id);if(!c)return;const prev={last:c.last,due:c.due,next:c.next,lastBy:c.lastBy};
  c.last=TODAY;c.lastBy=S.user;c.due=addInterval(TODAY,c);if(c.assign==='alt')c.next=c.next==='sevi'?'sie':'sevi';
  S.choreLog=S.choreLog||[];const log={id:uid(),chore:id,by:S.user,d:TODAY};S.choreLog.push(log);save();render();
  toast(c.title+' erledigt. Nächstes Mal: '+dueLabel(c.due)+(c.assign==='alt'?', '+USERS[c.next].name+' ist dran':''),()=>{Object.assign(c,prev);S.choreLog=S.choreLog.filter(l=>l!==log);save();render()});
}
function openChore(c,tpl){
  const isNew=!c;
  const f=c?JSON.parse(JSON.stringify(c)):{id:uid(),title:tpl?tpl[0]:'',icon:tpl?tpl[1]:'✨',every:tpl?tpl[2]:1,unit:tpl?tpl[3]:'w',assign:'alt',next:S.user,remind:true,rtime:'18:00',last:null,due:TODAY};
  const ICONS=['✨','🍳','🛁','🧹','🛏️','🧺','♻️','🪴','🧊','☕','🪟','🚗','🐾','🗑️','🧽','📦'];
  const seg=(name,opts,val)=>opts.map(([k,l])=>`<button type="button" data-${name}="${k}" aria-pressed="${val===k}">${l}</button>`).join('');
  openSheet(`<h3>${isNew?'Neue Haushaltsaufgabe':'Aufgabe bearbeiten'}</h3>
  <div class="field"><label for="c-title">Aufgabe</label><input class="inp" id="c-title" value="${esc(f.title)}" placeholder="z. B. Küche putzen"></div>
  <div class="field"><span class="lbl">Symbol</span><div class="tpls" id="c-icons" style="flex-wrap:wrap">${ICONS.map(i=>`<button type="button" data-icon="${i}" aria-pressed="${f.icon===i}" style="${f.icon===i?'border-color:var(--accent);border-width:2px':''}">${i}</button>`).join('')}</div></div>
  <div class="field"><span class="lbl">Wie oft?</span><div class="row"><input type="number" min="1" max="52" class="inp" id="c-every" value="${f.every}" aria-label="Anzahl"><select class="inp" id="c-unit" aria-label="Einheit"><option value="d"${f.unit==='d'?' selected':''}>Tage</option><option value="w"${f.unit==='w'?' selected':''}>Wochen</option><option value="m"${f.unit==='m'?' selected':''}>Monate</option></select></div></div>
  <div class="field"><span class="lbl">Wer macht es?</span><div class="seg vseg" id="c-ass">${seg('cass',[['alt','Abwechselnd'],['sevi',USERS.sevi.name],['sie',USERS.sie.name],['both','Beide']],f.assign)}</div></div>
  <div class="field"><label for="c-due">Nächstes Mal fällig</label><input type="date" class="inp" id="c-due" value="${f.due}"></div>
  <div class="setting"><div><span>Erinnerung am Fälligkeitstag</span></div><button type="button" class="switch" role="switch" id="c-rem" aria-checked="${f.remind}" aria-label="Erinnerung"></button></div>
  <div class="field" id="c-rtwrap"><label for="c-rtime">um</label><input type="time" class="inp" id="c-rtime" value="${f.rtime}"></div>
  <div class="btns">${isNew?'':'<button class="btn danger" id="c-del">Löschen</button>'}<button class="btn primary" id="c-save">Speichern</button></div>`,sh=>{
    const $=q=>sh.querySelector(q);
    const drawR=()=>{$('#c-rem').setAttribute('aria-checked',f.remind);$('#c-rtwrap').hidden=!f.remind};drawR();
    $('#c-rem').onclick=()=>{f.remind=!f.remind;drawR()};
    $('#c-icons').onclick=e=>{const b=e.target.closest('[data-icon]');if(!b)return;f.icon=b.dataset.icon;sh.querySelectorAll('[data-icon]').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',on);x.style.cssText=on?'border-color:var(--accent);border-width:2px':''})};
    $('#c-ass').onclick=e=>{const b=e.target.closest('[data-cass]');if(!b)return;f.assign=b.dataset.cass;sh.querySelectorAll('[data-cass]').forEach(x=>x.setAttribute('aria-pressed',x===b))};
    $('#c-save').onclick=()=>{f.title=$('#c-title').value.trim()||'Haushaltsaufgabe';f.every=Math.max(1,parseInt($('#c-every').value)||1);f.unit=$('#c-unit').value;f.due=$('#c-due').value||TODAY;f.rtime=$('#c-rtime').value||'18:00';
      if(!f.last){const x=fromIso(f.due);if(f.unit==='d')x.setDate(x.getDate()-f.every);if(f.unit==='w')x.setDate(x.getDate()-7*f.every);if(f.unit==='m')x.setMonth(x.getMonth()-f.every);f.last=iso(x)}
      const i=S.chores.findIndex(x=>x.id===f.id);if(i>=0)S.chores[i]=f;else S.chores.push(f);save();closeSheet();render();toast(isNew?'Aufgabe angelegt':'Gespeichert')};
    const d=$('#c-del');if(d)d.onclick=()=>{if(d.dataset.sure){S.chores=S.chores.filter(x=>x.id!==f.id);save();closeSheet();render();toast('Gelöscht')}else{d.dataset.sure='1';d.textContent='Wirklich löschen?'}};
    if(isNew&&!tpl)setTimeout(()=>$('#c-title').focus(),50);
  });
}
const TREMIND={'':'Keine',0:'Zur Fälligkeit','60':'1 Std vorher','1440':'1 Tag vorher','morning':'Am Morgen (Morgen-Übersicht)'};
const TREP={none:'Nie',daily:'Täglich',weekly:'Wöchentlich',biweekly:'Alle 2 Wochen',monthly:'Monatlich'};
const todoVisible=t=>t.by===S.user;
const mine=t=>true;
function dueLabel(d){if(!d)return '';const n=dayNum(d)-dayNum(TODAY);if(n===0)return 'Heute';if(n===1)return 'Morgen';if(n===-1)return 'Gestern';return fromIso(d).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'})}
// Erinnerung für To-dos: konkreter Zeitpunkt (remindAt) oder Morgen-Übersicht
const nowHM=()=>pad(new Date().getHours())+':'+pad(new Date().getMinutes());
function remPresets(withDue){const late=nowHM()>='17:30';const tom=addDays(TODAY,1);
  return [...(withDue?[['due','Zur Fälligkeit',0]]:[]),['none','Nein, danke',null],late?['1h','In 1 Stunde',(()=>{const d=new Date(Date.now()+36e5);return iso(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes())})()]:['eve','Heute 18:00',TODAY+'T18:00'],['tom','Morgen 9:00',tom+'T09:00'],['morning','Morgen-Übersicht','morning'],['custom','Eigene Zeit …','custom']]}
function remAtLabel(t){if(t.remind==='morning')return 'Morgen-Übersicht';if(t.remind===0&&!t.remindAt)return 'Zur Fälligkeit';if(!t.remindAt)return '';const[d,tm]=t.remindAt.split('T');return dueLabel(d)+' '+tm}
function remChooser(t,withDue){const cur=t.remindAt?'custom':t.remind==='morning'?'morning':t.remind===0?'due':'none';
  return `<div class="remask"><div class="chips">${remPresets(withDue).map(([k,l])=>`<button type="button" class="chip" data-rset="${k}" aria-pressed="${k===cur}">${l}</button>`).join('')}</div>
  <div class="row" id="r-custom" ${cur==='custom'?'':'hidden'}><input type="date" class="inp" id="r-d" value="${t.remindAt?t.remindAt.split('T')[0]:(t.due||TODAY)}"><input type="time" class="inp" id="r-t" value="${t.remindAt?t.remindAt.split('T')[1]:(t.time||'09:00')}"></div></div>`}
function bindRemChooser(root,t,onPick){
  root.querySelector('.remask').addEventListener('click',e=>{const b=e.target.closest('[data-rset]');if(!b)return;const k=b.dataset.rset;const p=remPresets(true).find(x=>x[0]===k);
    root.querySelectorAll('[data-rset]').forEach(x=>x.setAttribute('aria-pressed',x===b));root.querySelector('#r-custom').hidden=k!=='custom';
    if(k==='none'){t.remindAt=null;t.remind=null}else if(k==='due'){t.remindAt=null;t.remind=0}else if(k==='morning'){t.remindAt=null;t.remind='morning';if(!t.due)t.due=addDays(TODAY,1)}else if(k!=='custom'){t.remindAt=p[2];t.remind=null}
    onPick&&onPick(k)});
  return ()=>{const b=root.querySelector('[data-rset][aria-pressed="true"]');if(b&&b.dataset.rset==='custom'){const d=root.querySelector('#r-d').value,tm=root.querySelector('#r-t').value||'09:00';if(d){t.remindAt=d+'T'+tm;t.remind=null}}};
}
function askRemind(t){
  openSheet(`<div class="ask">${lumoSvg('think')}<div><h3 style="margin:0">Soll ich dich erinnern?</h3><p class="hint" style="margin:2px 0 0">„${esc(t.title)}“</p></div></div>${remChooser(t,!!t.due)}<div class="btns" id="r-okwrap" hidden><button class="btn primary" id="r-ok">Speichern</button></div>`,sh=>{
    const fin=bindRemChooser(sh,t,k=>{if(k==='custom'){sh.querySelector('#r-okwrap').hidden=false;return}save();closeSheet();render();toast(k==='none'?'Ohne Erinnerung':'Erinnerung: '+remAtLabel(t))});
    sh.querySelector('#r-ok').onclick=()=>{fin();save();closeSheet();render();toast('Erinnerung: '+remAtLabel(t))};
  });
}
function todoRow(t){
  const over=!t.done&&t.due&&t.due<TODAY;
  const who=t.scope==='privat'?'Privat':t.assignee==='both'?'Beide':USERS[t.assignee].name;
  return `<div class="todo${t.done?' done':''}"><button class="tchk${t.done?' on':''}" data-tdone="${t.id}" aria-label="${t.done?'Wieder öffnen':'Erledigt'}">✓</button>
   <button class="tbody" data-todo="${t.id}"><div class="t">${esc(t.title)}</div><div class="meta">${t.due?`<span class="${over?'over':''}">${over?'Überfällig · ':''}${dueLabel(t.due)}${t.time?' '+t.time:''}</span>`:''}${t.repeat!=='none'?`<span>🔁 ${TREP[t.repeat]}</span>`:''}${t.remindAt||t.remind==='morning'?`<span>🔔 ${remAtLabel(t)}</span>`:t.remind!==null&&t.remind!==undefined?'<span>🔔</span>':''}</div></button></div>`;
}
/* ---------- Habits ---------- */
const HABIT_TPL=[['Meditieren','🧘'],['Sport','🏃'],['Lesen','📖'],['Spazieren','🚶'],['Früh schlafen','😴'],['Dankbarkeit notieren','🙏'],['Kein Handy vor dem Schlafen','📵'],['Dehnen','🤸'],['Journaling','✍️'],['Gesund essen','🥗']];
const HICONS=['⭐','🧘','🏃','📖','🚶','😴','🙏','📵','🤸','✍️','🥗','💧','🎸','🧠','🌿','🦷','💊','🧹','📞','💪'];
const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
const weekStartOf=d=>{const x=fromIso(d);x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};
const hDoneOn=(h,d)=>(h.log||[]).includes(d);
const hWeekCount=(h,d=TODAY)=>{const w=weekStartOf(d);return (h.log||[]).filter(x=>x>=w&&x<=addDays(w,6)).length};
function hProgress(h){if(h.freq==='weekly')return Math.min(1,hWeekCount(h)/Math.max(1,h.target||1));return hDoneOn(h,TODAY)?1:0}
function hStreak(h){
  if(h.freq==='weekly'){let n=0,w=weekStartOf(TODAY);if(hWeekCount(h,w)<(h.target||1))w=addDays(w,-7);while(hWeekCount(h,w)>=(h.target||1)){n++;w=addDays(w,-7)}return n}
  let n=0,d=hDoneOn(h,TODAY)?TODAY:addDays(TODAY,-1);while(hDoneOn(h,d)){n++;d=addDays(d,-1)}return n}
function habitPct(){const l=S.habits||[];if(!l.length)return null;return Math.round(l.reduce((a,h)=>a+hProgress(h),0)/l.length*100)}
function habitMood(p){const h=new Date().getHours();
  if(p>=100)return ['party','Alles geschafft! Spotzi tanzt vor Freude. Du bist großartig!'];
  if(p>=75)return ['cheer','Fast geschafft. Spotzi ist mächtig stolz auf dich!'];
  if(p>=50)return ['happy','Schon mehr als die Hälfte. Weiter so, Schritt für Schritt.'];
  if(p>=25)return ['calm','Ein guter Anfang. Jeder kleine Schritt zählt.'];
  if(p===0&&h<12)return ['sleepy','Der Tag hat gerade erst begonnen. Ganz in Ruhe.'];
  return ['sad','Spotzi ist ein bisschen traurig, glaubt aber fest an dich. Ein kleiner Schritt reicht schon.']}
function habitHero(compact){const p=habitPct();if(p===null)return '';const [mood,msg]=habitMood(p);
  const tag=compact?'button':'div';
  return `<${tag} class="hhero${compact?' compact':''}"${compact?' data-go="habits"':''}><span class="hfig">${lumoSvg(mood)}</span><span class="hinfo"><span class="hpct"><b>${p}&nbsp;%</b><span>Habits ${compact?'heute ':''}erledigt</span></span><span class="hbar"><i style="width:${p}%"></i></span><span class="hmsg">${msg}</span></span></${tag}>`}
/* ---------- Wasser ---------- */
const WATER_DEF={on:false,every:120,from:'09:00',to:'21:00',goal:8};
const glassesToday=()=>{const g=S.prefs.glasses;return g&&g.d===TODAY?g.n:0};
function waterCard(){const w={...WATER_DEF,...S.prefs.water};const n=glassesToday();
  return `<div class="section-title">Wasser trinken<span>alle ${w.every>=60?(w.every/60).toString().replace('.',',')+' Std':w.every+' Min'}, ${w.from}–${w.to}</span></div>
  <div class="card water"><div class="glasses">${[...Array(Math.max(w.goal,n))].map((_,i)=>`<span class="gl${i<n?' on':''}">💧</span>`).join('')}</div>
  <div class="wrow"><button class="iconbtn" data-water="-1" aria-label="Ein Glas weniger">−</button><b>${n} von ${w.goal} Gläsern</b><button class="iconbtn plus" data-water="1" aria-label="Ein Glas mehr">+</button></div></div>`}
function habitRow(h){const done=h.freq==='weekly'?hWeekCount(h)>=(h.target||1):hDoneOn(h,TODAY);const today=hDoneOn(h,TODAY);const st=hStreak(h);
  const meta=h.freq==='weekly'?`${h.target}× pro Woche · ${hWeekCount(h)}/${h.target} diese Woche`:'Täglich';
  return `<div class="todo habit${done?' hdone':''}"><button class="tchk hchk${today?' on':''}" data-hdone="${h.id}" aria-label="${today?'Heute nicht erledigt':'Heute erledigt'}">${today?'✓':esc(h.icon||'⭐')}</button>
   <button class="tbody" data-habit="${h.id}"><div class="t">${esc(h.title)}</div><div class="meta"><span>${meta}</span>${st?`<span>🔥 ${st} ${h.freq==='weekly'?(st===1?'Woche':'Wochen'):(st===1?'Tag':'Tage')}</span>`:''}${h.remind?`<span>🔔 ${h.rtime}</span>`:''}</div>
   ${h.freq==='weekly'?`<div class="bar"><i style="width:${Math.round(hProgress(h)*100)}%"></i></div>`:''}</button></div>`}
function renderHabits(){
  S.habits=S.habits||[];
  return `${habitHero()}
  <div class="todos" style="margin-top:12px">${S.habits.map(habitRow).join('')||'<div class="empty">Noch keine Habits. Wähle unten eine Vorlage oder tippe auf +.</div>'}</div>
  <div class="section-title">Vorlagen<span>antippen zum Hinzufügen</span></div>
  <div class="tpls">${HABIT_TPL.map(([n,i],k)=>`<button data-htpl="${k}">${i} ${n}</button>`).join('')}</div>
  <p class="hint">Tippe auf das Symbol, um einen Habit für heute abzuhaken. Deine Habits sieht nur du.</p>`}
function toggleHabit(id){const h=S.habits.find(x=>x.id===id);if(!h)return;h.log=h.log||[];const before=habitPct();
  if(h.log.includes(TODAY))h.log=h.log.filter(d=>d!==TODAY);else{h.log.push(TODAY);h.log=h.log.filter(d=>dayNum(TODAY)-dayNum(d)<200)}
  save();render();const p=habitPct();if(p===100&&before!==100)toast('100 %! Spotzi feiert mit dir 🎉');
  const f=document.querySelector('.hfig');if(f)f.classList.add('wiggle')}
function openHabit(h,tpl){
  const isNew=!h;const f=h?JSON.parse(JSON.stringify(h)):{id:uid(),title:tpl?tpl[0]:'',icon:tpl?tpl[1]:'⭐',freq:'daily',target:3,remind:false,rtime:'19:00',rdays:[0,1,2,3,4,5,6],log:[]};
  openSheet(`<h3>${isNew?'Neuer Habit':'Habit bearbeiten'}</h3>
  <div class="field"><label for="h-title">Was möchtest du regelmäßig tun?</label><input class="inp" id="h-title" value="${esc(f.title)}" placeholder="z. B. 10 Minuten lesen"></div>
  <div class="field"><span class="lbl">Symbol</span><div class="tpls" id="h-icons" style="flex-wrap:wrap">${HICONS.map(i=>`<button type="button" data-hicon="${i}" aria-pressed="${f.icon===i}">${i}</button>`).join('')}</div></div>
  <div class="field"><span class="lbl">Wie oft?</span><div class="seg vseg" id="h-freq"><button type="button" data-hfreq="daily" aria-pressed="${f.freq==='daily'}">Täglich</button><button type="button" data-hfreq="weekly" aria-pressed="${f.freq==='weekly'}">Pro Woche</button></div>
   <div class="row" id="h-tw" style="margin-top:8px;align-items:center"><input type="number" min="1" max="7" class="inp" id="h-target" value="${f.target||3}" style="max-width:90px" aria-label="Wie oft pro Woche"><span>mal pro Woche</span></div></div>
  <div class="setting"><span>Erinnerung</span><button type="button" class="switch" role="switch" id="h-rem" aria-checked="${f.remind}" aria-label="Erinnerung"></button></div>
  <div id="h-rw"><div class="field"><label for="h-rtime">um</label><input type="time" class="inp" id="h-rtime" value="${f.rtime}"></div>
   <div class="field"><span class="lbl">an diesen Tagen</span><div class="wdpick" id="h-days">${[1,2,3,4,5,6,0].map(d=>`<button type="button" data-hday="${d}" aria-pressed="${f.rdays.includes(d)}">${WD[d]}</button>`).join('')}</div><p class="hint" style="margin:6px 0 0">Spotzi erinnert nur, wenn du den Habit an dem Tag noch nicht abgehakt hast.</p></div></div>
  <div class="btns">${isNew?'':'<button class="btn danger" id="h-del">Löschen</button>'}<button class="btn primary" id="h-save">Speichern</button></div>`,sh=>{
    const $=q=>sh.querySelector(q);
    const draw=()=>{$('#h-tw').hidden=f.freq!=='weekly';$('#h-rem').setAttribute('aria-checked',f.remind);$('#h-rw').hidden=!f.remind;
      sh.querySelectorAll('[data-hfreq]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.hfreq===f.freq));sh.querySelectorAll('[data-hicon]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.hicon===f.icon));sh.querySelectorAll('[data-hday]').forEach(x=>x.setAttribute('aria-pressed',f.rdays.includes(+x.dataset.hday)))};draw();
    sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.hfreq){f.freq=b.dataset.hfreq;draw()}else if(b.dataset.hicon){f.icon=b.dataset.hicon;draw()}else if(b.id==='h-rem'){f.remind=!f.remind;draw()}
      else if(b.dataset.hday){const d=+b.dataset.hday;f.rdays=f.rdays.includes(d)?f.rdays.filter(x=>x!==d):[...f.rdays,d];draw()}});
    $('#h-save').onclick=()=>{f.title=$('#h-title').value.trim()||'Mein Habit';f.target=Math.min(7,Math.max(1,parseInt($('#h-target').value)||1));f.rtime=$('#h-rtime').value||'19:00';
      const i=S.habits.findIndex(x=>x.id===f.id);if(i>=0)S.habits[i]=f;else S.habits.push(f);save();closeSheet();render();toast(isNew?'Habit angelegt':'Gespeichert')};
    const d=$('#h-del');if(d)d.onclick=()=>{if(d.dataset.sure){S.habits=S.habits.filter(x=>x.id!==f.id);save();closeSheet();render();toast('Gelöscht')}else{d.dataset.sure='1';d.textContent='Wirklich löschen?'}};
    if(isNew&&!tpl)setTimeout(()=>$('#h-title').focus(),50);
  });
}
let todoFilter='alle';
function renderTodo(){return renderTodoList()}
function renderTodoList(){
  S.todos=S.todos||[];
  let list=S.todos.filter(todoVisible);
  const open=list.filter(t=>!t.done).sort((a,b)=>(a.due||'9999')+(a.time||'')<(b.due||'9999')+(b.time||'')?-1:1);
  const groups=[['Überfällig',open.filter(t=>t.due&&t.due<TODAY)],['Heute',open.filter(t=>t.due===TODAY)],['Demnächst',open.filter(t=>t.due&&t.due>TODAY)],['Ohne Datum',open.filter(t=>!t.due)]];
  const done=list.filter(t=>t.done);
  const f=[['alle','Alle'],['mir','Für mich'],['gemeinsam','Gemeinsam']];
  return `<form class="qadd" id="tadd"><input id="tq" placeholder="Neues To-do, z. B. Müll raus" autocomplete="off" aria-label="Neues To-do"><button type="submit">Hinzufügen</button></form>
  ${open.length?groups.filter(g=>g[1].length).map(([n,l])=>`<div class="section-title">${n}<span>${l.length}</span></div><div class="todos">${l.map(todoRow).join('')}</div>`).join(''):'<div class="empty" style="margin-top:12px">Alles erledigt. Spotzi ist stolz auf euch.</div>'}
  ${done.length?`<details class="cat" style="margin-top:16px"><summary>Erledigt (${done.length})</summary><div class="todos">${done.map(todoRow).join('')}</div></details>`:''}
  <p class="hint">Antippen öffnet Details wie Fälligkeit, Erinnerung und Wiederholung. Deine To-dos sieht nur du. Gemeinsame Aufgaben gehören in den Haushalt.</p>`;
}
function nextDue(d,rep){const x=fromIso(d||TODAY);if(rep==='daily')x.setDate(x.getDate()+1);if(rep==='weekly')x.setDate(x.getDate()+7);if(rep==='biweekly')x.setDate(x.getDate()+14);if(rep==='monthly')x.setMonth(x.getMonth()+1);return iso(x)}
function toggleTodo(id){
  const t=S.todos.find(x=>x.id===id);if(!t)return;
  if(!t.done&&t.repeat!=='none'){const prev=t.due;t.due=nextDue(t.due,t.repeat);if(t.due<=TODAY)t.due=nextDue(TODAY,t.repeat);save();render();toast('Erledigt. Nächstes Mal: '+dueLabel(t.due),()=>{t.due=prev;save();render()});return}
  t.done=!t.done;save();render();
  if(t.done)toast(t.scope==='gemeinsam'?'Erledigt, '+USERS[S.user==='sevi'?'sie':'sevi'].name+' sieht es sofort':'Erledigt',()=>{t.done=false;save();render()});
}
function openTodo(t){
  const isNew=!t;
  const f=t?JSON.parse(JSON.stringify(t)):{id:uid(),title:'',scope:'privat',by:S.user,assignee:S.user,due:null,time:null,remind:0,remindAt:null,repeat:'none',note:'',done:false};
  if(typeof f.remind==='number'&&f.due&&!f.remindAt){const x=fromIso(f.due);const[h,m]=(f.time||'09:00').split(':').map(Number);x.setHours(h,m-f.remind);f.remindAt=iso(x)+'T'+pad(x.getHours())+':'+pad(x.getMinutes());f.remind=null}
  const segBtns=(name,opts,val)=>opts.map(([k,l])=>`<button type="button" data-${name}="${k}" aria-pressed="${val===k}">${l}</button>`).join('');
  openSheet(`<h3>${isNew?'Neues To-do':'To-do bearbeiten'}</h3>
  <div class="field"><label for="t-title">Was ist zu tun?</label><input class="inp" id="t-title" value="${esc(f.title)}" placeholder="z. B. Müll rausbringen"></div>
  <div class="field"><div class="row"><div><label class="lbl" for="t-due">Fällig am (optional)</label><input type="date" class="inp" id="t-due" value="${f.due||''}"></div><div><label class="lbl" for="t-time">Uhrzeit</label><input type="time" class="inp" id="t-time" value="${f.time||''}"></div></div></div>
  <div class="field"><span class="lbl">Soll ich dich erinnern?</span>${remChooser(f,true)}<p class="hint" id="t-duehint" style="margin:6px 0 0" hidden>„Zur Fälligkeit“ braucht ein Fälligkeitsdatum (ohne Uhrzeit um 9:00).</p></div>
  <div class="field"><label for="t-rep">Wiederholen</label><select class="inp" id="t-rep">${Object.entries(TREP).map(([k,l])=>`<option value="${k}"${f.repeat===k?' selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field"><label for="t-note">Notiz</label><textarea class="inp" id="t-note" rows="2" placeholder="Optional">${esc(f.note)}</textarea></div>
  <div class="btns">${isNew?'':'<button class="btn danger" id="t-del">Löschen</button>'}<button class="btn primary" id="t-save">Speichern</button></div>`,sh=>{
    const $=q=>sh.querySelector(q);const finRem=bindRemChooser(sh,f,()=>dh());const dh=()=>{$('#t-duehint').hidden=!(f.remind===0&&!f.remindAt&&!$('#t-due').value)};$('#t-due').addEventListener('change',dh);dh();
    $('#t-save').onclick=()=>{f.title=$('#t-title').value.trim()||'Ohne Titel';f.due=$('#t-due').value||null;f.time=$('#t-time').value||null;finRem();if(f.remind==='morning'&&!f.due)f.due=addDays(TODAY,1);f.repeat=$('#t-rep').value;f.note=$('#t-note').value.trim();
      if(f.repeat!=='none'&&!f.due)f.due=TODAY;
      const i=S.todos.findIndex(x=>x.id===f.id);if(i>=0)S.todos[i]=f;else S.todos.push(f);save();closeSheet();render();
      toast(f.scope==='gemeinsam'&&f.assignee!==S.user&&isNew?USERS[f.assignee==='both'?(S.user==='sevi'?'sie':'sevi'):f.assignee].name+' bekommt eine Push':'Gespeichert')};
    const d=$('#t-del');if(d)d.onclick=()=>{if(d.dataset.sure){S.todos=S.todos.filter(x=>x.id!==f.id);save();closeSheet();render();toast('Gelöscht')}else{d.dataset.sure='1';d.textContent='Wirklich löschen?'}};
    if(isNew)setTimeout(()=>$('#t-title').focus(),50);
  });
}
/* ---------- Design pro Person ---------- */
const DESIGN_DEF={theme:'auto',accent:null,bg:'none',bgColor:'#DCE6FF',grad:'ozean',veil:30};
const ACCENTS=['#4C5BD4','#2F7DEB','#0E9F9B','#2E9E4F','#E2861B','#DE4F8A','#8A5CF0','#D94848','#3B4256'];
const GRADS={ozean:['Ozean','linear-gradient(160deg,#A1C4FD,#C2E9FB)'],lavendel:['Lavendel','linear-gradient(160deg,#E0C3FC,#8EC5FC)'],morgenrot:['Morgenrot','linear-gradient(160deg,#FFD3A5,#FD6585)'],pfirsich:['Pfirsich','linear-gradient(160deg,#FFECD2,#FCB69F)'],minze:['Minze','linear-gradient(160deg,#D4FC79,#96E6A1)'],sonne:['Sonnenuntergang','linear-gradient(160deg,#FA709A,#FEE140)'],wald:['Wald','linear-gradient(160deg,#134E5E,#71B280)'],nacht:['Nacht','linear-gradient(160deg,#141E30,#243B55)']};
const media={photo:null,mood:[]};
Promise.all([getMedia('photo'),getMedia('mood')]).then(([p,m])=>{media.photo=p;media.mood=m||[];lastBgSig='';applyDesign()});
let lastBgSig='';
function applyDesign(){
  const D={...DESIGN_DEF,...S.prefs.design};const root=document.documentElement;
  if(D.theme==='auto')delete root.dataset.theme;else root.dataset.theme=D.theme;
  const dark=D.theme==='dark'||(D.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  if(D.accent){root.style.setProperty('--accent',dark?`color-mix(in srgb,${D.accent} 62%,white)`:D.accent);root.style.setProperty('--accent-2',dark?`color-mix(in srgb,${D.accent} 50%,white)`:`color-mix(in srgb,${D.accent} 80%,white)`);root.style.setProperty('--tile',D.accent)}
  else ['--accent','--accent-2','--tile'].forEach(v=>root.style.removeProperty(v));
  let el=document.getElementById('bgl');if(!el){el=document.createElement('div');el.id='bgl';document.body.prepend(el)}
  const has=D.bg==='color'||D.bg==='grad'||(D.bg==='photo'&&media.photo)||(D.bg==='mood'&&media.mood.length);
  document.body.classList.toggle('has-bg',!!has);el.style.setProperty('--veil',(D.veil||0)/100);
  const sig=[has,D.bg,D.bgColor,D.grad,D.bg==='photo'?(media.photo||'').length:0,D.bg==='mood'?media.mood.map(x=>x.length).join(','):''].join('|');
  if(sig===lastBgSig)return;lastBgSig=sig;el.innerHTML='';el.style.background='';
  if(!has)return;
  if(D.bg==='color')el.style.background=D.bgColor;
  else if(D.bg==='grad')el.style.background=(GRADS[D.grad]||GRADS.ozean)[1];
  else if(D.bg==='photo')el.style.background=`center/cover no-repeat url(${media.photo})`;
  else el.innerHTML=`<div class="moodb n${media.mood.length}">${media.mood.map(u=>`<img src="${u}" alt="">`).join('')}</div>`;
}
const COLORS=['#8A5CF0','#2F7DEB','#0E9F9B','#DE4F8A','#E2861B','#2E9E4F','#D94848','#5B6584'];
function applyColors(){const r=document.documentElement.style;Object.entries(CATS).forEach(([k,c])=>{if(c.ext)return;const v=S.prefs&&S.prefs.colors[k];if(v)r.setProperty(c.v,v);else r.removeProperty(c.v)})}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const fmtDay=s=>fromIso(s).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
const fmtShort=d=>d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})+', '+pad(d.getHours())+':'+pad(d.getMinutes());
const remLabel=m=>{const p=REM_PRESETS.find(x=>x[0]===m);if(p)return p[1];if(m%10080===0)return (m/10080)+' Wochen vorher';if(m%1440===0)return (m/1440)+' Tage vorher';if(m%60===0)return (m/60)+' Std vorher';return m+' Min vorher'};

const FEAT_DEF={cal:true,todo:true,habits:true,house:true,shop:true,countdown:true};
const FEAT=()=>({...FEAT_DEF,...(S.prefs.features||{})});
const DEFAULT_PREFS={morning:true,mtime:'07:30',mshop:true,mweekend:true,cats:{filmen:true,sevi_privat:true,gemeinsam:true,sie_privat:true},quiet:true,lumo:true,mquote:true,weekStart:1,defView:'month',kw:true,dayStart:7,defDur:60,colors:{}};
const S={user:ctx.me,tab:'home',sel:TODAY,month:TODAY.slice(0,7),filter:'alle',defRem:60,pushOn:true,events:[],todos:[],chores:[],choreLog:[],list:[],habits:[],avatars:{},calsubs:[],countdowns:[],recent:[],notes:{},prefs:{...DEFAULT_PREFS},todoMode:'todo'};
try{const ui=JSON.parse(localStorage.getItem('spozli-ui')||'{}');if(ui.tab)S.tab=ui.tab;if(ui.view)S.view=ui.view;if(['alle','privat','gemeinsam'].includes(ui.filter))S.filter=ui.filter;if(ui.todoMode)S.todoMode=ui.todoMode}catch(e){}
function load(){ctx.store.applyToState(S);S.prefs={...DEFAULT_PREFS,...S.prefs,cats:{...DEFAULT_PREFS.cats,...(S.prefs.cats||{})},colors:{...(S.prefs.colors||{})}}}
load();if(!S.view)S.view=S.prefs.defView;
const TZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch(e){return null}})();
if(TZ&&S.prefs.tz!==TZ&&ctx.store.hasData()){S.prefs.tz=TZ;setTimeout(()=>save(),500)}
const save=()=>{try{localStorage.setItem('spozli-ui',JSON.stringify({tab:S.tab,view:S.view,filter:S.filter,todoMode:S.todoMode}))}catch(e){}ctx.store.commit(S)};
let syncState={online:navigator.onLine,pending:0};
function syncText(){const p=syncState.pending;if(!syncState.online)return `<span class="dotst off"></span>Offline${p?` · ${p} ${p===1?'Änderung wartet':'Änderungen warten'}`:''}. Wird automatisch übertragen.`;return p?`<span class="dotst wait"></span>Wird synchronisiert …`:`<span class="dotst ok"></span>Synchronisiert`}

const spanOf=ev=>ev.endDate&&ev.endDate>ev.date?dayNum(ev.endDate)-dayNum(ev.date):0;
function occursOn(ev,d){const n=spanOf(ev);for(let k=0;k<=n;k++)if(startsOn(ev,k?addDays(d,-k):d))return true;return false}
function startOfOcc(ev,d){const n=spanOf(ev);for(let k=0;k<=n;k++){const s=k?addDays(d,-k):d;if(startsOn(ev,s))return s}return d}
function multi(ev,d){const n=spanOf(ev);if(!n)return null;const s=startOfOcc(ev,d);const i=dayNum(d)-dayNum(s);return {i,n:n+1,first:i===0,last:i===n}}
function startsOn(ev,d){
  const a=dayNum(ev.date),b=dayNum(d);if(b<a)return false;
  if(ev.repeat==='none')return a===b;
  if(ev.repeat==='daily')return true;
  if(ev.repeat==='weekly')return (b-a)%7===0;
  if(ev.repeat==='biweekly')return (b-a)%14===0;
  const x=fromIso(ev.date),y=fromIso(d);
  if(ev.repeat==='monthly')return x.getDate()===y.getDate();
  if(ev.repeat==='yearly')return x.getDate()===y.getDate()&&x.getMonth()===y.getMonth();
  return false;
}
function visible(ev){
  const o=CATS[ev.cat].owner;
  if(o!==S.user&&o!=='both')return false;
  if(S.filter==='privat')return o===S.user;
  if(S.filter==='gemeinsam')return o==='both';
  return true;
}
const allEvents=()=>FEAT().cal?S.events.concat(extEvents()):[];
const eventsOn=d=>allEvents().filter(ev=>occursOn(ev,d)&&visible(ev)).sort((a,b)=>(a.allday?'00':a.time).localeCompare(b.allday?'00':b.time));
function startOf(ev,d){const t=fromIso(d);if(ev.allday)t.setHours(9,0);else{const[h,m]=ev.time.split(':').map(Number);t.setHours(h,m)}return t}
function remindees(cat){const o=CATS[cat].owner;return o==='both'?(USERS.sevi.name+' und '+USERS.sie.name):USERS[o].name}

function avatarHtml(slot,cls,attr=''){const img=(S.avatars||{})[slot];const nm=USERS[slot].name;
  return img?`<button class="${cls} has-img" ${attr} style="background-image:url('${img}')"></button>`:`<button class="${cls}" ${attr} style="--av:var(${slot==='sevi'?'--c-sevi':'--c-her'})">${esc(nm.charAt(0))}</button>`}
const app=document.getElementById('app'),layer=document.getElementById('layer'),fab=document.getElementById('fab');

function render(){
  applyColors();applyDesign();
  syncExtCats();const F=FEAT();
  const tabOn={home:true,cal:F.cal,todo:F.todo,habits:F.habits,house:F.house,shop:F.shop};
  if(S.tab!=='rem'&&!tabOn[S.tab])S.tab='home';
  if(S.tab==='todo'&&S.todoMode==='habits'){S.todoMode='todo';if(F.habits)S.tab='habits'}
  ['home','cal','todo','habits','house','shop'].forEach(t=>{const b=document.getElementById('tab-'+t);if(!b)return;b.setAttribute('aria-current',S.tab===t?'page':'false');b.hidden=!tabOn[t]});
  fab.hidden=!(S.tab==='cal'||(S.tab==='home'&&F.cal)||S.tab==='todo'||S.tab==='habits'||S.tab==='house');
  const me=USERS[S.user].name;
  const hr=new Date().getHours();const greet=hr<11?'Guten Morgen':hr<18?'Hallo':'Guten Abend';
  const titles={home:[fmtDay(TODAY),greet+', '+me],cal:['Unser Kalender','Kalender'],shop:['Unsere Liste','Einkauf'],todo:['Zu erledigen','To-dos'],habits:['Jeden Tag ein bisschen','Habits'],house:['Wiederkehrend','Haushalt'],rem:['Für '+me,'Erinnerungen']};
  const [sm,big]=titles[S.tab];
  const wide=WIDE.matches,dash=wide&&S.tab==='home';document.body.classList.toggle('wide',wide);document.body.classList.toggle('dash',dash);
  {const hb=document.getElementById('tab-home');const lbl=wide?'Übersicht':'Start';if(hb.lastChild&&hb.lastChild.nodeType===3&&hb.lastChild.textContent!==lbl)hb.lastChild.textContent=lbl}
  if(!dash)dashEdit=false;
  let h=`<header class="top"><div class="hello"><small>${esc(sm)}</small><h1>${esc(big)}</h1></div>
  <div class="toprow">${dash?`<button class="btn dedit" id="dash-edit" aria-pressed="${dashEdit}">${dashEdit?'Fertig':'✎ Anpassen'}</button>`:''}${avatarHtml(S.user,'avatar','id="who-btn" aria-label="Profil von '+esc(me)+'"')}<button class="gear" id="settings-btn" aria-label="Einstellungen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button></div></header>`;
  h+=dash?renderDash():{home:renderHome,cal:renderCal,todo:renderTodo,habits:renderHabits,house:renderHouse,shop:renderShop,rem:renderRem}[S.tab]();
  h+=`<div class="syncline" id="syncline">${syncText()}</div>`;
  app.innerHTML=h;
}

const relevant=ev=>{const o=CATS[ev.cat].owner;return o===S.user||o==='both'};
function upcomingReminders(days){
  const now=Date.now(),out=[];
  for(let i=0;i<=days;i++){const d=addDays(TODAY,i);
    S.events.forEach(ev=>{if(!relevant(ev)||!startsOn(ev,d))return;const st=startOf(ev,d);
      ev.rems.forEach(m=>{const t=st-m*6e4;if(t>=now)out.push({ev,d,m,t:new Date(t)})})})}
  return out.sort((a,b)=>a.t-b.t);
}
function renderHome(){
  const F=FEAT();
  const todays=eventsOn(TODAY).filter(relevant);
  const nowHM=pad(new Date().getHours())+':'+pad(new Date().getMinutes());
  const next=todays.find(ev=>ev.allday||ev.time>=nowHM);
  const rems=F.cal?upcomingReminders(14):[];
  const big=!F.cal?'Schön, dass du da bist':next?`Als Nächstes: ${esc(next.title)}${next.allday?'':' um '+next.time}`:todays.length?'Für heute ist alles erledigt':'Heute steht nichts an';
  const soon=[];{const ok=onceMulti();for(let i=0;i<=2&&soon.length<4;i++){const d=addDays(TODAY,i);eventsOn(d).forEach(ev=>{if(soon.length<4&&ok(ev,d))soon.push([ev,d])})}}
  const stats=[F.cal&&`<button class="stat" data-go="cal"><b>${todays.length}</b><span>Termine heute</span></button>`,F.shop&&`<button class="stat" data-go="shop"><b>${S.list.length}</b><span>Auf der Liste</span></button>`,F.cal&&`<button class="stat" data-go="rem"><b>${rems.filter(r=>r.t-Date.now()<864e5).length}</b><span>Erinnerungen 24 h</span></button>`,!F.cal&&F.todo&&`<button class="stat" data-go="todo"><b>${(S.todos||[]).filter(t=>!t.done&&t.due&&t.due<=TODAY).length}</b><span>To-dos heute</span></button>`,!F.cal&&F.habits&&habitPct()!==null&&`<button class="stat" data-go="habits"><b>${habitPct()}%</b><span>Habits</span></button>`].filter(Boolean);
  const quick=[F.cal&&'<button data-quick="ev">+ Termin</button>',F.shop&&'<button data-quick="item">+ Artikel</button>',F.countdown&&!F.shop&&'<button data-cd="new">+ Countdown</button>'].filter(Boolean);
  return `<section class="hero"><div class="lab">Heute</div><div class="big">${big}</div>
   ${stats.length?`<div class="stats">${stats.join('')}</div>`:''}</section>
  ${quick.length?`<div class="quick">${quick.join('')}</div>`:''}
  ${F.countdown?renderCountdowns():''}
  ${S.prefs.lumo!==false?renderSpotzi():''}
  ${F.habits&&habitPct()!==null?`<div class="section-title">Habits heute<button class="more" data-go="habits">Alle anzeigen</button></div>${habitHero(true)}`:''}
  ${S.prefs.water&&S.prefs.water.on?waterCard():''}
  ${F.cal?`<div class="section-title">Kalender<button class="more" data-go="cal">Alle anzeigen</button></div>
  <div class="card"><div class="agenda">${soon.length?soon.map(([ev,d])=>evRow(ev,d,true)).join(''):'<div class="empty">Die nächsten drei Tage sind frei.</div>'}</div></div>
  ${datesHtml(4)}`:''}
  ${F.todo?(()=>{const l=(S.todos||[]).filter(t=>todoVisible(t)&&mine(t)&&!t.done&&t.due&&t.due<=TODAY);return `<div class="section-title">To-dos heute<button class="more" data-go="todo">Alle anzeigen</button></div><div class="card">${l.length?`<div class="todos">${l.slice(0,4).map(todoRow).join('')}</div>`:'<div class="empty" style="padding:8px">Heute nichts offen.</div>'}</div>`})():''}
  ${F.house?(()=>{const l=(S.chores||[]).filter(c=>choreMine(c)&&c.due<=TODAY);return l.length?`<div class="section-title">Haushalt heute<button class="more" data-go="house">Alle anzeigen</button></div><div class="todos">${l.slice(0,3).map(choreRow).join('')}</div>`:''})():''}
  ${F.shop?`<div class="section-title">Einkaufsliste<button class="more" data-go="shop">Liste öffnen</button></div>
  <div class="card">${S.list.length?`<div class="mini-tiles">${S.list.slice(0,10).map(i=>`<span class="mini">${ICON[i.name]||'•'} ${esc(i.name)}${i.spec?' · '+esc(i.spec):''}</span>`).join('')}${S.list.length>10?`<span class="mini">+${S.list.length-10}</span>`:''}</div>`:'<div class="empty">Die Liste ist leer.</div>'}</div>`:''}
  ${F.cal?`<div class="section-title">Nächste Erinnerungen<button class="more" data-go="rem">Alle</button></div>
  <div class="rlist">${rems.slice(0,3).map(remRow).join('')||'<div class="empty">Keine Erinnerungen in den nächsten zwei Wochen.</div>'}</div>`:''}`;
}
function datesHtml(max,bare){const out=[];for(let i=0;i<=90&&out.length<max;i++){const d=addDays(TODAY,i);eventsOn(d).filter(ev=>ev.kind&&ev.kind!=='event').forEach(ev=>{if(out.length<max)out.push([ev,d,i])})}
  const list=`<div class="card"><div class="agenda">${out.map(([ev,d,i])=>`<button class="ev" style="--cat:var(${CATS[ev.cat].v})" data-ev="${ev.id}" data-d="${d}"><div class="time">${i===0?'Heute':i===1?'Morgen':'in '+i+' T.'}<small>${fromIso(d).toLocaleDateString('de-DE',{day:'numeric',month:'short'})}</small></div><div style="min-width:0"><div class="t">${esc(T(ev,d))}</div><div class="meta">${ev.note?esc(ev.note):''}</div></div><div class="bell">🔔 ${ev.rems.length}</div></button>`).join('')}</div></div>`;
  if(bare)return out.length?list:'<div class="empty">In den nächsten 90 Tagen keine Geburtstage oder Jahrestage.</div>';
  return out.length?`<div class="section-title">Geburtstage &amp; Jahrestage</div>${list}`:''}
/* ---------- Laptop-Dashboard ---------- */
const WIDE=matchMedia('(min-width: 1000px)');
const DASH_TILES={
  today:{t:'Heute',i:'☀️',on:()=>true,w:1,h:2,html:()=>dashToday()},
  cal:{t:'Kalender',i:'📅',go:'cal',on:F=>F.cal,w:2,h:5,html:()=>renderCal()},
  spozli:{t:'Spotzi',i:'💛',on:()=>S.prefs.lumo!==false,w:1,h:3,html:()=>renderSpotzi().replace(/^<div class="section-title">[\s\S]*?<\/div>/,'')},
  todo:{t:'To-dos',i:'✅',go:'todo',on:F=>F.todo,w:1,h:3,html:()=>renderTodoList()},
  shop:{t:'Einkauf',i:'🛒',go:'shop',on:F=>F.shop,w:1,h:4,html:()=>renderShop()},
  house:{t:'Haushalt',i:'🧹',go:'house',on:F=>F.house,w:1,h:3,html:()=>renderHouse()},
  habits:{t:'Habits',i:'🌱',go:'habits',on:F=>F.habits,w:1,h:3,html:()=>renderHabits()},
  countdown:{t:'Countdowns',i:'⏳',on:F=>F.countdown,w:2,h:2,html:()=>renderCountdowns(true)},
  rem:{t:'Nächste Erinnerungen',i:'🔔',go:'rem',on:F=>F.cal,w:1,h:3,html:()=>{const r=upcomingReminders(14);return `<div class="rlist">${r.slice(0,10).map(remRow).join('')||'<div class="empty">Keine Erinnerungen in den nächsten zwei Wochen.</div>'}</div>`}},
  dates:{t:'Geburtstage & Jahrestage',i:'🎂',on:F=>F.cal,w:1,h:2,html:()=>datesHtml(8,true)},
  water:{t:'Wasser',i:'💧',on:()=>!!(S.prefs.water&&S.prefs.water.on),w:1,h:2,html:()=>waterCard()},
};
const DASH_ORDER=['today','cal','spozli','todo','shop','house','habits','countdown','rem','dates','water'];
let dashEdit=false;
function dashCfg(){const d=S.prefs.dash||{};const order=(d.order||[]).filter(k=>DASH_TILES[k]);DASH_ORDER.forEach(k=>{if(!order.includes(k))order.push(k)});
  return {order,hide:(d.hide||[]).filter(k=>DASH_TILES[k]),size:{...(d.size||{})}}}
function dashSave(c){S.prefs.dash={order:c.order,hide:c.hide,size:c.size};save()}
function dashToday(){const F=FEAT();
  const todays=eventsOn(TODAY).filter(relevant);
  const nowHM=pad(new Date().getHours())+':'+pad(new Date().getMinutes());
  const next=todays.find(ev=>ev.allday||ev.time>=nowHM);
  const big=!F.cal?'Schön, dass du da bist':next?`Als Nächstes: ${esc(next.title)}${next.allday?'':' um '+next.time}`:todays.length?'Für heute ist alles erledigt':'Heute steht nichts an';
  const st=[F.cal&&['cal',todays.length,'Termine heute'],F.todo&&['todo',(S.todos||[]).filter(t=>todoVisible(t)&&mine(t)&&!t.done&&t.due&&t.due<=TODAY).length,'To-dos heute'],F.shop&&['shop',S.list.length,'Auf der Liste'],F.habits&&habitPct()!==null&&['habits',habitPct()+'%','Habits'],F.house&&['house',(S.chores||[]).filter(c=>choreMine(c)&&c.due<=TODAY).length,'Haushalt heute']].filter(Boolean);
  return `<div class="dtoday"><div class="big">${big}</div><div class="dstats">${st.map(([g,n,l])=>`<button class="stat" data-go="${g}"><b>${n}</b><span>${l}</span></button>`).join('')}</div></div>`}
function renderDash(){const F=FEAT();const c=dashCfg();
  const avail=c.order.filter(k=>DASH_TILES[k].on(F));
  const shown=avail.filter(k=>!c.hide.includes(k)),hidden=avail.filter(k=>c.hide.includes(k));
  const tiles=shown.map(k=>{const d=DASH_TILES[k];const[w,h]=c.size[k]||[d.w,d.h];
    return `<section class="dtile w${w}" style="grid-row:span ${h}" data-k="${k}" aria-label="${esc(d.t)}"><div class="dhead"><span class="dgrip" aria-hidden="true">${dashEdit?'⠿':d.i}</span><h2>${esc(d.t)}</h2>${dashEdit?`<button class="dbtn" data-dhide="${k}" title="Ausblenden" aria-label="${esc(d.t)} ausblenden">✕</button>`:d.go?`<button class="dbtn" data-go="${d.go}" title="Groß öffnen" aria-label="${esc(d.t)} groß öffnen">↗</button>`:''}</div>
    <div class="dbody">${d.html()}</div>${dashEdit?'<div class="dshield"></div><div class="drz" title="Größe ändern" aria-hidden="true"></div>':''}</section>`}).join('');
  const bar=dashEdit?`<div class="dbar"><b>Übersicht anpassen</b><span class="hint">Kacheln an der Kopfzeile ziehen zum Verschieben, an der Ecke unten rechts ziehen für die Größe.</span>
    ${hidden.length?`<div class="dhidden">Ausgeblendet: ${hidden.map(k=>`<button class="chip" data-dshow="${k}">+ ${esc(DASH_TILES[k].t)}</button>`).join('')}</div>`:''}
    <div class="dbar-btns"><button class="btn" id="dash-reset">Zurücksetzen</button></div></div>`:'';
  return bar+`<div class="dgrid${dashEdit?' editing':''}" id="dgrid">${tiles||'<div class="empty">Alle Kacheln sind ausgeblendet. Tippe auf „Anpassen“.</div>'}</div>`}
let ddrag=null;
function dashDown(e){
  if(!dashEdit||e.button>0)return;const tile=e.target.closest('.dtile');if(!tile||e.target.closest('button'))return;
  const rz=!!e.target.closest('.drz');if(!rz&&!e.target.closest('.dhead,.dshield'))return;
  e.preventDefault();const grid=tile.parentElement;const cs=getComputedStyle(grid);
  const cols=cs.gridTemplateColumns.split(' ').filter(Boolean).length;const gap=parseFloat(cs.columnGap)||16;const rowH=parseFloat(cs.gridAutoRows)||130;
  const r=tile.getBoundingClientRect();
  ddrag={tile,rz,cols,gap,rowH,colW:(grid.clientWidth-gap*(cols-1))/cols,r,gx:e.clientX-r.left,gy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,base:r,moved:false};
  tile.classList.add(rz?'resizing':'dragging');try{tile.setPointerCapture(e.pointerId)}catch(_){}
}
function dashMove(e){const d=ddrag;if(!d)return;e.preventDefault();d.moved=true;
  const edge=e.clientY<90?-24:e.clientY>innerHeight-70?24:0;if(edge){scrollBy(0,edge);if(!d.rz){d.tile.style.transform='';d.base=d.tile.getBoundingClientRect()}else{d.sy-=edge}}
  if(d.rz){const w=Math.max(1,Math.min(d.cols,Math.round((d.r.width+e.clientX-d.sx+d.gap)/(d.colW+d.gap))));const h=Math.max(2,Math.min(8,Math.round((d.r.height+e.clientY-d.sy+d.gap)/(d.rowH+d.gap))));
    if(w!==d.w||h!==d.h){d.w=w;d.h=h;d.tile.className=d.tile.className.replace(/\bw\d\b/,'w'+w);d.tile.style.gridRow='span '+h}return}
  const over=document.elementsFromPoint(e.clientX,e.clientY).map(n=>n.closest&&n.closest('.dtile')).find(n=>n&&n!==d.tile);
  if(over&&over!==d.last){d.last=over;const all=[...d.tile.parentElement.children];
    if(all.indexOf(over)>all.indexOf(d.tile))over.after(d.tile);else over.before(d.tile);
    d.tile.style.transform='';d.base=d.tile.getBoundingClientRect()}
  else if(!over)d.last=null;
  d.tile.style.transform=`translate(${e.clientX-d.gx-d.base.left}px,${e.clientY-d.gy-d.base.top}px)`}
function dashUp(){const d=ddrag;if(!d)return;ddrag=null;d.tile.classList.remove('dragging','resizing');d.tile.style.transform='';
  if(!d.moved)return;const c=dashCfg();
  if(d.rz){if(d.w)c.size[d.tile.dataset.k]=[d.w,d.h]}
  else{const vis=[...document.querySelectorAll('#dgrid .dtile')].map(t=>t.dataset.k);const rest=c.order.filter(k=>!vis.includes(k));c.order=vis.concat(rest)}
  dashSave(c);render()}
/* ---------- Countdowns ---------- */
const CD_ICONS=['⏳','🏖️','✈️','🎂','💍','🎄','🎉','🏠','🎬','❤️','🎓','⚽','🎁','🐣','⛷️','🎵'];
const cdVisible=()=>(S.countdowns||[]).filter(c=>c.date>=TODAY).sort((a,b)=>a.date<b.date?-1:1);
function cdText(c){const n=dayNum(c.date)-dayNum(TODAY);return n===0?['Heute!','']:n===1?['1','Tag bis']:[String(n),'Tage bis']}
function renderCountdowns(bare){const l=cdVisible();
  return `${bare?'<div class="dtop"><button class="more" data-cd="new">+ Neuer Countdown</button></div>':'<div class="section-title">Countdowns<button class="more" data-cd="new">+ Neu</button></div>'}
  ${l.length?`<div class="cdrow">${l.map(c=>{const[n,t]=cdText(c);return `<button class="cd${n==='Heute!'?' today':''}" data-cd="${c.id}" style="--cat:var(${c.vis==='shared'?'--c-both':S.user==='sevi'?'--c-sevi':'--c-her'})"><span class="cdi">${esc(c.icon||'⏳')}</span><b>${n}</b><span class="cdl">${t}</span><span class="cdt">${esc(c.title)}</span></button>`}).join('')}</div>`:`<button class="card cdempty" data-cd="new">⏳ Worauf freust du dich? Lege einen Countdown an, z. B. bis zu den Ferien.</button>`}`}
function openCountdown(c,preset){
  const isNew=!c;const f=c?JSON.parse(JSON.stringify(c)):{id:uid(),title:'',date:addDays(TODAY,14),icon:'⏳',vis:'shared',by:S.user,...(preset||{})};
  openSheet(`<h3>${isNew?'Neuer Countdown':'Countdown bearbeiten'}</h3>
  <div class="field"><label for="cd-title">Worauf freust du dich?</label><input class="inp" id="cd-title" value="${esc(f.title)}" placeholder="z. B. Ferien in Italien"></div>
  <div class="field"><label for="cd-date">Datum</label><input type="date" class="inp" id="cd-date" value="${f.date}"></div>
  <div class="field"><span class="lbl">Symbol</span><div class="tpls" id="cd-icons" style="flex-wrap:wrap">${CD_ICONS.map(i=>`<button type="button" data-cdi="${i}" aria-pressed="${f.icon===i}">${i}</button>`).join('')}</div></div>
  <div class="field"><span class="lbl">Für wen</span><div class="seg vseg" id="cd-vis"><button type="button" data-cdv="private" aria-pressed="${f.vis!=='shared'}">Nur ich</button><button type="button" data-cdv="shared" aria-pressed="${f.vis==='shared'}">Beide</button></div></div>
  <div class="btns">${isNew?'':'<button class="btn danger" id="cd-del">Löschen</button>'}<button class="btn primary" id="cd-save">Speichern</button></div>`,sh=>{
    const $=q=>sh.querySelector(q);
    sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.cdi){f.icon=b.dataset.cdi;sh.querySelectorAll('[data-cdi]').forEach(x=>x.setAttribute('aria-pressed',x===b))}
      if(b.dataset.cdv){f.vis=b.dataset.cdv;sh.querySelectorAll('[data-cdv]').forEach(x=>x.setAttribute('aria-pressed',x===b))}});
    $('#cd-save').onclick=()=>{f.title=$('#cd-title').value.trim()||'Etwas Schönes';f.date=$('#cd-date').value||TODAY;
      S.countdowns=S.countdowns||[];const i=S.countdowns.findIndex(x=>x.id===f.id);if(i>=0)S.countdowns[i]=f;else S.countdowns.push(f);save();closeSheet();render();const n=dayNum(f.date)-dayNum(TODAY);toast(n>0?`Noch ${n} ${n===1?'Tag':'Tage'}. Spotzi freut sich mit!`:'Gespeichert')};
    const d=$('#cd-del');if(d)d.onclick=()=>{if(d.dataset.sure){S.countdowns=S.countdowns.filter(x=>x.id!==f.id);save();closeSheet();render();toast('Gelöscht')}else{d.dataset.sure='1';d.textContent='Wirklich löschen?'}};
    if(isNew&&!f.title)setTimeout(()=>$('#cd-title').focus(),50);
  });
}
/* ---------- Kalender-Abos (Google, iCloud, Outlook …) ---------- */
const extCache={};// id -> {at,err,vevents,expanded,key}
function loadExt(id){if(extCache[id])return extCache[id];let v=null;try{v=JSON.parse(localStorage.getItem('spozli-ics-'+id)||'null')}catch(e){}extCache[id]=v||{at:0,err:null,vevents:[]};return extCache[id]}
function storeExt(id,c){extCache[id]=c;try{localStorage.setItem('spozli-ics-'+id,JSON.stringify({at:c.at,err:c.err,vevents:c.vevents}))}catch(e){try{localStorage.removeItem('spozli-ics-'+id)}catch(_){}}}
function syncExtCats(){
  for(const k of Object.keys(CATS))if(k.startsWith('ext:'))delete CATS[k];
  (S.calsubs||[]).forEach((c,i)=>{const v='--c-ext'+i;document.documentElement.style.setProperty(v,c.color||'#5B6584');CATS['ext:'+c.id]={label:c.name||'Kalender',owner:c.vis==='shared'?'both':S.user,v,sym:'📅 ',ext:true}});
}
function extEvents(){const out=[];const from=addDays(TODAY,-120),to=addDays(TODAY,400);
  for(const sub of S.calsubs||[]){const c=loadExt(sub.id);const key=c.at+'|'+from;
    if(c.key!==key){try{c.expanded=expandICS(c.vevents||[],from,to,'x'+sub.id)}catch(e){c.expanded=[]}c.key=key}
    for(const e of c.expanded)out.push({...e,cat:'ext:'+sub.id,sub:sub.id})}
  return out}
async function authHeaders(){const{data}=await ctx.supabase.auth.getSession();const t=data?.session?.access_token;return {'Content-Type':'application/json',apikey:SUPABASE_KEY,...(t?{Authorization:'Bearer '+t}:{})}}
async function fetchSub(sub){
  const c=loadExt(sub.id);
  try{const r=await fetch(FN_URL,{method:'POST',headers:await authHeaders(),body:JSON.stringify({action:'ics',url:sub.url})});
    const txt=await r.text();if(!r.ok){let m='Fehler '+r.status;try{m=JSON.parse(txt).error||m}catch(e){}throw new Error(m)}
    const vev=parseICS(txt);storeExt(sub.id,{at:Date.now(),err:null,vevents:vev});return vev.length}
  catch(e){storeExt(sub.id,{...c,err:e.message||String(e),at:c.at});throw e}}
let subsBusy=false;
async function refreshSubs(force){if(subsBusy||!navigator.onLine||!FEAT().cal)return;subsBusy=true;let changed=false;
  for(const sub of S.calsubs||[]){const c=loadExt(sub.id);if(!force&&Date.now()-c.at<30*60000)continue;try{await fetchSub(sub);changed=true}catch(e){changed=true}}
  subsBusy=false;if(changed&&!layer.innerHTML)render()}
const SUBCOLORS=['#5B6584','#0E9F9B','#8A5CF0','#E2861B','#D94848','#2E9E4F','#B5651D','#7A8B99'];
function openSub(sub){
  const isNew=!sub;const f=sub?{...sub}:{id:uid(),url:'',name:'',color:SUBCOLORS[(S.calsubs||[]).length%SUBCOLORS.length],vis:'private',by:S.user};
  const c=isNew?null:loadExt(f.id);
  openSheet(`<h3>${isNew?'Kalender abonnieren':esc(f.name||'Kalender')}</h3>
  <div class="field"><label for="sb-url">Kalender-Link (iCal / ICS)</label><input class="inp" id="sb-url" value="${esc(f.url)}" placeholder="https://… oder webcal://…" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
  <details class="cat helpbox"><summary>Wo finde ich den Link?</summary><div class="hint" style="margin:6px 2px">
   <b>Google:</b> calendar.google.com am Computer → Einstellungen → Kalender wählen → „Privatadresse im iCal-Format“ kopieren.<br>
   <b>iCloud / Apple:</b> Kalender-App → Kalender (ⓘ) → „Öffentlicher Kalender“ einschalten → Link teilen/kopieren.<br>
   <b>Outlook:</b> outlook.com → Einstellungen → Kalender → Freigegebene Kalender → „Kalender veröffentlichen“ → ICS-Link kopieren.</div></details>
  <div class="field"><label for="sb-name">Name</label><input class="inp" id="sb-name" value="${esc(f.name)}" placeholder="z. B. Arbeit, Familie"></div>
  <div class="field"><span class="lbl">Farbe</span><div class="swatches" style="justify-content:flex-start">${SUBCOLORS.map(col=>`<button type="button" class="sw" style="background:${col}" data-sbc="${col}" aria-pressed="${f.color===col}" aria-label="Farbe"></button>`).join('')}</div></div>
  <div class="field"><span class="lbl">Wer sieht die Termine?</span><div class="seg vseg"><button type="button" data-sbv="private" aria-pressed="${f.vis!=='shared'}">Nur ich</button><button type="button" data-sbv="shared" aria-pressed="${f.vis==='shared'}">Beide</button></div></div>
  ${c?`<p class="hint">${c.err?'⚠️ '+esc(c.err):c.at?'Zuletzt aktualisiert: '+new Date(c.at).toLocaleString('de-DE',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})+' · '+(c.vevents||[]).length+' Einträge':'Noch nicht geladen'}</p>`:''}
  <p class="hint">Abonnierte Termine aktualisieren sich automatisch und sind in Spotzi nur zum Ansehen. Ändern kannst du sie im ursprünglichen Kalender.</p>
  <div class="btns">${isNew?'':'<button class="btn danger" id="sb-del">Entfernen</button>'}<button class="btn primary" id="sb-save">${isNew?'Abonnieren':'Speichern & aktualisieren'}</button></div>`,sh=>{
    const $=q=>sh.querySelector(q);
    sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.sbc){f.color=b.dataset.sbc;sh.querySelectorAll('[data-sbc]').forEach(x=>x.setAttribute('aria-pressed',x===b))}
      if(b.dataset.sbv){f.vis=b.dataset.sbv;sh.querySelectorAll('[data-sbv]').forEach(x=>x.setAttribute('aria-pressed',x===b))}});
    $('#sb-save').onclick=async()=>{f.url=$('#sb-url').value.trim();f.name=$('#sb-name').value.trim()||'Kalender';
      if(!/^(https?|webcals?):\/\//i.test(f.url)){toast('Bitte einen Link einfügen, der mit https:// oder webcal:// beginnt');return}
      const b=$('#sb-save');b.disabled=true;b.textContent='Wird geladen …';
      try{const n=await fetchSub(f);S.calsubs=S.calsubs||[];const i=S.calsubs.findIndex(x=>x.id===f.id);if(i>=0)S.calsubs[i]=f;else S.calsubs.push(f);save();closeSheet();render();toast(`${f.name}: ${n} Einträge geladen`)}
      catch(e){b.disabled=false;b.textContent=isNew?'Abonnieren':'Speichern & aktualisieren';toast('Konnte nicht geladen werden ('+(e.message||e)+')')}};
    const d=$('#sb-del');if(d)d.onclick=()=>{if(d.dataset.sure){S.calsubs=S.calsubs.filter(x=>x.id!==f.id);try{localStorage.removeItem('spozli-ics-'+f.id)}catch(e){}delete extCache[f.id];save();closeSheet();render();toast('Abo entfernt')}else{d.dataset.sure='1';d.textContent='Wirklich entfernen?'}};
    if(isNew)setTimeout(()=>$('#sb-url').focus(),50);
  });
}
function openImport(){
  let found=[];let cat=PICK[S.user][0][0];
  openSheet(`<h3>Kalender-Datei importieren</h3><p class="hint" style="margin-top:-6px">Wähle eine .ics-Datei (z. B. aus Google, Outlook oder Apple exportiert). Die Termine werden einmalig in Spotzi übernommen und sind danach normale Spotzi-Termine.</p>
  <div class="btns"><button class="btn" id="im-pick">Datei wählen</button></div><input type="file" id="im-file" accept=".ics,text/calendar" hidden>
  <div id="im-res"></div>`,sh=>{
    const $=q=>sh.querySelector(q);$('#im-pick').onclick=()=>$('#im-file').click();
    $('#im-file').onchange=async()=>{const fl=$('#im-file').files[0];if(!fl)return;try{found=toSpotziEvents(parseICS(await fl.text()),addDays(TODAY,-1))}catch(e){found=[]}
      $('#im-res').innerHTML=found.length?`<p><b>${found.length} Termine gefunden</b> (ab heute, Wiederholungen bleiben erhalten).</p>
       <div class="field"><span class="lbl">Für wen</span><div class="catpick">${PICK[S.user].map(([k,l])=>`<button type="button" data-imc="${k}" style="--cat:var(${CATS[k].v})" aria-pressed="${k===cat}">${l}</button>`).join('')}</div></div>
       <div class="btns"><button class="btn primary" id="im-go">Importieren</button></div>`:'<p class="hint">Keine kommenden Termine in dieser Datei gefunden.</p>'};
    sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.imc){cat=b.dataset.imc;sh.querySelectorAll('[data-imc]').forEach(x=>x.setAttribute('aria-pressed',x===b))}
      if(b.id==='im-go'){for(const ev of found)S.events.push({id:uid(),kind:'event',cat,nag:0,by:S.user,rems:ev.allday?[]:[S.defRem],...ev});save();closeSheet();render();toast(found.length+' Termine importiert')}});
  });
}
/* ---------- Spotzi im Apple Kalender (Abo-Link) ---------- */
const feedUrl=()=>S.prefs.feedToken?FN_URL.replace(/^https:/,'webcal:')+'?action=feed&t='+S.prefs.feedToken:null;
const newToken=()=>[...crypto.getRandomValues(new Uint8Array(18))].map(b=>b.toString(16).padStart(2,'0')).join('');
function remRow(r){
  const c=CATS[r.ev.cat];const isToday=iso(r.t)===TODAY,isTom=iso(r.t)===addDays(TODAY,1);
  const dl=isToday?'Heute':isTom?'Morgen':r.t.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});
  return `<button class="ritem" data-ev="${r.ev.id}" data-d="${r.d}"><div class="rt">${pad(r.t.getHours())}:${pad(r.t.getMinutes())}<small>${dl}</small></div>
   <div style="min-width:0"><div class="t">${esc(T(r.ev,r.d))}</div><div class="meta"><span class="tag" style="--cat:var(${c.v})">${c.label}</span><span>· ${remLabel(r.m)}</span></div></div></button>`;
}
let pushInfo={state:'checking',busy:false};
function pushCardHtml(){const st=pushInfo.state;
  const head=`<div class="setting"><div><b>Push auf diesem Gerät</b><div class="hint" style="margin:0">${
    st==='on'?'Aktiv. Erinnerungen, Morgen-Übersicht und Wasser kommen als Mitteilung.':
    st==='off'?'Noch nicht aktiviert.':
    st==='denied'?(isIOS()?'Mitteilungen sind blockiert. iPhone-Einstellungen → Mitteilungen → Spotzi → Mitteilungen erlauben.':'Mitteilungen sind im Browser blockiert.'):
    st==='install'?'Auf dem iPhone gehen Push-Nachrichten nur in der installierten App: In Safari Teilen → „Zum Home-Bildschirm“, dann Spotzi vom Home-Bildschirm öffnen.':
    st==='unsupported'?'Dieser Browser unterstützt keine Push-Nachrichten.':'Wird geprüft …'}</div></div>${st==='on'?'<span class="okbadge">✓</span>':''}</div>`;
  const btns=st==='off'?`<button class="btn primary" id="push-on"${pushInfo.busy?' disabled':''}>${pushInfo.busy?'Wird aktiviert …':'Push aktivieren'}</button>`:
    st==='on'?`<button class="btn" id="push-test"${pushInfo.busy?' disabled':''}>Test senden</button><button class="btn" id="push-off">Hier ausschalten</button>`:'';
  return head+(btns?`<div class="btns" style="margin-top:8px">${btns}</div>`:'')}
function drawPushCard(){const el=document.getElementById('pushcard');if(el)el.innerHTML=pushCardHtml()}
async function refreshPush(){try{pushInfo.state=await pushState()}catch(e){pushInfo.state='unsupported'}drawPushCard()}
async function pushAction(id){
  if(id==='push-on'){pushInfo.busy=true;drawPushCard();try{await enablePush(ctx.supabase);if(!S.pushOn){S.pushOn=true;save()}toast('Push ist aktiv');}catch(e){toast(e.message==='denied'?'Mitteilungen wurden abgelehnt':e.message==='dismissed'?'Nicht aktiviert':'Aktivieren fehlgeschlagen ('+e.message+')')}pushInfo.busy=false;await refreshPush();render()}
  if(id==='push-off'){try{await disablePush(ctx.supabase)}catch(e){}await refreshPush();toast('Push auf diesem Gerät aus')}
  if(id==='push-test'){pushInfo.busy=true;drawPushCard();try{await testPush(ctx.supabase);toast('Test gesendet. Kommt nichts an, prüfe den Fokus-Modus und Einstellungen › Mitteilungen › Spotzi.')}catch(e){toast('Test fehlgeschlagen ('+e.message+')')}pushInfo.busy=false;drawPushCard()}
}
function renderRem(){setTimeout(refreshPush,0);
  const rems=upcomingReminders(14);
  const groups={};rems.forEach(r=>{const k=iso(r.t);(groups[k]=groups[k]||[]).push(r)});
  const remOpts=REM_PRESETS.map(([m,l])=>`<option value="${m}"${S.defRem===m?' selected':''}>${l}</option>`).join('');
  const P=S.prefs;const sw=(id,on,lbl)=>`<button class="switch" role="switch" data-pref="${id}" aria-checked="${on}" aria-label="${lbl}"></button>`;
  const myCats=Object.entries(CATS).filter(([,c])=>c.owner===S.user||c.owner==='both');
  const W={...WATER_DEF,...S.prefs.water};
  return `<button class="more" data-go="home" style="margin-bottom:8px">‹ Zurück zur Startseite</button>
   <div class="card" id="pushcard">${pushCardHtml()}</div>
   <div class="card" style="margin-top:10px"><div class="setting"><div><b>Erinnerungen senden</b><div class="hint" style="margin:0">Hauptschalter für alle Push-Nachrichten an ${esc(USERS[S.user].name)}</div></div><button class="switch" role="switch" id="pushsw" aria-checked="${S.pushOn}" aria-label="Erinnerungen senden"></button></div>
   <div class="setting"><label for="defrem"><b>Standard für neue Termine</b></label><select class="inp" id="defrem">${remOpts}</select></div></div>
   <div class="section-title">Wasser trinken</div>
   <div class="card"><div class="setting"><div><b>Spotzi erinnert ans Trinken</b><div class="hint" style="margin:0">Mit Gläser-Zähler auf der Startseite</div></div><button class="switch" role="switch" data-wpref="on" aria-checked="${!!W.on}" aria-label="Wasser-Erinnerung"></button></div>
    <div ${W.on?'':'hidden'}><div class="setting"><label for="w-every">Wie oft</label><select class="inp" id="w-every" style="max-width:55%">${[[30,'Alle 30 Min'],[60,'Jede Stunde'],[90,'Alle 1,5 Std'],[120,'Alle 2 Std'],[180,'Alle 3 Std']].map(([v,l])=>`<option value="${v}"${W.every===v?' selected':''}>${l}</option>`).join('')}</select></div>
    <div class="setting"><span>Zeitfenster</span><span class="row" style="max-width:60%"><input type="time" class="inp" id="w-from" value="${W.from}" aria-label="Von"><input type="time" class="inp" id="w-to" value="${W.to}" aria-label="Bis"></span></div>
    <div class="setting"><label for="w-goal">Tagesziel</label><select class="inp" id="w-goal" style="max-width:55%">${[4,5,6,7,8,9,10,12].map(v=>`<option value="${v}"${W.goal===v?' selected':''}>${v} Gläser</option>`).join('')}</select></div>
    <p class="hint" style="margin:6px 2px 2px">Hast du dein Tagesziel erreicht, ist Spotzi für heute still.</p></div></div>
   <div class="section-title">Morgen-Übersicht</div>
   <div class="card"><div class="setting"><div><b>„Was steht heute an?“</b><div class="hint" style="margin:0">Jeden Morgen eine Push mit allen Terminen des Tages</div></div>${sw('morning',P.morning,'Morgen-Übersicht')}</div>
    <div class="setting"><label for="mtime"><b>Uhrzeit</b></label><input type="time" class="inp" id="mtime" value="${P.mtime}" style="max-width:130px"></div>
    <div class="setting"><span>Einkaufsliste mit anzeigen</span>${sw('mshop',P.mshop,'Einkaufsliste mit anzeigen')}</div>
    <div class="setting"><span>Spruch von Spotzi mitsenden</span>${sw('mquote',P.mquote,'Spruch von Spotzi')}</div>
    <div class="setting"><span>Auch am Wochenende</span>${sw('mweekend',P.mweekend,'Auch am Wochenende')}</div>
    <div class="setting"><span class="hint" style="margin:0">So sieht die Nachricht heute aus</span><button class="today-btn" id="mtest">Vorschau</button></div></div>
   <div class="section-title">Benachrichtigen bei</div>
   <div class="card">${myCats.map(([k,c])=>`<div class="setting"><span class="tag" style="--cat:var(${c.v});font-size:14px">${c.label}</span>${sw('cat:'+k,P.cats[k],c.label)}</div>`).join('')}
    <div class="setting"><div><span>Nachtruhe 22–7 Uhr</span><div class="hint" style="margin:0">Erinnerungen in der Nacht kommen erst um 7 Uhr</div></div>${sw('quiet',P.quiet,'Nachtruhe')}</div></div>
   ${Object.keys(groups).length?Object.entries(groups).map(([d,list])=>`<div class="section-title">${d===TODAY?'Heute':d===addDays(TODAY,1)?'Morgen':fmtDay(d)}<span>${list.length}</span></div><div class="rlist">${list.map(remRow).join('')}</div>`).join(''):'<div class="section-title">Geplant</div><div class="empty">Keine Erinnerungen in den nächsten zwei Wochen.</div>'}
   <p class="hint">Zeigt alle Erinnerungen der nächsten 14 Tage, die ${esc(USERS[S.user].name)} bekommt: eigene private Termine${S.user==='sevi'?', Filmen':''} und gemeinsame Termine.</p>`;
}

function renderCal(){
  const V=S.view;const views=[['agenda','Liste'],['day','Tag'],['3day','3 Tage'],['month','Monat']];
  const f=[['alle','Alles'],['privat',USERS[S.user].name],['gemeinsam','Beide']];
  let h=`<div class="seg vseg" role="group" aria-label="Ansicht">${views.map(([k,l])=>`<button data-view="${k}" aria-pressed="${V===k}">${l}</button>`).join('')}</div>`;
  h+=V==='month'?renderMonth():V==='agenda'?renderAgenda():renderGrid(V==='day'?1:3);
  h=h.replace('<!--FILTERS-->',`<div class="seg vseg" style="margin-top:0" role="group" aria-label="Kalender">${f.map(([k,l])=>`<button data-filter="${k}" aria-pressed="${S.filter===k}">${l}</button>`).join('')}</div>`);
  return h;
}
function renderGrid(n){
  const days=[...Array(n)].map((_,i)=>addDays(S.sel,i));
  const wd=d=>fromIso(d).toLocaleDateString('de-DE',{weekday:'short'});
  const title=n===1?fmtDay(S.sel):fromIso(days[0]).toLocaleDateString('de-DE',{day:'numeric',month:'short'})+' – '+fromIso(days[n-1]).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'});
  const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
  let head='<div></div>',all='<div class="lab">ganzt.</div>',cols='';
  days.forEach(d=>{
    const evs=eventsOn(d);
    head+=`<button data-day="${d}" class="${d===TODAY?'today':''} ${d===S.sel&&n>1?'sel':''}">${wd(d)}<b>${fromIso(d).getDate()}</b></button>`;
    {const top=evs.filter(e=>e.allday||spanOf(e)).sort((x,y)=>(spanOf(y)?1:0)-(spanOf(x)?1:0)||(spanOf(x)&&spanOf(y)?startOfOcc(x,d).localeCompare(startOfOcc(y,d)):0));const ci=days.indexOf(d);
    all+=`<div class="cell">${top.map(ev=>{if(!spanOf(ev))return `<button class="gchip" style="--cat:var(${CATS[ev.cat].v})" data-ev="${ev.id}" data-d="${d}">${esc(T(ev,d))}</button>`;
      const so=startOfOcc(ev,d);if(so!==d&&ci>0)return '<span class="gchip ph"></span>';
      const end=addDays(so,spanOf(ev));let n=1;while(ci+n<days.length&&days[ci+n]<=end)n++;
      return `<button class="gchip mspan${so<d?' cl':''}${end>days[ci+n-1]?' cr':''}" style="--cat:var(${CATS[ev.cat].v});--span:${n}" data-ev="${ev.id}" data-d="${d}">${CATS[ev.cat].sym}${esc(ev.title)}</button>`}).join('')}</div>`}
    const timed=evs.filter(e=>!e.allday&&!spanOf(e)).map(ev=>{const a=toMin(ev.time);let b=ev.end?toMin(ev.end):a+S.prefs.defDur;if(b<=a)b=a+S.prefs.defDur;return {ev,a,b}}).sort((x,y)=>x.a-y.a);
    const lanes=[];timed.forEach(t=>{let l=lanes.findIndex(e=>e<=t.a);if(l<0){l=lanes.length;lanes.push(0)}lanes[l]=t.b;t.l=l});
    const L=Math.max(1,lanes.length);
    let c=`<div class="gcol">`;
    for(let hh=0;hh<24;hh++)c+=`<button class="gslot" style="top:${hh*48}px" data-slot="${d}|${pad(hh)}:00" aria-label="Neuer Termin ${hh} Uhr"></button>`;
    timed.forEach(t=>{const top=t.a/60*48,ht=Math.max((t.b-t.a)/60*48-2,22);
      c+=`<button class="gev" style="--cat:var(${CATS[t.ev.cat].v});top:${top}px;height:${ht}px;left:calc(${t.l/L*100}% + 2px);width:calc(${100/L}% - 4px)" data-ev="${t.ev.id}" data-d="${d}"><b>${esc(t.ev.title)}</b>${ht>34?`<small>${t.ev.time}–${t.ev.end||fromMin(t.b)}</small>`:''}</button>`});
    if(d===TODAY)c+=`<div class="gnow" style="top:${nowMin/60*48}px"></div>`;
    cols+=c+'</div>';
  });
  let times='<div class="gtimes">';for(let hh=0;hh<24;hh++)times+=`<div>${hh?pad(hh)+':00':''}</div>`;times+='</div>';
  return `<div class="gnav"><button class="iconbtn" data-gnav="-${n}" aria-label="Zurück">‹</button><h2>${title}${S.prefs.kw?`<small>KW ${isoWeek(days[0])}</small>`:''}</h2>${days.includes(TODAY)?'':`<button class="today-btn" data-day="${TODAY}">Heute</button>`}<button class="iconbtn" data-gnav="${n}" aria-label="Weiter">›</button></div>
  <!--FILTERS-->
  <div class="gwrap" style="--n:${n}"><div class="ghead">${head}</div><div class="gall">${all}</div><div class="gbody" id="gbody">${times}${cols}</div></div>
  <p class="hint">Tippe auf eine freie Stunde, um dort einen Termin anzulegen.</p>`;
}
function renderAgenda(){
  let h='<!--FILTERS-->',cnt=0,lastKw=null;
  const ok=onceMulti();
  for(let i=0;i<45;i++){const d=addDays(S.sel,i);const evs=eventsOn(d).filter(ev=>ok(ev,d));if(!evs.length)continue;cnt++;
    const kw=isoWeek(d);
    h+=`<div class="section-title">${d===TODAY?'Heute':d===addDays(TODAY,1)?'Morgen':fmtDay(d)}<span>${S.prefs.kw&&kw!==lastKw?'KW '+kw:''}</span></div><div class="aday">${evs.map(ev=>evRow(ev,d)).join('')}</div>`;lastKw=kw}
  if(!cnt)h+='<div class="empty">In den nächsten Wochen steht nichts an.</div>';
  return h;
}
function renderMonth(){
  const [y,m]=S.month.split('-').map(Number);
  const first=new Date(y,m-1,1);const lead=S.prefs.weekStart===1?(first.getDay()+6)%7:first.getDay();
  const start=iso(new Date(y,m-1,1-lead));
  let cells='';
  const MAXL=2;
  for(let w=0;w<6;w++){
    const ws=addDays(start,w*7);if(w===5&&fromIso(ws).getMonth()!==m-1)break;
    const days=[...Array(7)].map((_,c)=>addDays(ws,c));const per=days.map(d=>eventsOn(d));
    // mehrtägige Termine: ein Balken pro Woche
    const segs=new Map();
    per.forEach((evs,c)=>evs.forEach(ev=>{if(!spanOf(ev))return;const so=startOfOcc(ev,days[c]);const k=ev.id+'|'+so;
      if(!segs.has(k))segs.set(k,{ev,so,a:c,b:c,first:so===days[c]});else segs.get(k).b=c}));
    const list=[...segs.values()].sort((x,y)=>x.a-y.a||(y.b-y.a)-(x.b-x.a));
    const lanes=[];const grid=days.map(()=>[]);
    list.forEach(sg=>{let l=0;while(lanes[l]!==undefined&&lanes[l]>=sg.a)l++;lanes[l]=sg.b;for(let c=sg.a;c<=sg.b;c++)grid[c][l]=sg});
    days.forEach((d,c)=>{const dd=fromIso(d);const slots=grid[c];
      per[c].filter(ev=>!spanOf(ev)).forEach(ev=>{let l=0;while(slots[l])l++;slots[l]={ev,single:true}});
      const total=per[c].length;let shown=0,html='';
      for(let l=0;l<MAXL;l++){const sl=slots[l];
        if(!sl){if(slots.slice(l+1,MAXL).some(Boolean))html+='<span class="mch ph"></span>';continue}
        const ev=sl.ev,pre=ev.kind==='bday'?'🎂 ':ev.kind==='anniv'?'💍 ':CATS[ev.cat].sym;shown++;
        if(sl.single){html+=`<span class="mch" style="--cat:var(${CATS[ev.cat].v})" data-ev="${ev.id}" data-d="${d}">${pre}${esc(ev.title)}</span>`;continue}
        if(sl.a!==c){html+=`<span class="mch ph" data-ev="${ev.id}" data-d="${d}"></span>`;continue}
        const n=sl.b-sl.a+1,end=addDays(sl.so,spanOf(ev));
        html+=`<span class="mch mspan${sl.first?'':' cl'}${end>days[sl.b]?' cr':''}" style="--cat:var(${CATS[ev.cat].v});--span:${n}" data-ev="${ev.id}" data-d="${d}">${pre}${esc(ev.title)}</span>`}
      const hidden=total-slots.slice(0,MAXL).filter(x=>x).length;
      cells+=`<button class="day${dd.getMonth()!==m-1?' other':''}${d===TODAY?' today':''}${d===S.sel?' sel':''}" data-day="${d}" aria-label="${fmtDay(d)}, ${total} Termine"><span class="n">${dd.getDate()}</span><span class="mchs">${html}${hidden>0?`<span class="mmore">+${hidden} weitere</span>`:''}</span></button>`});
  }
  const monthName=first.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  const dayEvs=eventsOn(S.sel);
  const up=[];{const ok=onceMulti();eventsOn(S.sel).forEach(ev=>ok(ev,S.sel));for(let i=1;i<=30&&up.length<5;i++){const d=addDays(S.sel,i);eventsOn(d).forEach(ev=>{if(up.length<5&&ok(ev,d))up.push([ev,d])})}}
  return `<!--FILTERS--><section class="month" style="margin-top:12px"><div class="month-head"><button class="iconbtn" data-mon="-1" aria-label="Voriger Monat">‹</button><h2>${monthName}</h2><div style="display:flex;gap:6px">${S.sel!==TODAY||S.month!==TODAY.slice(0,7)?'<button class="today-btn" data-day="'+TODAY+'">Heute</button>':''}<button class="iconbtn" data-mon="1" aria-label="Nächster Monat">›</button></div></div>
  <div class="grid7">${(S.prefs.weekStart===1?['Mo','Di','Mi','Do','Fr','Sa','So']:['So','Mo','Di','Mi','Do','Fr','Sa']).map(w=>`<div class="wd">${w}</div>`).join('')}${cells}</div>
  <div class="legend">${Object.values(CATS).filter(c=>c.owner===S.user||c.owner==='both').map(c=>`<span class="tag" style="--cat:var(${c.v})">${c.label}</span>`).join('')}</div></section>
  <div class="section-title">${S.sel===TODAY?'Heute':fmtDay(S.sel)}<span>${dayEvs.length} ${dayEvs.length===1?'Termin':'Termine'}</span></div>
  <div class="agenda">${dayEvs.length?dayEvs.map(ev=>evRow(ev,S.sel)).join(''):`<div class="empty">Nichts geplant. Tippe auf +, um einen Termin anzulegen.</div>`}</div>
  <div class="section-title">Demnächst</div>
  <div class="agenda">${up.length?up.map(([ev,d])=>evRow(ev,d,true)).join(''):`<div class="empty">In den nächsten 30 Tagen steht nichts an.</div>`}</div>`;
}
function evTime(ev,d){const mi=multi(ev,d);if(ev.allday)return 'Ganzt.';if(!mi||mi.first)return ev.time;if(mi.last)return '<span style="font-size:12px">bis</span> '+(ev.end||'');return 'Ganzt.'}
const onceMulti=()=>{const seen=new Set();return (ev,d)=>{if(!spanOf(ev))return true;const k=ev.id+'|'+startOfOcc(ev,d);if(seen.has(k))return false;seen.add(k);return true}};
function rangeLabel(ev,d){const s=startOfOcc(ev,d),e=addDays(s,spanOf(ev));const f=x=>fromIso(x).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});return f(s)+' – '+f(e)}
function evRow(ev,d,withDate){
  const c=CATS[ev.cat];
  const dl=fromIso(d).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});
  return `<button class="ev" style="--cat:var(${c.v})" data-ev="${ev.id}" data-d="${d}">
   <div class="time">${evTime(ev,d)}${withDate?`<small>${dl}</small>`:''}</div>
   <div style="min-width:0"><div class="t">${c.sym}${esc(T(ev,d))}</div><div class="meta"><span class="tag">${c.label}</span>${multi(ev,d)?`<span>· ${rangeLabel(ev,d)}${multi(ev,d).first?'':' (Tag '+(multi(ev,d).i+1)+'/'+multi(ev,d).n+')'}</span>`:''}${c.owner==='both'&&ev.by&&USERS[ev.by]?`<span>· von ${esc(USERS[ev.by].name)}</span>`:''}${ev.kind&&ev.kind!=='event'?`<span>· ${ev.kind==='bday'?'Geburtstag':'Jahrestag'}</span>`:ev.repeat!=='none'?`<span>· ${REPEAT[ev.repeat]}</span>`:''}</div></div>
   ${ev.ext?'':`<div class="bell" title="Erinnerungen">🔔 ${ev.rems.length}</div>`}</button>`;
}

let query='';
function renderShop(){
  const onList=new Set(S.list.map(i=>i.name.toLowerCase()));
  const q=query.trim().toLowerCase();
  let h=`<form class="search" id="addform"><input id="q" placeholder="Was braucht ihr?" autocomplete="off" value="${esc(query)}" aria-label="Artikel suchen oder hinzufügen"><button type="submit">Hinzufügen</button></form>`;
  if(q){
    const hits=[];CATALOG.forEach(([,items])=>items.forEach(([n])=>{if(n.toLowerCase().includes(q))hits.push(n)}));
    const exact=hits.some(n=>n.toLowerCase()===q);
    h+=`<div class="section-title">Vorschläge</div><div class="tiles">${hits.map(n=>tile(n,'',onList.has(n.toLowerCase())?'catalog on':'catalog',`data-add="${esc(n)}"`)).join('')}${exact?'':tile(query.trim(),'eigener Artikel','catalog',`data-add="${esc(query.trim())}"`)}</div>`;
  }
  h+=`<div class="section-title">Auf der Liste<span>${S.list.length} Artikel</span></div>`;
  h+=S.list.length?`<div class="tiles">${S.list.map(i=>tile(i.name,i.spec,'',`data-item="${i.id}"`,i.by)).join('')}</div><p class="hint">Antippen = gekauft. Lange drücken = Angabe wie „2 l“ oder „Bio“ ergänzen.</p>`:`<div class="empty">Alles erledigt. Tippe unten auf einen Artikel oder suche oben.</div>`;
  const rec=S.recent.filter(n=>!onList.has(n.toLowerCase()));
  if(rec.length)h+=`<div class="section-title">Zuletzt gekauft</div><div class="tiles">${rec.slice(0,8).map(n=>tile(n,'','done',`data-add="${esc(n)}"`)).join('')}</div>`;
  h+=`<div class="section-title">Alle Artikel</div>`;
  h+=CATALOG.map(([c,items],i)=>`<details class="cat"${i<2?' open':''}><summary>${c}</summary><div class="tiles">${items.map(([n])=>tile(n,'',onList.has(n.toLowerCase())?'catalog on':'catalog',`data-add="${esc(n)}"`)).join('')}</div></details>`).join('');
  return h;
}
function tile(name,spec,cls,attr,by){
  const ic=ICON[name]?`<span class="ic">${ICON[name]}</span>`:`<span class="ic letter">${esc(name.charAt(0).toUpperCase())}</span>`;
  const who=by&&by!==S.user?`<span class="sp">von ${USERS[by].name}</span>`:'';
  return `<button class="tile ${cls}" ${attr}>${ic}<span class="nm">${esc(name)}</span>${spec?`<span class="sp">${esc(spec)}</span>`:''}${!spec?who:''}</button>`;
}

/* ---------- Sheets ---------- */
function openSheet(html,onMount){
  layer.innerHTML=`<div class="overlay" id="ov"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  document.getElementById('ov').addEventListener('click',e=>{if(e.target.id==='ov')closeSheet()});
  const sheet=layer.querySelector('.sheet');swipeClose(sheet);
  onMount&&onMount(sheet);
}
const closeSheet=()=>{layer.innerHTML=''};
// Nach unten wischen schließt das Fenster (wie bei iOS)
function swipeClose(sh){
  let y0=null,x0=0,dy=0,drag=false,t0=0;
  sh.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const onGrab=!!e.target.closest('.grab');if(sh.scrollTop>0&&!onGrab){y0=null;return}y0=e.touches[0].clientY;x0=e.touches[0].clientX;dy=0;drag=false;t0=Date.now()},{passive:true});
  sh.addEventListener('touchmove',e=>{if(y0===null)return;const y=e.touches[0].clientY;dy=y-y0;
    if(!drag){if(dy>8&&Math.abs(dy)>Math.abs(e.touches[0].clientX-x0)&&sh.scrollTop<=0){drag=true;sh.style.transition='none';document.activeElement?.blur?.()}else if(dy<-4){y0=null;return}else return}
    e.preventDefault();sh.style.transform=`translateY(${Math.max(0,dy)}px)`;const ov=document.getElementById('ov');if(ov)ov.style.background=`rgba(5,15,18,${Math.max(0,.45-dy/900)})`},{passive:false});
  const end=()=>{if(y0===null)return;y0=null;if(!drag)return;drag=false;const fast=dy>60&&Date.now()-t0<250;
    if(dy>120||fast){sh.style.transition='transform .18s ease-in';sh.style.transform='translateY(110%)';setTimeout(closeSheet,170)}
    else{sh.style.transition='transform .2s ease-out';sh.style.transform='';const ov=document.getElementById('ov');if(ov)ov.style.background=''}};
  sh.addEventListener('touchend',end);sh.addEventListener('touchcancel',end);
}

function openDetail(id,d){
  const ev=S.events.find(x=>x.id===id)||extEvents().find(x=>x.id===id);if(!ev)return;
  if(ev.ext){const c=CATS[ev.cat]||{label:'Kalender',v:'--muted',sym:''};
    openSheet(`<h3>${esc(ev.title)}</h3><dl class="kv"><dt>Wann</dt><dd>${ev.endDate?fmtDay(ev.date)+(ev.allday?'':', '+ev.time+' Uhr')+' bis '+fmtDay(ev.endDate)+(ev.allday?'':', '+ev.end+' Uhr'):fmtDay(ev.date)+(ev.allday?', ganztägig':', '+ev.time+(ev.end?'–'+ev.end:'')+' Uhr')}</dd>
     <dt>Kalender</dt><dd><span class="tag" style="--cat:var(${c.v})">📅 ${esc(c.label)}</span></dd>${ev.loc?`<dt>Ort</dt><dd>${esc(ev.loc)}</dd>`:''}<dt>Sichtbar für</dt><dd>${c.owner==='both'?USERS.sevi.name+' und '+USERS.sie.name:'Nur dich'}</dd></dl>
     <p class="hint">Abonnierter Termin, nur zum Ansehen. Ändern kannst du ihn im ursprünglichen Kalender.</p>
     <div class="btns">${FEAT().countdown?'<button class="btn" id="mkcd">⏳ Countdown</button>':''}<button class="btn primary" id="ok">Fertig</button></div>`,s=>{s.querySelector('#ok').onclick=closeSheet;const m=s.querySelector('#mkcd');if(m)m.onclick=()=>openCountdown(null,{title:ev.title,date:ev.date,vis:c.owner==='both'?'shared':'private'})});return}
  const c=CATS[ev.cat];const st=startOf(ev,startOfOcc(ev,d));
  const rems=[...ev.rems].sort((a,b)=>b-a).map(m=>`<div class="rem"><span>${remLabel(m)}</span><small>${fmtShort(new Date(st-m*6e4))}</small></div>`).join('')||'<div class="who">Keine Erinnerung</div>';
  openSheet(`<h3>${esc(T(ev,d))}</h3>
  <dl class="kv"><dt>Wann</dt><dd>${spanOf(ev)?(()=>{const s0=startOfOcc(ev,d),e0=addDays(s0,spanOf(ev));return ev.allday?fmtDay(s0)+' bis '+fmtDay(e0)+', ganztägig':fmtDay(s0)+', '+ev.time+' Uhr bis '+fmtDay(e0)+', '+(ev.end||'')+' Uhr'})():fmtDay(d)+(ev.allday?', ganztägig':', '+ev.time+(ev.end?'–'+ev.end:'')+' Uhr')}</dd>
  <dt>Für</dt><dd><span class="tag" style="--cat:var(${c.v})">${c.sym}${c.label}</span></dd>
  <dt>Wiederholen</dt><dd>${REPEAT[ev.repeat]}</dd>
  <dt>Sichtbar für</dt><dd>${CATS[ev.cat].owner!=='both'?'Nur '+USERS[CATS[ev.cat].owner].name:(USERS.sevi.name+' und '+USERS.sie.name)}</dd>
  <dt>Erinnert wird</dt><dd>${remindees(ev.cat)}${CATS[ev.cat].owner==='both'?' (beide per Push)':''}</dd>
  <dt>Nachhaken</dt><dd>${NAG[ev.nag]}</dd>
  ${ev.note?`<dt>Notiz</dt><dd>${esc(ev.note)}</dd>`:''}
  <dt>Eingetragen</dt><dd>von ${USERS[ev.by].name}</dd></dl>
  <div class="field"><span class="lbl">Erinnerungen</span><div class="rems">${rems}</div></div>
  <div class="btns"><button class="btn" id="test">Erinnerung testen</button>${FEAT().countdown?'<button class="btn" id="mkcd">⏳ Countdown</button>':''}<button class="btn primary" id="edit">Bearbeiten</button></div>`,s=>{
    s.querySelector('#edit').onclick=()=>openForm(ev);
    const m=s.querySelector('#mkcd');if(m)m.onclick=()=>openCountdown(null,{title:ev.title,date:startOfOcc(ev,d)>=TODAY?startOfOcc(ev,d):d,icon:ev.kind==='bday'?'🎂':ev.kind==='anniv'?'💍':'⏳',vis:CATS[ev.cat].owner==='both'?'shared':'private'});
    s.querySelector('#test').onclick=()=>{closeSheet();const m=ev.rems.length?Math.min(...ev.rems):0;push(ev,m)};
  });
}

function openForm(ev,preset){
  const isNew=!ev;
  const f=ev?JSON.parse(JSON.stringify(ev)):{id:uid(),title:'',cat:PICK[S.user][0][0],date:(preset&&preset.date)||S.sel,time:(preset&&preset.time)||'12:00',allday:false,repeat:'none',rems:[S.defRem],nag:0,note:'',by:S.user};
  if(f.allday&&!f.time)f.time='12:00';
  if(!f.end)f.end=fromMin(toMin(f.time)+S.prefs.defDur);
  const picks=[...PICK[S.user]];if(!picks.some(p=>p[0]===f.cat))picks.push([f.cat,CATS[f.cat].label]);
  openSheet(`<h3>${isNew?'Neuer Termin':'Termin bearbeiten'}</h3>
  <div class="seg vseg" id="f-kind" role="group" aria-label="Art">${[['event','Termin'],['bday','Geburtstag'],['anniv','Jahrestag']].map(([k,l])=>`<button type="button" data-kind="${k}" aria-pressed="${(f.kind||'event')===k}">${l}</button>`).join('')}</div>
  <div class="field"><label for="f-title" id="f-title-l">Titel</label><input class="inp" id="f-title" placeholder="Neuer Termin" value="${esc(f.title)}"></div>
  <div class="field"><span class="lbl">Für wen</span><div class="catpick" id="f-cat">${picks.map(([k,l])=>`<button type="button" data-cat="${k}" style="--cat:var(${CATS[k].v})" aria-pressed="${f.cat===k}">${l}</button>`).join('')}</div></div>
  <div class="field"><div class="row"><div><label class="lbl" for="f-date">Von</label><input type="date" class="inp" id="f-date" value="${f.date}"></div><div id="f-endwrap"><label class="lbl" for="f-edate">Bis</label><input type="date" class="inp" id="f-edate" value="${f.endDate||f.date}" min="${f.date}"></div></div><div class="row" id="timewrap"><div><label class="lbl" for="f-time">Beginn</label><input type="time" class="inp" id="f-time" value="${f.time}"></div><div><label class="lbl" for="f-end">Ende</label><input type="time" class="inp" id="f-end" value="${f.end}"></div></div>
  <label class="check" id="f-alldaywrap"><input type="checkbox" id="f-allday" ${f.allday?'checked':''}> Ganztägig (Erinnerung bezieht sich auf 9:00 Uhr)</label></div>
  <div class="field" id="f-yearwrap"><label for="f-year" id="f-year-l">Geburtsjahr (optional)</label><input type="number" class="inp" id="f-year" inputmode="numeric" placeholder="z. B. 1990" value="${f.year||''}"></div>
  <div class="field" id="f-repwrap"><label for="f-rep">Termin wiederholen</label><select class="inp" id="f-rep">${Object.entries(REPEAT).map(([k,l])=>`<option value="${k}"${f.repeat===k?' selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field"><span class="lbl">Erinnerungen (wann)</span><div class="rems" id="f-rems"></div>
   <div class="row"><select class="inp" id="f-preset"><option value="">+ Erinnerung hinzufügen</option>${REM_PRESETS.map(([m,l])=>`<option value="${m}">${l}</option>`).join('')}<option value="custom">Eigene Zeit …</option></select></div>
   <div class="row" id="customrow" hidden><input type="number" min="1" class="inp" id="f-cn" value="3" aria-label="Anzahl"><select class="inp" id="f-cu" aria-label="Einheit"><option value="1">Minuten vorher</option><option value="60" selected>Stunden vorher</option><option value="1440">Tage vorher</option><option value="10080">Wochen vorher</option></select><button type="button" class="btn" id="f-cadd" style="flex:0 0 auto">Hinzufügen</button></div></div>
  <div class="field"><label for="f-nag">Erneut erinnern (wie oft)</label><select class="inp" id="f-nag">${Object.entries(NAG).map(([k,l])=>`<option value="${k}"${String(f.nag)===k?' selected':''}>${l}</option>`).join('')}</select></div>
  <div class="who" id="f-who"></div>
  <div class="field" style="margin-top:14px"><label for="f-note">Notiz</label><textarea class="inp" id="f-note" rows="2" placeholder="Optional">${esc(f.note)}</textarea></div>
  <div class="btns">${isNew?'':'<button class="btn danger" id="f-del">Löschen</button>'}<button class="btn primary" id="f-save">Speichern</button></div>`,s=>{
    const $=q=>s.querySelector(q);
    const drawRems=()=>{
      f.rems=[...new Set(f.rems)].sort((a,b)=>b-a);
      $('#f-rems').innerHTML=f.rems.length?f.rems.map(m=>`<div class="rem"><span>🔔 ${remLabel(m)}</span><button type="button" data-rm="${m}" aria-label="Entfernen">✕</button></div>`).join(''):'<div class="who">Noch keine Erinnerung</div>';
    };
    const drawWho=()=>{const c=CATS[f.cat];$('#f-who').textContent=c.owner==='both'?'Sichtbar für beide. '+USERS.sevi.name+' und '+USERS.sie.name+' bekommen die Erinnerungen.':'Nur für dich sichtbar, nur du wirst erinnert.'};
    const drawAll=()=>{$('#timewrap').hidden=$('#f-allday').checked};
    const drawKind=()=>{const k=f.kind||'event',sp=k!=='event';
      $('#f-yearwrap').hidden=!sp;$('#f-repwrap').hidden=sp;$('#f-alldaywrap').hidden=sp;$('#f-endwrap').hidden=sp;
      if(sp){$('#f-allday').checked=true;$('#f-rep').value='yearly'}
      $('#f-title-l').textContent=k==='bday'?'Wer hat Geburtstag?':k==='anniv'?'Was feiert ihr?':'Titel';
      $('#f-title').placeholder=k==='bday'?'z. B. Mama':k==='anniv'?'z. B. Sevi & Vivien':'Neuer Termin';
      $('#f-year-l').textContent=k==='bday'?'Geburtsjahr (optional, für das Alter)':'Seit welchem Jahr? (optional)';drawAll()};
    $('#f-kind').onclick=e=>{const b=e.target.closest('[data-kind]');if(!b)return;const was=f.kind||'event';f.kind=b.dataset.kind;
      s.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',x===b));
      if(was==='event'&&f.kind!=='event'&&isNew){f.rems=[10080,0];f.cat='gemeinsam';s.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.cat==='gemeinsam'));drawRems();drawWho()}
      if(f.kind==='event'){$('#f-allday').checked=false;$('#f-rep').value='none'}
      drawKind()};
    drawRems();drawWho();drawKind();
    $('#f-cat').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;f.cat=b.dataset.cat;s.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',x===b));drawWho()};
    $('#f-allday').onchange=drawAll;
    let lastDate=f.date;$('#f-date').onchange=e=>{const v=e.target.value;if(!v)return;const ed=$('#f-edate');const span=ed.value&&ed.value>lastDate?dayNum(ed.value)-dayNum(lastDate):0;ed.min=v;ed.value=addDays(v,span);lastDate=v};
    let lastStart=f.time;$('#f-time').onchange=e=>{const v=e.target.value;if(!v)return;const dur=toMin($('#f-end').value||fromMin(toMin(lastStart)+S.prefs.defDur))-toMin(lastStart);$('#f-end').value=fromMin(toMin(v)+(dur>0?dur:S.prefs.defDur));lastStart=v};
    $('#f-rems').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){f.rems=f.rems.filter(m=>m!==+b.dataset.rm);drawRems()}};
    $('#f-preset').onchange=e=>{const v=e.target.value;if(v==='custom'){$('#customrow').hidden=false}else if(v!==''){f.rems.push(+v);drawRems()}e.target.value=''};
    $('#f-cadd').onclick=()=>{const n=Math.max(1,parseInt($('#f-cn').value)||1);f.rems.push(n*+$('#f-cu').value);drawRems();$('#customrow').hidden=true};
    $('#f-save').onclick=()=>{
      f.title=$('#f-title').value.trim()||'Neuer Termin';f.date=$('#f-date').value||S.sel;{const ed=$('#f-edate').value;f.endDate=ed&&ed>f.date?ed:null}f.allday=$('#f-allday').checked;f.time=f.allday?null:($('#f-time').value||'12:00');f.end=f.allday?null:($('#f-end').value||'');if(f.time&&!f.endDate&&(!f.end||toMin(f.end)<=toMin(f.time)))f.end=fromMin(toMin(f.time)+S.prefs.defDur);
      f.repeat=$('#f-rep').value;f.kind=f.kind||'event';f.year=f.kind!=='event'?(parseInt($('#f-year').value)||null):null;if(f.kind!=='event'){f.allday=true;f.time=null;f.end=null;f.endDate=null;f.repeat='yearly'}f.nag=+$('#f-nag').value;f.note=$('#f-note').value.trim();
      const i=S.events.findIndex(x=>x.id===f.id);if(i>=0)S.events[i]=f;else S.events.push(f);
      S.sel=f.date;S.month=f.date.slice(0,7);save();closeSheet();render();const other=USERS[S.user==='sevi'?'sie':'sevi'].name;toast(CATS[f.cat].owner==='both'?(isNew?'Gespeichert, '+other+' bekommt eine Push':'Gespeichert, '+other+' sieht die Änderung'):(isNew?'Termin gespeichert':'Änderungen gespeichert'));
    };
    const del=$('#f-del');if(del)del.onclick=()=>{
      if(del.dataset.sure){S.events=S.events.filter(x=>x.id!==f.id);save();closeSheet();render();toast('Termin gelöscht')}
      else{del.dataset.sure='1';del.textContent='Wirklich löschen?'}
    };
    if(isNew)setTimeout(()=>$('#f-title').focus(),50);
  });
}

function openSpec(id){
  const it=S.list.find(x=>x.id===id);if(!it)return;
  openSheet(`<h3>${esc(it.name)}</h3><div class="field"><label for="sp">Angabe</label><input class="inp" id="sp" placeholder="z. B. 2 l, Bio, laktosefrei" value="${esc(it.spec)}"></div>
  <div class="btns"><button class="btn danger" id="sp-del">Entfernen</button><button class="btn primary" id="sp-ok">Speichern</button></div>`,s=>{
    const inp=s.querySelector('#sp');setTimeout(()=>inp.focus(),50);
    s.querySelector('#sp-ok').onclick=()=>{it.spec=inp.value.trim();save();closeSheet();render()};
    s.querySelector('#sp-del').onclick=()=>{S.list=S.list.filter(x=>x.id!==id);save();closeSheet();render()};
  });
}

function openSettings(){
  const P=S.prefs;
  const sel=(id,opts,val)=>`<select class="inp" id="${id}" style="max-width:55%">${opts.map(([v,l])=>`<option value="${v}"${String(val)===String(v)?' selected':''}>${l}</option>`).join('')}</select>`;
  const sw=(id,on,l)=>`<button class="switch" role="switch" data-sp="${id}" aria-checked="${on}" aria-label="${l}"></button>`;
  const D={...DESIGN_DEF,...P.design};
  openSheet(`<h3>Einstellungen</h3>
  <div class="sgroup">Design für ${esc(USERS[S.user].name)}</div><div class="card">
   <div class="setting col"><span>Erscheinungsbild</span><div class="seg vseg" style="margin:0">${[['auto','Automatisch'],['light','Hell'],['dark','Dunkel']].map(([k,l])=>`<button type="button" data-dtheme="${k}" aria-pressed="${D.theme===k}">${l}</button>`).join('')}</div></div>
   <div class="setting col"><div class="head"><span>Akzentfarbe</span>${D.accent?'<button class="more" data-dacc="">Standard</button>':''}</div><div class="swatches" style="justify-content:flex-start">${ACCENTS.map(c=>`<button class="sw" style="background:${c}" data-dacc="${c}" aria-label="Akzentfarbe ${c}" aria-pressed="${D.accent===c}"></button>`).join('')}<label class="sw swc" aria-label="Eigene Farbe" style="background:${D.accent&&!ACCENTS.includes(D.accent)?D.accent:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'}"><input type="color" id="d-acc" value="${D.accent||'#4C5BD4'}"></label></div></div>
   <div class="setting col"><span>Hintergrund</span><div class="bgpick">
    <button type="button" data-dbg="none" aria-pressed="${D.bg==='none'}"><i style="background:var(--bg)"></i>Standard</button>
    <button type="button" data-dbg="color" aria-pressed="${D.bg==='color'}"><i style="background:${D.bgColor}"></i>Farbe</button>
    <button type="button" data-dbg="grad" aria-pressed="${D.bg==='grad'}"><i style="background:${(GRADS[D.grad]||GRADS.ozean)[1]}"></i>Verlauf</button>
    <button type="button" data-dbg="photo" aria-pressed="${D.bg==='photo'}"><i style="background:${media.photo?`center/cover url(${media.photo})`:'var(--surface-2)'}">${media.photo?'':'📷'}</i>Foto</button>
    <button type="button" data-dbg="mood" aria-pressed="${D.bg==='mood'}"><i class="mini-mood">${media.mood.slice(0,4).map(u=>`<img src="${u}" alt="">`).join('')||'🖼️'}</i>Moodboard</button></div>
    ${D.bg==='color'?`<label class="row" style="align-items:center;margin-top:8px"><span>Farbe wählen</span><input type="color" id="d-bgc" value="${D.bgColor}" style="width:60px;height:36px;border:0;background:none"></label>`:''}
    ${D.bg==='grad'?`<div class="swatches" style="justify-content:flex-start;margin-top:8px">${Object.entries(GRADS).map(([k,[n,g]])=>`<button class="sw" style="background:${g}" data-dgrad="${k}" aria-label="${n}" title="${n}" aria-pressed="${D.grad===k}"></button>`).join('')}</div>`:''}
    ${D.bg==='photo'?`<div class="btns" style="margin-top:8px"><button class="btn" id="d-photo">${media.photo?'Anderes Foto':'Foto wählen'}</button></div>`:''}
    ${D.bg==='mood'?`<div class="moodedit">${media.mood.map((u,i)=>`<div class="mthumb"><img src="${u}" alt=""><button type="button" data-mdel="${i}" aria-label="Bild entfernen">✕</button></div>`).join('')}${media.mood.length<6?'<button type="button" class="madd" id="d-madd">+ Fotos</button>':''}</div><p class="hint" style="margin:6px 0 0">Bis zu 6 Fotos, Spotzi legt sie als Collage an.</p>`:''}
    ${D.bg!=='none'?`<label class="setting" style="padding-inline:0"><span>Schleier über dem Hintergrund</span><input type="range" min="0" max="80" step="5" id="d-veil" value="${D.veil}" style="max-width:45%"></label>`:''}
    ${D.bg==='photo'||D.bg==='mood'?'<p class="hint" style="margin:2px 0 0">Fotos bleiben nur auf diesem Gerät gespeichert.</p>':''}
    <input type="file" accept="image/*" id="d-file" hidden><input type="file" accept="image/*" id="d-mfile" multiple hidden></div></div>
  <div class="sgroup">Funktionen für ${esc(USERS[S.user].name)}</div><div class="card">
   ${[['cal','Kalender','📅'],['todo','To-dos','✅'],['habits','Habits','🔥'],['house','Haushalt','🧹'],['shop','Einkaufsliste','🛒'],['countdown','Countdowns','⏳']].map(([k,l,i])=>`<div class="setting"><span>${i} ${l}</span><button class="switch" role="switch" data-feat="${k}" aria-checked="${FEAT()[k]}" aria-label="${l}"></button></div>`).join('')}
   <div class="setting"><span>🌱 Spotzi-Sprüche</span><button class="switch" role="switch" data-sp="lumo" aria-checked="${P.lumo!==false}" aria-label="Spotzi-Sprüche"></button></div>
   <div class="setting"><span>💧 Wasser trinken</span><button class="switch" role="switch" data-featw="1" aria-checked="${!!(P.water&&P.water.on)}" aria-label="Wasser trinken"></button></div>
   <p class="hint" style="margin:6px 2px 2px">Ausgeschaltetes verschwindet aus der Leiste und von der Startseite. Deine Daten bleiben erhalten.</p></div>
  ${FEAT().cal?`<div class="sgroup">Andere Kalender</div><div class="card">
   ${(S.calsubs||[]).map(c=>{const x=loadExt(c.id);return `<div class="setting"><span class="tag" style="--cat:${c.color};font-size:14px;color:var(--ink)">${esc(c.name)}${c.vis==='shared'?' · Beide':''}${x.err?' ⚠️':''}</span><button class="today-btn" data-sub="${c.id}">Bearbeiten</button></div>`}).join('')}
   <div class="setting"><div><span>Kalender abonnieren</span><div class="hint" style="margin:0">Google, iCloud, Outlook … per Link, aktualisiert sich automatisch</div></div><button class="today-btn" id="sub-new">+ Abo</button></div>
   <div class="setting"><div><span>Datei importieren</span><div class="hint" style="margin:0">Einmalig aus einer .ics-Datei übernehmen</div></div><button class="today-btn" id="imp">Import</button></div></div>
  <div class="sgroup">Spotzi im iPhone-Kalender</div><div class="card">
   ${feedUrl()?`<div class="setting col"><span>Deine Spotzi-Termine als Kalender-Abo</span><div class="feedurl">${esc(feedUrl())}</div>
    <div class="btns" style="margin-top:6px"><a class="btn primary" href="${esc(feedUrl())}">Im Kalender abonnieren</a><button class="btn" id="feed-copy">Link kopieren</button></div>
    <button class="more" id="feed-new" style="margin-top:6px">Neuen Link erzeugen (alter wird ungültig)</button></div>`:`<div class="setting"><div><span>Spotzi-Termine im Apple Kalender</span><div class="hint" style="margin:0">Deine Termine erscheinen als Abo im iPhone-Kalender (nur lesen)</div></div><button class="today-btn" id="feed-new">Link erstellen</button></div>`}
   <p class="hint" style="margin:6px 2px 2px">Enthält deine privaten und die gemeinsamen Termine. Teile den Link mit niemandem. Der iPhone-Kalender aktualisiert das Abo selbst (Einstellungen → Kalender → Accounts → Abrufen).</p></div>`:''}
  <div class="sgroup">Kalender</div><div class="card">
   <div class="setting"><label for="s-ws">Erster Wochentag</label>${sel('s-ws',[[1,'Montag'],[0,'Sonntag']],P.weekStart)}</div>
   <div class="setting"><label for="s-view">Standardansicht</label>${sel('s-view',[['agenda','Liste'],['day','Tag'],['3day','3 Tage'],['month','Monat']],P.defView)}</div>
   <div class="setting"><span>Kalenderwochen anzeigen</span>${sw('kw',P.kw,'Kalenderwochen')}</div>
   <div class="setting"><label for="s-ds">Tagesansicht beginnt um</label>${sel('s-ds',[5,6,7,8,9,10].map(h=>[h,h+':00 Uhr']),P.dayStart)}</div></div>
  <div class="sgroup">Neue Termine</div><div class="card">
   <div class="setting"><label for="s-dur">Standarddauer</label>${sel('s-dur',[[15,'15 Min'],[30,'30 Min'],[45,'45 Min'],[60,'1 Std'],[90,'1,5 Std'],[120,'2 Std']],P.defDur)}</div>
   <div class="setting"><label for="s-rem">Standard-Erinnerung</label>${sel('s-rem',REM_PRESETS,S.defRem)}</div>
   <div class="setting"><span>Zeitzone</span><span class="hint" style="margin:0">${esc(Intl.DateTimeFormat().resolvedOptions().timeZone||'Automatisch')} (automatisch)</span></div></div>
  <div class="sgroup">Kategorien &amp; Farben</div><div class="card">
   ${Object.entries(CATS).filter(([,c])=>!c.ext&&(c.owner===S.user||c.owner==='both')).map(([k,c])=>{const cur=P.colors[k]||'';return `<div class="setting col"><div class="head"><span class="tag" style="--cat:var(${c.v});font-size:14px">${c.label}</span>${cur?`<button class="more" data-reset="${k}">Standard</button>`:''}</div><div class="swatches" style="justify-content:flex-start">${COLORS.map(col=>`<button class="sw" style="background:${col}" data-col="${k}|${col}" aria-label="Farbe ${col}" aria-pressed="${cur===col}"></button>`).join('')}</div></div>`}).join('')}</div>
  <div class="sgroup">Spotzi</div><div class="card"><div class="setting"><div><span>Spotzi auf der Startseite</span><div class="hint" style="margin:0">Täglicher Gedanke, Atemübung, Notizen</div></div>${sw('lumo',P.lumo!==false,'Spotzi anzeigen')}</div></div>
  <div class="sgroup">Benachrichtigungen</div><div class="card"><div class="setting"><span>Push, Morgen-Übersicht, Nachtruhe, alle Erinnerungen</span><button class="today-btn" id="s-go-rem">Öffnen</button></div></div>
  <div class="btns" style="margin-top:18px"><button class="btn primary" id="s-done">Fertig</button></div>`,sh=>{
    const upd=()=>{save();render();const y=sh.scrollTop;openSettings();layer.querySelector('.sheet').scrollTop=y};
    const setD=o=>{P.design={...DESIGN_DEF,...P.design,...o};upd()};
    sh.addEventListener('input',e=>{if(e.target.id==='d-veil'){P.design={...DESIGN_DEF,...P.design,veil:+e.target.value};applyDesign()}});
    sh.addEventListener('change',async e=>{const id=e.target.id,v=e.target.value;
      if(id==='d-veil'){save();return}
      if(id==='d-acc'){setD({accent:v});return}
      if(id==='d-bgc'){setD({bgColor:v});return}
      if(id==='d-file'){const f=e.target.files[0];if(!f)return;try{media.photo=await resizeImage(f,1600,false,.8);await setMedia('photo',media.photo);setD({bg:'photo'})}catch(err){toast('Foto konnte nicht geladen werden')}return}
      if(id==='d-mfile'){const fs=[...e.target.files].slice(0,6-media.mood.length);try{for(const f of fs)media.mood.push(await resizeImage(f,900,false,.78));await setMedia('mood',media.mood);setD({bg:'mood'})}catch(err){toast('Foto konnte nicht geladen werden')}return}
      if(id==='s-ws')P.weekStart=+v;if(id==='s-view'){P.defView=v;S.view=v}if(id==='s-ds')P.dayStart=+v;if(id==='s-dur')P.defDur=+v;if(id==='s-rem')S.defRem=+v;
      save();render();toast('Gespeichert')});
    sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.dtheme){setD({theme:b.dataset.dtheme});return}
      if(b.dataset.feat){P.features={...FEAT_DEF,...P.features,[b.dataset.feat]:!FEAT()[b.dataset.feat]};upd();return}
      if(b.dataset.featw){P.water={...WATER_DEF,...P.water,on:!(P.water&&P.water.on)};upd();return}
      if(b.dataset.sub){openSub(S.calsubs.find(x=>x.id===b.dataset.sub));return}
      if(b.id==='sub-new'){openSub(null);return}
      if(b.id==='imp'){openImport();return}
      if(b.id==='feed-new'){P.feedToken=newToken();upd();toast('Abo-Link erstellt');return}
      if(b.id==='feed-copy'){navigator.clipboard?.writeText(feedUrl()).then(()=>toast('Link kopiert'),()=>{});return}
      if(b.dataset.dacc!==undefined){setD({accent:b.dataset.dacc||null});return}
      if(b.dataset.dgrad){setD({grad:b.dataset.dgrad});return}
      if(b.dataset.dbg){const k=b.dataset.dbg;if(k==='photo'&&!media.photo){sh.querySelector('#d-file').click();return}if(k==='mood'&&!media.mood.length){sh.querySelector('#d-mfile').click();return}setD({bg:k});return}
      if(b.id==='d-photo'){sh.querySelector('#d-file').click();return}
      if(b.id==='d-madd'){sh.querySelector('#d-mfile').click();return}
      if(b.dataset.mdel!==undefined){media.mood.splice(+b.dataset.mdel,1);setMedia('mood',media.mood);if(!media.mood.length)P.design={...DESIGN_DEF,...P.design,bg:'none'};upd();return}
      if(b.dataset.sp){P[b.dataset.sp]=!P[b.dataset.sp];upd()}
      else if(b.dataset.col){const[k,c]=b.dataset.col.split('|');P.colors[k]=c;upd()}
      else if(b.dataset.reset){delete P.colors[b.dataset.reset];upd()}
      else if(b.id==='s-go-rem'){closeSheet();S.tab='rem';save();render();window.scrollTo(0,0)}
      else if(b.id==='s-done')closeSheet()});
  });
}

function openAccount(){
  const me=USERS[S.user].name,partner=ctx.partnerJoined;
  const other=S.user==='sevi'?'sie':'sevi';
  openSheet(`<div class="profhead">${avatarHtml(S.user,'bigav','id="av-pick" aria-label="Profilbild ändern"')}<div><h3 style="margin:0">${esc(me)}</h3><p class="hint" style="margin:2px 0 0">Angemeldet als ${esc(ctx.email||'')}</p></div></div>
  <div class="btns" style="margin-top:10px"><button class="btn" id="av-btn">${(S.avatars||{})[S.user]?'Profilbild ändern':'Profilbild wählen'}</button>${(S.avatars||{})[S.user]?'<button class="btn" id="av-del">Entfernen</button>':''}</div><input type="file" accept="image/*" id="av-file" hidden>
  <div class="card" style="margin-top:10px">${partner?`<div class="setting"><span>Verbunden mit</span><span style="display:flex;align-items:center;gap:8px">${avatarHtml(other,'avatar sm','tabindex="-1"')}<b>${esc(USERS[other].name)}</b></span></div>`:`<div class="setting col"><b>Partner einladen</b><span class="hint" style="margin:0">Schick diesen Code an die zweite Person. Sie erstellt in Spotzi ein Konto und wählt „Ich habe einen Einladungscode“.</span><div class="invite" id="invite">${esc(ctx.inviteCode||'')}</div><button class="btn" id="copy-code">Code kopieren</button></div>`}
   <div class="setting"><span>Synchronisierung</span><span class="hint" style="margin:0">${syncText()}</span></div></div>
  <div class="btns" style="margin-top:16px"><button class="btn danger" id="logout">Abmelden</button><button class="btn primary" id="acc-ok">Fertig</button></div>`,sh=>{
    sh.querySelector('#acc-ok').onclick=closeSheet;
    const fi=sh.querySelector('#av-file');sh.querySelector('#av-btn').onclick=()=>fi.click();sh.querySelector('#av-pick').onclick=()=>fi.click();
    fi.onchange=async()=>{const f=fi.files[0];if(!f)return;try{const img=await resizeImage(f,256,true,.85);S.avatars={...(S.avatars||{}),[S.user]:img};save();render();openAccount();toast('Profilbild gespeichert')}catch(e){toast('Bild konnte nicht geladen werden')}};
    const ad=sh.querySelector('#av-del');if(ad)ad.onclick=()=>{S.avatars={...(S.avatars||{}),[S.user]:null};save();render();openAccount()};
    sh.querySelector('#logout').onclick=e=>{const b=e.target;if(ctx.store.pending()&&!b.dataset.sure){b.dataset.sure='1';b.textContent='Ungesendete Änderungen! Trotzdem abmelden?';return}if(!b.dataset.sure2&&!ctx.store.pending()){b.dataset.sure2='1';b.textContent='Wirklich abmelden?';return}ctx.onSignOut()};
    const cc=sh.querySelector('#copy-code');if(cc)cc.onclick=()=>{navigator.clipboard?.writeText(ctx.inviteCode).then(()=>toast('Code kopiert'),()=>{})};
  });
}

/* ---------- Feedback ---------- */
let toastT;
function toast(msg,undo){
  clearTimeout(toastT);let t=document.getElementById('toast');if(t)t.remove();
  t=document.createElement('div');t.className='toast';t.id='toast';t.innerHTML=`<span>${esc(msg)}</span>${undo?'<button>Rückgängig</button>':''}`;
  document.body.appendChild(t);if(undo)t.querySelector('button').onclick=()=>{undo();t.remove()};
  toastT=setTimeout(()=>t.remove(),Math.max(3500,msg.length*70));
}
let pushT;
function pushRaw(title,body){
  clearTimeout(pushT);let p=document.getElementById('push');if(p)p.remove();
  p=document.createElement('div');p.className='push';p.id='push';p.setAttribute('role','status');
  p.innerHTML=`<div class="logo">${lumoSvg('happy')}</div><div><div class="h"><span>SPOZLI</span><span>${esc(S.prefs.mtime)}</span></div><b>${esc(title)}</b><p style="white-space:pre-line">${esc(body)}</p></div>`;
  document.body.appendChild(p);p.onclick=()=>p.remove();pushT=setTimeout(()=>p.remove(),7000);
}
function morningPush(){
  const evs=eventsOn(TODAY).filter(ev=>relevant(ev)&&S.prefs.cats[ev.cat]!==false);
  let body=evs.length?evs.map(ev=>(ev.allday?'Ganztägig':ev.time)+'  '+T(ev,TODAY)).join('\n'):'Heute keine Termine.';
  if(S.prefs.mshop&&S.list.length)body+='\nEinkauf: '+S.list.length+' Artikel ('+S.list.slice(0,3).map(i=>i.name).join(', ')+(S.list.length>3?' …':'')+')';
  {const td=(S.todos||[]).filter(t=>todoVisible(t)&&mine(t)&&!t.done&&t.due&&t.due<=TODAY);if(td.length)body+='\nTo-dos: '+td.map(t=>t.title).slice(0,3).join(', ')+(td.length>3?' …':'');}
  {const hc=(S.chores||[]).filter(c=>choreMine(c)&&c.due<=TODAY);if(hc.length)body+='\nHaushalt: '+hc.map(c=>c.title).join(', ');}
  if(S.prefs.mquote&&S.prefs.lumo!==false)body+='\nSpotzi: '+LUMO[(dayOfYear()-1)%LUMO.length][0];
  pushRaw('Guten Morgen, '+USERS[S.user].name+'! Das steht heute an',body);
}
function push(ev,m){
  clearTimeout(pushT);let p=document.getElementById('push');if(p)p.remove();
  const when=m===0?'Jetzt':m<60?`In ${m} Min`:m<1440?`In ${Math.round(m/60)} Std`:m<10080?`In ${Math.round(m/1440)} ${Math.round(m/1440)===1?'Tag':'Tagen'}`:`In ${Math.round(m/10080)} ${Math.round(m/10080)===1?'Woche':'Wochen'}`;
  p=document.createElement('div');p.className='push';p.id='push';p.setAttribute('role','status');
  p.innerHTML=`<div class="logo">${lumoSvg('happy')}</div><div><div class="h"><span>SPOZLI</span><span>jetzt</span></div><b>${esc(T(ev))}</b><p>${when}${ev.allday?'':' · '+ev.time+' Uhr'} · ${CATS[ev.cat].label}</p></div>`;
  document.body.appendChild(p);p.onclick=()=>p.remove();pushT=setTimeout(()=>p.remove(),5000);
}

/* ---------- Shop actions ---------- */
function addItem(name){
  name=name.trim();if(!name)return;
  const ex=S.list.find(i=>i.name.toLowerCase()===name.toLowerCase());
  if(ex){S.list=S.list.filter(i=>i!==ex);toast(name+' von der Liste genommen');}
  else{S.list.push({id:uid(),name,spec:'',by:S.user,addedAt:Date.now()});S.recent=S.recent.filter(n=>n.toLowerCase()!==name.toLowerCase());toast(name+' hinzugefügt')}
  save();render();
}
function buy(id,el){
  const it=S.list.find(x=>x.id===id);if(!it)return;
  const done=()=>{const idx=S.list.indexOf(it);S.list.splice(idx,1);S.recent=[it.name,...S.recent.filter(n=>n!==it.name)].slice(0,12);save();render();
    toast(it.name+' gekauft',()=>{S.list.splice(idx,0,it);S.recent=S.recent.filter(n=>n!==it.name);save();render()})};
  if(el){el.classList.add('leaving');setTimeout(done,220)}else done();
}

/* ---------- Events ---------- */
let lpT=null,lpFired=false;
app.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-item]');if(!t)return;lpFired=false;lpT=setTimeout(()=>{lpFired=true;openSpec(t.dataset.item)},480)});
['pointerup','pointerleave','pointercancel'].forEach(n=>app.addEventListener(n,()=>clearTimeout(lpT)));
app.addEventListener('contextmenu',e=>{const t=e.target.closest('[data-item]');if(t){e.preventDefault();clearTimeout(lpT);if(!lpFired){lpFired=true;openSpec(t.dataset.item)}}});
let lastDayTap={};
app.addEventListener('click',e=>{
  const mc=e.target.closest('.mch[data-ev]');if(mc){openDetail(mc.dataset.ev,mc.dataset.d);return}
  const t=e.target.closest('button');if(!t)return;
  if(t.id==='dash-edit'||t.id==='dash-done'){dashEdit=!dashEdit&&t.id==='dash-edit';render();return}
  if(t.id==='dash-reset'){delete S.prefs.dash;save();render();toast('Übersicht zurückgesetzt');return}
  if(t.dataset.dhide){const c=dashCfg();c.hide.push(t.dataset.dhide);dashSave(c);render();return}
  if(t.dataset.dshow){const c=dashCfg();c.hide=c.hide.filter(k=>k!==t.dataset.dshow);dashSave(c);render();return}
  if(dashEdit&&t.closest('.dtile'))return;
  if(t.dataset.cdone){doneChore(t.dataset.cdone);return}
  if(t.dataset.chore){openChore(S.chores.find(x=>x.id===t.dataset.chore));return}
  if(t.dataset.tpl){openChore(null,CHORE_TPL[+t.dataset.tpl]);return}
  if(t.dataset.hfilter){houseFilter=t.dataset.hfilter;render();return}
  if(t.dataset.tdone){toggleTodo(t.dataset.tdone);return}
  if(t.dataset.hdone){toggleHabit(t.dataset.hdone);return}
  if(t.dataset.habit){openHabit(S.habits.find(x=>x.id===t.dataset.habit));return}
  if(t.dataset.htpl){openHabit(null,HABIT_TPL[+t.dataset.htpl]);return}
  if(t.dataset.tmode){S.todoMode=t.dataset.tmode;save();render();return}
  if(t.dataset.water){const w=glassesToday()+ +t.dataset.water;S.prefs.glasses={d:TODAY,n:Math.max(0,w)};save();render();if(+t.dataset.water>0&&w===(S.prefs.water||{}).goal)toast('Tagesziel erreicht! Spotzi ist stolz 💧');return}
  if(t.dataset.todo){openTodo(S.todos.find(x=>x.id===t.dataset.todo));return}
  if(t.dataset.tfilter){todoFilter=t.dataset.tfilter;render();return}
  if(t.dataset.lumo){const a=t.dataset.lumo;if(a==='breathe')openBreathe();else if(a==='note')openNote();else{let i;do{i=Math.floor(Math.random()*LUMO.length)}while(i===lumoToday());lumoIdx=i;render();const f=document.getElementById('lumo-fig');if(f)f.classList.add('wiggle')}return}
  if(t.id==='who-btn'){openAccount();return}
  if(t.id==='settings-btn'){openSettings();return}
  if(t.dataset.view){S.view=t.dataset.view;save();render();scrollGrid();return}
  if(t.dataset.gnav){S.sel=addDays(S.sel,+t.dataset.gnav);S.month=S.sel.slice(0,7);save();render();scrollGrid();return}
  if(t.dataset.slot){const[d,tm]=t.dataset.slot.split('|');openForm(null,{date:d,time:tm});return}
  if(t.dataset.cd){if(t.dataset.cd==='new')openCountdown(null);else openCountdown(S.countdowns.find(x=>x.id===t.dataset.cd));return}
  
  if(t.dataset.go){S.tab=t.dataset.go;save();render();window.scrollTo(0,0);return}
  if(t.dataset.quick==='ev'){openForm(null);return}
  if(t.dataset.quick==='item'){S.tab='shop';save();render();document.getElementById('q').focus();return}
  if(t.dataset.pref){const k=t.dataset.pref;if(k.startsWith('cat:'))S.prefs.cats[k.slice(4)]=!S.prefs.cats[k.slice(4)];else S.prefs[k]=!S.prefs[k];save();render();return}
  if(t.id==='mtest'){morningPush();return}
  if(t.id==='push-on'||t.id==='push-off'||t.id==='push-test'){pushAction(t.id);return}
  if(t.dataset.wpref){S.prefs.water={...WATER_DEF,...S.prefs.water,on:!(S.prefs.water||{}).on};save();render();if(S.prefs.water.on&&pushInfo.state!=='on')toast('Tipp: Aktiviere oben Push, damit Spotzi dich erinnern kann');return}
  if(t.id==='pushsw'){S.pushOn=!S.pushOn;save();render();toast(S.pushOn?'Push-Nachrichten an':'Push-Nachrichten aus');return}
  if(t.dataset.user){S.user=t.dataset.user;save();render();return}
  if(t.dataset.day){const now=Date.now();if(lastDayTap.d===t.dataset.day&&now-lastDayTap.t<450&&FEAT().cal){lastDayTap={};openForm(null,{date:t.dataset.day});return}lastDayTap={d:t.dataset.day,t:now};S.sel=t.dataset.day;if(t.dataset.day.slice(0,7)!==S.month)S.month=t.dataset.day.slice(0,7);save();render();return}
  if(t.dataset.mon){const d=fromIso(S.month+'-01');d.setMonth(d.getMonth()+ +t.dataset.mon);S.month=iso(d).slice(0,7);render();return}
  if(t.dataset.filter){S.filter=t.dataset.filter;save();render();return}
  if(t.dataset.ev){openDetail(t.dataset.ev,t.dataset.d);return}
  if(t.dataset.item){if(lpFired){lpFired=false;return}buy(t.dataset.item,t);return}
  if(t.dataset.add!==undefined){addItem(t.dataset.add);query='';return}
});
app.addEventListener('change',e=>{if(e.target.id==='mtime'){S.prefs.mtime=e.target.value||'07:30';save();toast('Morgen-Übersicht um '+S.prefs.mtime+' Uhr')}
  if(e.target.id==='defrem'){S.defRem=+e.target.value;save();toast('Standard: '+remLabel(S.defRem))}
  const wk={'w-every':['every',Number],'w-from':['from',String],'w-to':['to',String],'w-goal':['goal',Number]}[e.target.id];
  if(wk&&e.target.value){S.prefs.water={...WATER_DEF,...S.prefs.water,[wk[0]]:wk[1](e.target.value)};save();toast('Gespeichert')}});
app.addEventListener('submit',e=>{if(e.target.id==='tadd'){e.preventDefault();const v=document.getElementById('tq').value.trim();if(!v)return;const nt={id:uid(),title:v,scope:'privat',by:S.user,assignee:S.user,due:null,time:null,remind:null,remindAt:null,repeat:'none',note:'',done:false};S.todos.push(nt);save();render();document.getElementById('tq').blur();askRemind(nt);return}
  if(e.target.id==='addform'){e.preventDefault();const v=document.getElementById('q').value;query='';addItem(v)}});
app.addEventListener('input',e=>{if(e.target.id==='q'){query=e.target.value;const pos=e.target.selectionStart;render();const q=document.getElementById('q');q.focus();q.setSelectionRange(pos,pos)}});
document.querySelectorAll('nav.tabs [data-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;save();render();window.scrollTo(0,0)});
fab.onclick=()=>S.tab==='habits'?openHabit(null):S.tab==='todo'?openTodo(null):S.tab==='house'?openChore(null):openForm(null);
function scrollGrid(){const g=document.getElementById('gbody');if(g)g.scrollTop=S.prefs.dayStart*48}
document.querySelectorAll('nav.tabs [data-tab]').forEach(b=>b.addEventListener('click',scrollGrid));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!layer.innerHTML&&dashEdit){dashEdit=false;render()}else closeSheet()}});
app.addEventListener('pointerdown',dashDown);app.addEventListener('pointermove',dashMove);app.addEventListener('pointerup',dashUp);app.addEventListener('pointercancel',dashUp);
WIDE.addEventListener('change',()=>{render();scrollGrid()});
render();scrollGrid();
setTimeout(()=>refreshSubs(false),1500);
setTimeout(()=>ensureRegistered(ctx.supabase),2500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSubs(false)});
window.addEventListener('online',()=>refreshSubs(false));
let pendingRender=false;
const typing=()=>{const a=document.activeElement;return a&&(a.id==='q'||a.id==='tq')};
app.addEventListener('focusout',()=>{setTimeout(()=>{if(pendingRender&&!typing()){pendingRender=false;render()}},50)});
return {
  remoteChanged(){load();if(TZ&&S.prefs.tz!==TZ){S.prefs.tz=TZ;save()}if(typing())pendingRender=true;else render()},
  setStatus(st){syncState=st;const el=document.getElementById('syncline');if(el)el.innerHTML=syncText()}
};

}
