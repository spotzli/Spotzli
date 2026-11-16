import { lumoSvg } from './figure.js';

export function startApp(ctx){
const USERS=ctx.users;
const CATS={
  filmen:{label:'Filmen',owner:'sevi',v:'--c-film'},
  sevi_privat:{priv:true,label:'Privat',short:'Privat',owner:'sevi',v:'--c-sevi'},
  gemeinsam:{label:'Gemeinsam',owner:'both',v:'--c-both'},
  sie_privat:{priv:true,label:'Privat',short:'Privat',owner:'sie',v:'--c-her'}
};
const PICK={sevi:[['filmen','Filmen'],['sevi_privat','Privat'],['gemeinsam','Beide']],sie:[['sie_privat','Privat'],['gemeinsam','Gemeinsam']]};
if(!ctx.filmen)PICK.sevi=PICK.sevi.filter(p=>p[0]!=='filmen');
const REM_PRESETS=[[0,'Zum Termin'],[5,'5 Min vorher'],[15,'15 Min vorher'],[30,'30 Min vorher'],[60,'1 Std vorher'],[120,'2 Std vorher'],[1440,'1 Tag vorher'],[2880,'2 Tage vorher'],[10080,'1 Woche vorher']];
const REPEAT={none:'Nie',daily:'Täglich',weekly:'Wöchentlich',biweekly:'Alle 2 Wochen',monthly:'Monatlich',yearly:'Jährlich'};
const NAG={0:'Nein',1:'1× erneut nach 10 Min',2:'2× erneut, alle 10 Min',99:'Bis ich bestätige (alle 15 Min)'};
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
const LUMO=[
 ['Du musst heute nicht alles schaffen. Ein Schritt nach dem anderen reicht völlig.','calm','Stress','Was ist heute der eine wichtigste Schritt?'],
 ['Atme einmal tief ein. Dieser Moment gehört nur dir.','calm','Stress','Wo in deinem Körper spürst du gerade Anspannung?'],
 ['Nervös sein heißt, dass dir etwas wichtig ist. Das ist eine Stärke.','cheer','Nervosität','Was ist dir an der heutigen Aufgabe wichtig?'],
 ['Du bist nicht allein. Es gibt Menschen, die gerade an dich denken.','hug','Nicht allein','Wem könntest du heute eine kurze Nachricht schicken?'],
 ['Gefühle sind wie Wetter. Auch dieser Sturm zieht weiter.','calm','Angst','Was hat dir früher geholfen, als es schwer war?'],
 ['Du hast schon so viele schwere Tage geschafft. Deine Bilanz ist 100 %.','cheer','Selbstvertrauen','Auf was von letzter Woche bist du stolz?'],
 ['Es ist okay, Pausen zu machen. Auch ein Akku lädt nicht beim Rennen.','cozy','Stress','Wann gönnst du dir heute 10 Minuten nur für dich?'],
 ['Sei heute so freundlich zu dir, wie du es zu einem guten Freund wärst.','hug','Selbstvertrauen','Was würdest du einem Freund in deiner Lage sagen?'],
 ['Angst flüstert oft lauter, als die Wahrheit spricht.','think','Angst','Welcher Gedanke macht dir gerade Sorgen, und wie wahrscheinlich ist er wirklich?'],
 ['Allein sein heißt nicht einsam sein. Du bist auch für dich selbst gute Gesellschaft.','cozy','Nicht allein','Was machst du gern, wenn du ganz für dich bist?'],
 ['Kleine Fortschritte sind auch Fortschritte.','cheer','Selbstvertrauen','Welcher kleine Fortschritt ist dir diese Woche gelungen?'],
 ['Du darfst Nein sagen. Auch das ist Selbstfürsorge.','happy','Stress','Wozu möchtest du diese Woche Nein sagen?'],
 ['Spür kurz deine Füße auf dem Boden. Du bist hier, du bist sicher.','calm','Angst','Nenne drei Dinge, die du gerade sehen kannst.'],
 ['Du musst nicht perfekt sein, um wertvoll zu sein.','hug','Selbstvertrauen','Wo darfst du heute etwas lockerer mit dir sein?'],
 ['Mut heißt nicht, keine Angst zu haben. Mut heißt, trotzdem einen Schritt zu gehen.','cheer','Nervosität','Welcher kleine mutige Schritt wartet heute auf dich?'],
 ['Heute ist ein guter Tag, um dir selbst zu vertrauen.','happy','Selbstvertrauen','Welche deiner Stärken brauchst du heute?'],
 ['Wenn alles zu viel wird: Wasser trinken, Fenster auf, dreimal tief atmen.','calm','Stress','Was brauchst du gerade am meisten?'],
 ['Menschen, die dich lieben, sind auch da, wenn sie nicht neben dir sind.','hug','Nicht allein','An welchen schönen gemeinsamen Moment denkst du gern zurück?'],
 ['Dein Wert hängt nicht davon ab, wie produktiv du heute bist.','cozy','Stress','Was hat dich heute zum Lächeln gebracht?'],
 ['Gedanken sind keine Tatsachen. Lass sie vorbeiziehen wie Wolken.','think','Angst','Welchen Gedanken möchtest du heute einfach ziehen lassen?'],
 ['Vor etwas Neuem aufgeregt zu sein ist normal. Dein Körper macht sich bereit.','happy','Nervosität','Worauf freust du dich insgeheim ein bisschen?'],
 ['Du bist genug. Genau so, wie du heute bist.','hug','Selbstvertrauen','Was magst du an dir?'],
 ['Frag dich heute einmal: Wie geht es mir eigentlich wirklich?','think','Reflexion','Wie geht es dir ehrlich, auf einer Skala von 1 bis 10?'],
 ['Dankbarkeit macht das Herz ruhig. Schon eine Kleinigkeit zählt.','cozy','Reflexion','Für welche drei Dinge bist du heute dankbar?'],
 ['Du darfst um Hilfe bitten. Das ist kein Zeichen von Schwäche.','hug','Nicht allein','Wen könntest du um Unterstützung bitten?'],
 ['Langsam ist auch eine Geschwindigkeit.','calm','Stress','Wo kannst du heute bewusst langsamer machen?'],
 ['Was du heute säst, wächst morgen, auch wenn man es noch nicht sieht.','happy','Reflexion','Was möchtest du dieses Jahr wachsen lassen?'],
 ['Ein schwerer Moment ist kein schwerer Tag. Und ein schwerer Tag ist kein schweres Leben.','calm','Angst','Was war heute trotz allem gut?']
];
const dayOfYear=()=>{const n=new Date();return Math.floor((n-new Date(n.getFullYear(),0,0))/864e5)};
let lumoIdx=null;
function lumoToday(){return lumoIdx===null?dayOfYear()%LUMO.length:lumoIdx}
function renderSpozli(){
  const [txt,mood,topic,q]=LUMO[lumoToday()];
  const note=(S.notes||{})[TODAY];
  return `<div class="section-title">Spozli sagt<span>${topic}</span></div><div class="card">
   <div class="lumo"><div id="lumo-fig">${lumoSvg(mood)}</div><div class="bubble">${esc(txt)}</div></div>
   <p class="lumo-q"><b>Zum Nachdenken:</b> ${esc(q)}</p>
   ${note?`<div class="lumo-note">${esc(note)}</div>`:''}
   <div class="lumo-btns"><button data-lumo="breathe">Durchatmen</button><button data-lumo="note">${note?'Notiz ändern':'Gedanken notieren'}</button><button data-lumo="next">Noch ein Gedanke</button></div></div>`;
}
function openBreathe(){
  openSheet(`<div class="breathe-wrap breathing">${lumoSvg('calm')}<div class="breathe-txt" id="btxt">Einatmen …</div><div class="hint" id="bcount">Atme mit Spozli: 4 Sekunden ein, 4 Sekunden aus.</div></div>
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
  <p class="hint">Haushaltsaufgaben sind getrennt von To-dos und sehen beide. Bei „Abwechselnd“ wechselt Spozli nach jedem Erledigen automatisch, wer dran ist.</p>`;
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
function todoRow(t){
  const over=!t.done&&t.due&&t.due<TODAY;
  const who=t.scope==='privat'?'Privat':t.assignee==='both'?'Beide':USERS[t.assignee].name;
  return `<div class="todo${t.done?' done':''}"><button class="tchk${t.done?' on':''}" data-tdone="${t.id}" aria-label="${t.done?'Wieder öffnen':'Erledigt'}">✓</button>
   <button class="tbody" data-todo="${t.id}"><div class="t">${esc(t.title)}</div><div class="meta">${t.due?`<span class="${over?'over':''}">${over?'Überfällig · ':''}${dueLabel(t.due)}${t.time?' '+t.time:''}</span>`:''}${t.repeat!=='none'?`<span>🔁 ${TREP[t.repeat]}</span>`:''}${t.remind!==null&&t.remind!==undefined?'<span>🔔</span>':''}</div></button></div>`;
}
let todoFilter='alle';
function renderTodo(){
  S.todos=S.todos||[];
  let list=S.todos.filter(todoVisible);
  const open=list.filter(t=>!t.done).sort((a,b)=>(a.due||'9999')+(a.time||'')<(b.due||'9999')+(b.time||'')?-1:1);
  const groups=[['Überfällig',open.filter(t=>t.due&&t.due<TODAY)],['Heute',open.filter(t=>t.due===TODAY)],['Demnächst',open.filter(t=>t.due&&t.due>TODAY)],['Ohne Datum',open.filter(t=>!t.due)]];
  const done=list.filter(t=>t.done);
  const f=[['alle','Alle'],['mir','Für mich'],['gemeinsam','Gemeinsam']];
  return `<form class="qadd" id="tadd"><input id="tq" placeholder="Neues To-do, z. B. Müll raus" autocomplete="off" aria-label="Neues To-do"><button type="submit">Hinzufügen</button></form>
  ${open.length?groups.filter(g=>g[1].length).map(([n,l])=>`<div class="section-title">${n}<span>${l.length}</span></div><div class="todos">${l.map(todoRow).join('')}</div>`).join(''):'<div class="empty" style="margin-top:12px">Alles erledigt. Spozli ist stolz auf euch.</div>'}
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
  const f=t?JSON.parse(JSON.stringify(t)):{id:uid(),title:'',scope:'privat',by:S.user,assignee:S.user,due:null,time:null,remind:null,repeat:'none',note:'',done:false};
  const segBtns=(name,opts,val)=>opts.map(([k,l])=>`<button type="button" data-${name}="${k}" aria-pressed="${val===k}">${l}</button>`).join('');
  openSheet(`<h3>${isNew?'Neues To-do':'To-do bearbeiten'}</h3>
  <div class="field"><label for="t-title">Was ist zu tun?</label><input class="inp" id="t-title" value="${esc(f.title)}" placeholder="z. B. Müll rausbringen"></div>
  <div class="field"><div class="row"><div><label class="lbl" for="t-due">Fällig am (optional)</label><input type="date" class="inp" id="t-due" value="${f.due||''}"></div><div><label class="lbl" for="t-time">Uhrzeit</label><input type="time" class="inp" id="t-time" value="${f.time||''}"></div></div></div>
  <div class="field"><label for="t-rem">Erinnerung</label><select class="inp" id="t-rem">${Object.entries(TREMIND).map(([k,l])=>`<option value="${k}"${String(f.remind??'')===k?' selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field"><label for="t-rep">Wiederholen</label><select class="inp" id="t-rep">${Object.entries(TREP).map(([k,l])=>`<option value="${k}"${f.repeat===k?' selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field"><label for="t-note">Notiz</label><textarea class="inp" id="t-note" rows="2" placeholder="Optional">${esc(f.note)}</textarea></div>
  <div class="btns">${isNew?'':'<button class="btn danger" id="t-del">Löschen</button>'}<button class="btn primary" id="t-save">Speichern</button></div>`,sh=>{
    const $=q=>sh.querySelector(q);
    $('#t-save').onclick=()=>{f.title=$('#t-title').value.trim()||'Ohne Titel';f.due=$('#t-due').value||null;f.time=$('#t-time').value||null;const r=$('#t-rem').value;f.remind=r===''?null:(r==='morning'?'morning':+r);f.repeat=$('#t-rep').value;f.note=$('#t-note').value.trim();
      if(f.repeat!=='none'&&!f.due)f.due=TODAY;
      const i=S.todos.findIndex(x=>x.id===f.id);if(i>=0)S.todos[i]=f;else S.todos.push(f);save();closeSheet();render();
      toast(f.scope==='gemeinsam'&&f.assignee!==S.user&&isNew?USERS[f.assignee==='both'?(S.user==='sevi'?'sie':'sevi'):f.assignee].name+' bekommt eine Push':'Gespeichert')};
    const d=$('#t-del');if(d)d.onclick=()=>{if(d.dataset.sure){S.todos=S.todos.filter(x=>x.id!==f.id);save();closeSheet();render();toast('Gelöscht')}else{d.dataset.sure='1';d.textContent='Wirklich löschen?'}};
    if(isNew)setTimeout(()=>$('#t-title').focus(),50);
  });
}
const COLORS=['#8A5CF0','#2F7DEB','#0E9F9B','#DE4F8A','#E2861B','#2E9E4F','#D94848','#5B6584'];
function applyColors(){const r=document.documentElement.style;Object.entries(CATS).forEach(([k,c])=>{const v=S.prefs&&S.prefs.colors[k];if(v)r.setProperty(c.v,v);else r.removeProperty(c.v)})}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const fmtDay=s=>fromIso(s).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
const fmtShort=d=>d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})+', '+pad(d.getHours())+':'+pad(d.getMinutes());
const remLabel=m=>{const p=REM_PRESETS.find(x=>x[0]===m);if(p)return p[1];if(m%10080===0)return (m/10080)+' Wochen vorher';if(m%1440===0)return (m/1440)+' Tage vorher';if(m%60===0)return (m/60)+' Std vorher';return m+' Min vorher'};

const DEFAULT_PREFS={morning:true,mtime:'07:30',mshop:true,mweekend:true,cats:{filmen:true,sevi_privat:true,gemeinsam:true,sie_privat:true},quiet:true,lumo:true,mquote:true,weekStart:1,defView:'month',kw:true,dayStart:7,defDur:60,colors:{}};
const S={user:ctx.me,tab:'home',sel:TODAY,month:TODAY.slice(0,7),filter:'alle',defRem:60,pushOn:true,events:[],todos:[],chores:[],choreLog:[],list:[],recent:[],notes:{},prefs:{...DEFAULT_PREFS}};
try{const ui=JSON.parse(localStorage.getItem('spozli-ui')||'{}');if(ui.tab)S.tab=ui.tab;if(ui.view)S.view=ui.view;if(['alle','privat','gemeinsam'].includes(ui.filter))S.filter=ui.filter}catch(e){}
function load(){ctx.store.applyToState(S);S.prefs={...DEFAULT_PREFS,...S.prefs,cats:{...DEFAULT_PREFS.cats,...(S.prefs.cats||{})},colors:{...(S.prefs.colors||{})}}}
load();if(!S.view)S.view=S.prefs.defView;
const save=()=>{try{localStorage.setItem('spozli-ui',JSON.stringify({tab:S.tab,view:S.view,filter:S.filter}))}catch(e){}ctx.store.commit(S)};
let syncState={online:navigator.onLine,pending:0};
function syncText(){const p=syncState.pending;if(!syncState.online)return `<span class="dotst off"></span>Offline${p?` · ${p} ${p===1?'Änderung wartet':'Änderungen warten'}`:''}. Wird automatisch übertragen.`;return p?`<span class="dotst wait"></span>Wird synchronisiert …`:`<span class="dotst ok"></span>Synchronisiert`}

function occursOn(ev,d){
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
const eventsOn=d=>S.events.filter(ev=>occursOn(ev,d)&&visible(ev)).sort((a,b)=>(a.allday?'00':a.time).localeCompare(b.allday?'00':b.time));
function startOf(ev,d){const t=fromIso(d);if(ev.allday)t.setHours(9,0);else{const[h,m]=ev.time.split(':').map(Number);t.setHours(h,m)}return t}
function remindees(cat){const o=CATS[cat].owner;return o==='both'?(USERS.sevi.name+' und '+USERS.sie.name):USERS[o].name}

const app=document.getElementById('app'),layer=document.getElementById('layer'),fab=document.getElementById('fab');

function render(){
  applyColors();
  ['home','cal','todo','house','shop'].forEach(t=>document.getElementById('tab-'+t).setAttribute('aria-current',S.tab===t?'page':'false'));
  fab.hidden=!(S.tab==='cal'||S.tab==='home'||S.tab==='todo'||S.tab==='house');
  const me=USERS[S.user].name;
  const hr=new Date().getHours();const greet=hr<11?'Guten Morgen':hr<18?'Hallo':'Guten Abend';
  const titles={home:[fmtDay(TODAY),greet+', '+me],cal:['Unser Kalender','Kalender'],shop:['Unsere Liste','Einkauf'],todo:['Zu erledigen','To-dos'],house:['Wiederkehrend','Haushalt'],rem:['Für '+me,'Erinnerungen']};
  const [sm,big]=titles[S.tab];
  let h=`<header class="top"><div class="hello"><small>${esc(sm)}</small><h1>${esc(big)}</h1></div>
  <div class="toprow"><button class="avatar" id="who-btn" style="--av:var(${S.user==='sevi'?'--c-sevi':'--c-her'})" aria-label="Angemeldet als ${me}">${me.charAt(0)}</button><button class="gear" id="settings-btn" aria-label="Einstellungen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button></div></header>`;
  h+={home:renderHome,cal:renderCal,todo:renderTodo,house:renderHouse,shop:renderShop,rem:renderRem}[S.tab]();
  h+=`<div class="syncline" id="syncline">${syncText()}</div>`;
  app.innerHTML=h;
}

const relevant=ev=>{const o=CATS[ev.cat].owner;return o===S.user||o==='both'};
function upcomingReminders(days){
  const now=Date.now(),out=[];
  for(let i=0;i<=days;i++){const d=addDays(TODAY,i);
    S.events.forEach(ev=>{if(!relevant(ev)||!occursOn(ev,d))return;const st=startOf(ev,d);
      ev.rems.forEach(m=>{const t=st-m*6e4;if(t>=now)out.push({ev,d,m,t:new Date(t)})})})}
  return out.sort((a,b)=>a.t-b.t);
}
function renderHome(){
  const todays=eventsOn(TODAY).filter(relevant);
  const nowHM=pad(new Date().getHours())+':'+pad(new Date().getMinutes());
  const next=todays.find(ev=>ev.allday||ev.time>=nowHM);
  const rems=upcomingReminders(14);
  const big=next?`Als Nächstes: ${esc(next.title)}${next.allday?'':' um '+next.time}`:todays.length?'Für heute ist alles erledigt':'Heute steht nichts an';
  const soon=[];for(let i=0;i<=2&&soon.length<4;i++){const d=addDays(TODAY,i);eventsOn(d).forEach(ev=>{if(soon.length<4)soon.push([ev,d])})}
  return `<section class="hero"><div class="lab">Heute</div><div class="big">${big}</div>
   <div class="stats"><button class="stat" data-go="cal"><b>${todays.length}</b><span>Termine heute</span></button><button class="stat" data-go="shop"><b>${S.list.length}</b><span>Auf der Liste</span></button><button class="stat" data-go="rem"><b>${rems.filter(r=>r.t-Date.now()<864e5).length}</b><span>Erinnerungen 24 h</span></button></div></section>
  <div class="quick"><button data-quick="ev">+ Termin</button><button data-quick="item">+ Artikel</button></div>
  ${S.prefs.lumo!==false?renderSpozli():''}
  <div class="section-title">Kalender<button class="more" data-go="cal">Alle anzeigen</button></div>
  <div class="card"><div class="agenda">${soon.length?soon.map(([ev,d])=>evRow(ev,d,true)).join(''):'<div class="empty">Die nächsten drei Tage sind frei.</div>'}</div></div>
  ${(()=>{const out=[];for(let i=0;i<=90&&out.length<4;i++){const d=addDays(TODAY,i);eventsOn(d).filter(ev=>ev.kind&&ev.kind!=='event').forEach(ev=>{if(out.length<4)out.push([ev,d,i])})}
    return out.length?`<div class="section-title">Geburtstage &amp; Jahrestage</div><div class="card"><div class="agenda">${out.map(([ev,d,i])=>`<button class="ev" style="--cat:var(${CATS[ev.cat].v})" data-ev="${ev.id}" data-d="${d}"><div class="time">${i===0?'Heute':i===1?'Morgen':'in '+i+' T.'}<small>${fromIso(d).toLocaleDateString('de-DE',{day:'numeric',month:'short'})}</small></div><div style="min-width:0"><div class="t">${esc(T(ev,d))}</div><div class="meta">${ev.note?esc(ev.note):''}</div></div><div class="bell">🔔 ${ev.rems.length}</div></button>`).join('')}</div></div>`:''})()}
  ${(()=>{const l=(S.todos||[]).filter(t=>todoVisible(t)&&mine(t)&&!t.done&&t.due&&t.due<=TODAY);return `<div class="section-title">To-dos heute<button class="more" data-go="todo">Alle anzeigen</button></div><div class="card">${l.length?`<div class="todos">${l.slice(0,4).map(todoRow).join('')}</div>`:'<div class="empty" style="padding:8px">Heute nichts offen.</div>'}</div>`})()}
  ${(()=>{const l=(S.chores||[]).filter(c=>choreMine(c)&&c.due<=TODAY);return l.length?`<div class="section-title">Haushalt heute<button class="more" data-go="house">Alle anzeigen</button></div><div class="todos">${l.slice(0,3).map(choreRow).join('')}</div>`:''})()}
  <div class="section-title">Einkaufsliste<button class="more" data-go="shop">Liste öffnen</button></div>
  <div class="card">${S.list.length?`<div class="mini-tiles">${S.list.slice(0,10).map(i=>`<span class="mini">${ICON[i.name]||'•'} ${esc(i.name)}${i.spec?' · '+esc(i.spec):''}</span>`).join('')}${S.list.length>10?`<span class="mini">+${S.list.length-10}</span>`:''}</div>`:'<div class="empty">Die Liste ist leer.</div>'}</div>
  <div class="section-title">Nächste Erinnerungen<button class="more" data-go="rem">Alle</button></div>
  <div class="rlist">${rems.slice(0,3).map(remRow).join('')||'<div class="empty">Keine Erinnerungen in den nächsten zwei Wochen.</div>'}</div>`;
}
function remRow(r){
  const c=CATS[r.ev.cat];const isToday=iso(r.t)===TODAY,isTom=iso(r.t)===addDays(TODAY,1);
  const dl=isToday?'Heute':isTom?'Morgen':r.t.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});
  return `<button class="ritem" data-ev="${r.ev.id}" data-d="${r.d}"><div class="rt">${pad(r.t.getHours())}:${pad(r.t.getMinutes())}<small>${dl}</small></div>
   <div style="min-width:0"><div class="t">${esc(T(r.ev,r.d))}</div><div class="meta"><span class="tag" style="--cat:var(${c.v})">${c.label}</span><span>· ${remLabel(r.m)}</span></div></div></button>`;
}
function renderRem(){
  const rems=upcomingReminders(14);
  const groups={};rems.forEach(r=>{const k=iso(r.t);(groups[k]=groups[k]||[]).push(r)});
  const remOpts=REM_PRESETS.map(([m,l])=>`<option value="${m}"${S.defRem===m?' selected':''}>${l}</option>`).join('');
  const P=S.prefs;const sw=(id,on,lbl)=>`<button class="switch" role="switch" data-pref="${id}" aria-checked="${on}" aria-label="${lbl}"></button>`;
  const myCats=Object.entries(CATS).filter(([,c])=>c.owner===S.user||c.owner==='both');
  return `<button class="more" data-go="home" style="margin-bottom:8px">‹ Zurück zur Startseite</button><div class="card"><div class="setting"><div><b>Push-Nachrichten</b><div class="hint" style="margin:0">Echte Push-Nachrichten kommen mit dem nächsten Update</div></div><button class="switch" role="switch" id="pushsw" aria-checked="${S.pushOn}" aria-label="Push-Nachrichten"></button></div>
   <div class="setting"><label for="defrem"><b>Standard für neue Termine</b></label><select class="inp" id="defrem">${remOpts}</select></div></div>
   <div class="section-title">Morgen-Übersicht</div>
   <div class="card"><div class="setting"><div><b>„Was steht heute an?“</b><div class="hint" style="margin:0">Jeden Morgen eine Push mit allen Terminen des Tages</div></div>${sw('morning',P.morning,'Morgen-Übersicht')}</div>
    <div class="setting"><label for="mtime"><b>Uhrzeit</b></label><input type="time" class="inp" id="mtime" value="${P.mtime}" style="max-width:130px"></div>
    <div class="setting"><span>Einkaufsliste mit anzeigen</span>${sw('mshop',P.mshop,'Einkaufsliste mit anzeigen')}</div>
    <div class="setting"><span>Spruch von Spozli mitsenden</span>${sw('mquote',P.mquote,'Spruch von Spozli')}</div>
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
  const f=[['alle','Alles'],['privat','Privat'],['gemeinsam','Gemeinsam']];
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
    all+=`<div class="cell">${evs.filter(e=>e.allday).map(ev=>`<button class="gchip" style="--cat:var(${CATS[ev.cat].v})" data-ev="${ev.id}" data-d="${d}">${esc(T(ev,d))}</button>`).join('')}</div>`;
    const timed=evs.filter(e=>!e.allday).map(ev=>{const a=toMin(ev.time);let b=ev.end?toMin(ev.end):a+S.prefs.defDur;if(b<=a)b=a+S.prefs.defDur;return {ev,a,b}}).sort((x,y)=>x.a-y.a);
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
  for(let i=0;i<45;i++){const d=addDays(S.sel,i);const evs=eventsOn(d);if(!evs.length)continue;cnt++;
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
  for(let i=0;i<42;i++){
    const d=addDays(start,i);const dd=fromIso(d);
    if(i===35&&dd.getMonth()!==m-1)break;
    const all=eventsOn(d),evs=all.slice(0,2);
    cells+=`<button class="day${dd.getMonth()!==m-1?' other':''}${d===TODAY?' today':''}${d===S.sel?' sel':''}" data-day="${d}" aria-label="${fmtDay(d)}, ${evs.length} Termine"><span class="n">${dd.getDate()}</span><span class="mchs">${evs.map(ev=>`<span class="mch" style="--cat:var(${CATS[ev.cat].v})">${ev.kind==='bday'?'🎂 ':ev.kind==='anniv'?'💍 ':''}${esc(ev.title)}</span>`).join('')}${all.length>2?`<span class="mmore">+${all.length-2} weitere</span>`:''}</span></button>`;
  }
  const monthName=first.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  const dayEvs=eventsOn(S.sel);
  const up=[];for(let i=1;i<=30&&up.length<5;i++){const d=addDays(S.sel,i);eventsOn(d).forEach(ev=>{if(up.length<5)up.push([ev,d])})}
  return `<!--FILTERS--><section class="month" style="margin-top:12px"><div class="month-head"><button class="iconbtn" data-mon="-1" aria-label="Voriger Monat">‹</button><h2>${monthName}</h2><div style="display:flex;gap:6px">${S.sel!==TODAY||S.month!==TODAY.slice(0,7)?'<button class="today-btn" data-day="'+TODAY+'">Heute</button>':''}<button class="iconbtn" data-mon="1" aria-label="Nächster Monat">›</button></div></div>
  <div class="grid7">${(S.prefs.weekStart===1?['Mo','Di','Mi','Do','Fr','Sa','So']:['So','Mo','Di','Mi','Do','Fr','Sa']).map(w=>`<div class="wd">${w}</div>`).join('')}${cells}</div>
  <div class="legend">${Object.values(CATS).filter(c=>c.owner===S.user||c.owner==='both').map(c=>`<span class="tag" style="--cat:var(${c.v})">${c.label}</span>`).join('')}</div></section>
  <div class="section-title">${S.sel===TODAY?'Heute':fmtDay(S.sel)}<span>${dayEvs.length} ${dayEvs.length===1?'Termin':'Termine'}</span></div>
  <div class="agenda">${dayEvs.length?dayEvs.map(ev=>evRow(ev,S.sel)).join(''):`<div class="empty">Nichts geplant. Tippe auf +, um einen Termin anzulegen.</div>`}</div>
  <div class="section-title">Demnächst</div>
  <div class="agenda">${up.length?up.map(([ev,d])=>evRow(ev,d,true)).join(''):`<div class="empty">In den nächsten 30 Tagen steht nichts an.</div>`}</div>`;
}
function evRow(ev,d,withDate){
  const c=CATS[ev.cat];
  const dl=fromIso(d).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});
  return `<button class="ev" style="--cat:var(${c.v})" data-ev="${ev.id}" data-d="${d}">
   <div class="time">${ev.allday?'Ganzt.':ev.time}${withDate?`<small>${dl}</small>`:''}</div>
   <div style="min-width:0"><div class="t">${esc(T(ev,d))}</div><div class="meta"><span class="tag">${c.label}</span>${ev.kind&&ev.kind!=='event'?`<span>· ${ev.kind==='bday'?'Geburtstag':'Jahrestag'}</span>`:ev.repeat!=='none'?`<span>· ${REPEAT[ev.repeat]}</span>`:''}</div></div>
   <div class="bell" title="Erinnerungen">🔔 ${ev.rems.length}</div></button>`;
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
  onMount&&onMount(layer.querySelector('.sheet'));
}
const closeSheet=()=>{layer.innerHTML=''};

function openDetail(id,d){
  const ev=S.events.find(x=>x.id===id);if(!ev)return;
  const c=CATS[ev.cat];const st=startOf(ev,d);
  const rems=[...ev.rems].sort((a,b)=>b-a).map(m=>`<div class="rem"><span>${remLabel(m)}</span><small>${fmtShort(new Date(st-m*6e4))}</small></div>`).join('')||'<div class="who">Keine Erinnerung</div>';
  openSheet(`<h3>${esc(T(ev,d))}</h3>
  <dl class="kv"><dt>Wann</dt><dd>${fmtDay(d)}${ev.allday?', ganztägig':', '+ev.time+(ev.end?'–'+ev.end:'')+' Uhr'}</dd>
  <dt>Für</dt><dd><span class="tag" style="--cat:var(${c.v})">${c.label}</span></dd>
  <dt>Wiederholen</dt><dd>${REPEAT[ev.repeat]}</dd>
  <dt>Sichtbar für</dt><dd>${CATS[ev.cat].owner!=='both'?'Nur '+USERS[CATS[ev.cat].owner].name:(USERS.sevi.name+' und '+USERS.sie.name)}</dd>
  <dt>Erinnert wird</dt><dd>${remindees(ev.cat)}${CATS[ev.cat].owner==='both'?' (beide per Push)':''}</dd>
  <dt>Nachhaken</dt><dd>${NAG[ev.nag]}</dd>
  ${ev.note?`<dt>Notiz</dt><dd>${esc(ev.note)}</dd>`:''}
  <dt>Eingetragen</dt><dd>von ${USERS[ev.by].name}</dd></dl>
  <div class="field"><span class="lbl">Erinnerungen</span><div class="rems">${rems}</div></div>
  <div class="btns"><button class="btn" id="test">Erinnerung testen</button><button class="btn primary" id="edit">Bearbeiten</button></div>`,s=>{
    s.querySelector('#edit').onclick=()=>openForm(ev);
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
  <div class="field"><label for="f-title" id="f-title-l">Titel</label><input class="inp" id="f-title" placeholder="z. B. Dreh beim Kunden" value="${esc(f.title)}"></div>
  <div class="field"><span class="lbl">Für wen</span><div class="catpick" id="f-cat">${picks.map(([k,l])=>`<button type="button" data-cat="${k}" style="--cat:var(${CATS[k].v})" aria-pressed="${f.cat===k}">${l}</button>`).join('')}</div></div>
  <div class="field"><label class="lbl" for="f-date">Datum</label><input type="date" class="inp" id="f-date" value="${f.date}"><div class="row" id="timewrap"><div><label class="lbl" for="f-time">Beginn</label><input type="time" class="inp" id="f-time" value="${f.time}"></div><div><label class="lbl" for="f-end">Ende</label><input type="time" class="inp" id="f-end" value="${f.end}"></div></div>
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
      $('#f-yearwrap').hidden=!sp;$('#f-repwrap').hidden=sp;$('#f-alldaywrap').hidden=sp;
      if(sp){$('#f-allday').checked=true;$('#f-rep').value='yearly'}
      $('#f-title-l').textContent=k==='bday'?'Wer hat Geburtstag?':k==='anniv'?'Was feiert ihr?':'Titel';
      $('#f-title').placeholder=k==='bday'?'z. B. Mama':k==='anniv'?'z. B. Sevi & Vivien':'z. B. Dreh beim Kunden';
      $('#f-year-l').textContent=k==='bday'?'Geburtsjahr (optional, für das Alter)':'Seit welchem Jahr? (optional)';drawAll()};
    $('#f-kind').onclick=e=>{const b=e.target.closest('[data-kind]');if(!b)return;const was=f.kind||'event';f.kind=b.dataset.kind;
      s.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',x===b));
      if(was==='event'&&f.kind!=='event'&&isNew){f.rems=[10080,0];f.cat='gemeinsam';s.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.cat==='gemeinsam'));drawRems();drawWho()}
      if(f.kind==='event'){$('#f-allday').checked=false;$('#f-rep').value='none'}
      drawKind()};
    drawRems();drawWho();drawKind();
    $('#f-cat').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;f.cat=b.dataset.cat;s.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',x===b));drawWho()};
    $('#f-allday').onchange=drawAll;
    let lastStart=f.time;$('#f-time').onchange=e=>{const v=e.target.value;if(!v)return;const dur=toMin($('#f-end').value||fromMin(toMin(lastStart)+S.prefs.defDur))-toMin(lastStart);$('#f-end').value=fromMin(toMin(v)+(dur>0?dur:S.prefs.defDur));lastStart=v};
    $('#f-rems').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){f.rems=f.rems.filter(m=>m!==+b.dataset.rm);drawRems()}};
    $('#f-preset').onchange=e=>{const v=e.target.value;if(v==='custom'){$('#customrow').hidden=false}else if(v!==''){f.rems.push(+v);drawRems()}e.target.value=''};
    $('#f-cadd').onclick=()=>{const n=Math.max(1,parseInt($('#f-cn').value)||1);f.rems.push(n*+$('#f-cu').value);drawRems();$('#customrow').hidden=true};
    $('#f-save').onclick=()=>{
      f.title=$('#f-title').value.trim()||'Ohne Titel';f.date=$('#f-date').value||S.sel;f.allday=$('#f-allday').checked;f.time=f.allday?null:($('#f-time').value||'12:00');f.end=f.allday?null:($('#f-end').value||'');if(f.time&&(!f.end||toMin(f.end)<=toMin(f.time)))f.end=fromMin(toMin(f.time)+S.prefs.defDur);
      f.repeat=$('#f-rep').value;f.kind=f.kind||'event';f.year=f.kind!=='event'?(parseInt($('#f-year').value)||null):null;if(f.kind!=='event'){f.allday=true;f.time=null;f.end=null;f.repeat='yearly'}f.nag=+$('#f-nag').value;f.note=$('#f-note').value.trim();
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
  openSheet(`<h3>Einstellungen</h3>
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
   ${Object.entries(CATS).map(([k,c])=>{const cur=P.colors[k]||'';return `<div class="setting col"><div class="head"><span class="tag" style="--cat:var(${c.v});font-size:14px">${c.label}</span>${cur?`<button class="more" data-reset="${k}">Standard</button>`:''}</div><div class="swatches" style="justify-content:flex-start">${COLORS.map(col=>`<button class="sw" style="background:${col}" data-col="${k}|${col}" aria-label="Farbe ${col}" aria-pressed="${cur===col}"></button>`).join('')}</div></div>`}).join('')}</div>
  <div class="sgroup">Spozli</div><div class="card"><div class="setting"><div><span>Spozli auf der Startseite</span><div class="hint" style="margin:0">Täglicher Gedanke, Atemübung, Notizen</div></div>${sw('lumo',P.lumo!==false,'Spozli anzeigen')}</div></div>
  <div class="sgroup">Benachrichtigungen</div><div class="card"><div class="setting"><span>Push, Morgen-Übersicht, Nachtruhe, alle Erinnerungen</span><button class="today-btn" id="s-go-rem">Öffnen</button></div></div>
  <div class="btns" style="margin-top:18px"><button class="btn primary" id="s-done">Fertig</button></div>`,sh=>{
    const upd=()=>{save();render();const y=sh.scrollTop;openSettings();layer.querySelector('.sheet').scrollTop=y};
    sh.addEventListener('change',e=>{const id=e.target.id,v=e.target.value;
      if(id==='s-ws')P.weekStart=+v;if(id==='s-view'){P.defView=v;S.view=v}if(id==='s-ds')P.dayStart=+v;if(id==='s-dur')P.defDur=+v;if(id==='s-rem')S.defRem=+v;
      save();render();toast('Gespeichert')});
    sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.sp){P[b.dataset.sp]=!P[b.dataset.sp];upd()}
      else if(b.dataset.col){const[k,c]=b.dataset.col.split('|');P.colors[k]=c;upd()}
      else if(b.dataset.reset){delete P.colors[b.dataset.reset];upd()}
      else if(b.id==='s-go-rem'){closeSheet();S.tab='rem';save();render();window.scrollTo(0,0)}
      else if(b.id==='s-done')closeSheet()});
  });
}

function openAccount(){
  const me=USERS[S.user].name,partner=ctx.partnerJoined;
  openSheet(`<h3>${esc(me)}</h3><p class="hint" style="margin-top:-6px">Angemeldet als ${esc(ctx.email||'')}</p>
  <div class="card" style="margin-top:10px">${partner?`<div class="setting"><span>Verbunden mit</span><b>${esc(USERS[S.user==='sevi'?'sie':'sevi'].name)}</b></div>`:`<div class="setting col"><b>Partner einladen</b><span class="hint" style="margin:0">Schick diesen Code an die zweite Person. Sie erstellt in Spozli ein Konto und wählt „Ich habe einen Einladungscode“.</span><div class="invite" id="invite">${esc(ctx.inviteCode||'')}</div><button class="btn" id="copy-code">Code kopieren</button></div>`}
   <div class="setting"><span>Synchronisierung</span><span class="hint" style="margin:0">${syncText()}</span></div></div>
  <div class="btns" style="margin-top:16px"><button class="btn danger" id="logout">Abmelden</button><button class="btn primary" id="acc-ok">Fertig</button></div>`,sh=>{
    sh.querySelector('#acc-ok').onclick=closeSheet;
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
  toastT=setTimeout(()=>t.remove(),3500);
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
  if(S.prefs.mquote&&S.prefs.lumo!==false)body+='\nSpozli: '+LUMO[dayOfYear()%LUMO.length][0];
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
app.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.dataset.cdone){doneChore(t.dataset.cdone);return}
  if(t.dataset.chore){openChore(S.chores.find(x=>x.id===t.dataset.chore));return}
  if(t.dataset.tpl){openChore(null,CHORE_TPL[+t.dataset.tpl]);return}
  if(t.dataset.hfilter){houseFilter=t.dataset.hfilter;render();return}
  if(t.dataset.tdone){toggleTodo(t.dataset.tdone);return}
  if(t.dataset.todo){openTodo(S.todos.find(x=>x.id===t.dataset.todo));return}
  if(t.dataset.tfilter){todoFilter=t.dataset.tfilter;render();return}
  if(t.dataset.lumo){const a=t.dataset.lumo;if(a==='breathe')openBreathe();else if(a==='note')openNote();else{let i;do{i=Math.floor(Math.random()*LUMO.length)}while(i===lumoToday());lumoIdx=i;render();const f=document.getElementById('lumo-fig');if(f)f.classList.add('wiggle')}return}
  if(t.id==='who-btn'){openAccount();return}
  if(t.id==='settings-btn'){openSettings();return}
  if(t.dataset.view){S.view=t.dataset.view;save();render();scrollGrid();return}
  if(t.dataset.gnav){S.sel=addDays(S.sel,+t.dataset.gnav);S.month=S.sel.slice(0,7);save();render();scrollGrid();return}
  if(t.dataset.slot){const[d,tm]=t.dataset.slot.split('|');openForm(null,{date:d,time:tm});return}
  if(t.dataset.go){S.tab=t.dataset.go;save();render();window.scrollTo(0,0);return}
  if(t.dataset.quick==='ev'){openForm(null);return}
  if(t.dataset.quick==='item'){S.tab='shop';save();render();document.getElementById('q').focus();return}
  if(t.dataset.pref){const k=t.dataset.pref;if(k.startsWith('cat:'))S.prefs.cats[k.slice(4)]=!S.prefs.cats[k.slice(4)];else S.prefs[k]=!S.prefs[k];save();render();return}
  if(t.id==='mtest'){morningPush();return}
  if(t.id==='pushsw'){S.pushOn=!S.pushOn;save();render();toast(S.pushOn?'Push-Nachrichten an':'Push-Nachrichten aus');return}
  if(t.dataset.user){S.user=t.dataset.user;save();render();return}
  if(t.dataset.day){S.sel=t.dataset.day;if(t.dataset.day.slice(0,7)!==S.month)S.month=t.dataset.day.slice(0,7);save();render();return}
  if(t.dataset.mon){const d=fromIso(S.month+'-01');d.setMonth(d.getMonth()+ +t.dataset.mon);S.month=iso(d).slice(0,7);render();return}
  if(t.dataset.filter){S.filter=t.dataset.filter;save();render();return}
  if(t.dataset.ev){openDetail(t.dataset.ev,t.dataset.d);return}
  if(t.dataset.item){if(lpFired){lpFired=false;return}buy(t.dataset.item,t);return}
  if(t.dataset.add!==undefined){addItem(t.dataset.add);query='';return}
});
app.addEventListener('change',e=>{if(e.target.id==='mtime'){S.prefs.mtime=e.target.value||'07:30';save();toast('Morgen-Übersicht um '+S.prefs.mtime+' Uhr')}
  if(e.target.id==='defrem'){S.defRem=+e.target.value;save();toast('Standard: '+remLabel(S.defRem))}});
app.addEventListener('submit',e=>{if(e.target.id==='tadd'){e.preventDefault();const v=document.getElementById('tq').value.trim();if(!v)return;S.todos.push({id:uid(),title:v,scope:'privat',by:S.user,assignee:S.user,due:null,time:null,remind:null,repeat:'none',note:'',done:false});save();render();document.getElementById('tq').focus();toast('To-do hinzugefügt');return}
  if(e.target.id==='addform'){e.preventDefault();const v=document.getElementById('q').value;query='';addItem(v)}});
app.addEventListener('input',e=>{if(e.target.id==='q'){query=e.target.value;const pos=e.target.selectionStart;render();const q=document.getElementById('q');q.focus();q.setSelectionRange(pos,pos)}});
document.querySelectorAll('nav.tabs [data-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;save();render();window.scrollTo(0,0)});
fab.onclick=()=>S.tab==='todo'?openTodo(null):S.tab==='house'?openChore(null):openForm(null);
function scrollGrid(){const g=document.getElementById('gbody');if(g)g.scrollTop=S.prefs.dayStart*48}
document.querySelectorAll('nav.tabs [data-tab]').forEach(b=>b.addEventListener('click',scrollGrid));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
render();scrollGrid();
let pendingRender=false;
const typing=()=>{const a=document.activeElement;return a&&(a.id==='q'||a.id==='tq')};
app.addEventListener('focusout',()=>{setTimeout(()=>{if(pendingRender&&!typing()){pendingRender=false;render()}},50)});
return {
  remoteChanged(){load();if(typing())pendingRender=true;else render()},
  setStatus(st){syncState=st;const el=document.getElementById('syncline');if(el)el.innerHTML=syncText()}
};

}
