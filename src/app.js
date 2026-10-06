(function(){
'use strict';
var D=window.ANCHOR_DATA;
var DOM=['health','grow','rel','rest','money'];
var NM={},HINT={},DOMQ={};
D.domains.forEach(function(d){NM[d.key]=d.name;HINT[d.key]=d.hint;DOMQ[d.key]=d});
var TPL={};D.item_templates.forEach(function(t){TPL[t.id]=t});
var COND=['','많이 지침','지침','보통','괜찮음','아주 좋음'];
var DOWS=['일','월','화','수','목','금','토'];
function depth(n){return 'var(--depth-'+n+')'}
// 씨글라스 조각(영역마다 고정된 모양)과 그 위의 아이콘. 색은 스타일의 토큰이 정한다.
var GSH={
  health:'<path class="gb" d="M16 3.5C22.5 3.5 28.5 8 28.5 15C28.5 22 22 27.5 16 28.8C10 27.5 3.5 22 3.5 15C3.5 8 9.5 3.5 16 3.5Z"/><path class="gh" d="M9 12C10 9 13 7 16.5 6.8"/>',
  grow:'<path class="gb" d="M4 21C3 11.5 10 4.5 21 4.5C25.5 4.5 28.5 5.5 28.5 9C29.5 19 22.5 27 12 27.5C7 27.7 4.4 25.2 4 21Z"/><path class="gh" d="M8.5 15.5C9.5 11.5 13 8.6 18 7.9"/>',
  rel:'<path class="gb" d="M16 4.5C18 4.5 19.5 5.5 20.8 7.6L27.6 19.4C29.6 23 27.6 27 23.4 27H8.6C4.4 27 2.4 23 4.4 19.4L11.2 7.6C12.5 5.5 14 4.5 16 4.5Z"/><path class="gh" d="M12.8 13.2L15.4 8.8"/>',
  rest:'<ellipse class="gb" cx="16" cy="16" rx="12.6" ry="11.6" transform="rotate(-12 16 16)"/><path class="gh" d="M8.3 13.5C9.6 10.3 12.8 8.2 16.3 8"/>',
  money:'<rect class="gb" x="6.2" y="6.2" width="19.6" height="19.6" rx="6" transform="rotate(45 16 16)"/><path class="gh" d="M9.6 14.6L14.6 9.6"/>'};
var GIC={
  health:'<path class="gi" d="M16 21.6C11.2 18.3 10 15.8 10 13.8C10 12 11.4 10.6 13 10.6C14.3 10.6 15.4 11.3 16 12.5C16.6 11.3 17.7 10.6 19 10.6C20.6 10.6 22 12 22 13.8C22 15.8 20.8 18.3 16 21.6Z"/>',
  grow:'<path class="gi" d="M15.5 23V15.5M15.5 17C12.5 17 10.5 15.5 10 12.5C13 12.5 15 14 15.5 17ZM15.5 15.3C16 12.6 18 11 21.2 11C21.2 13.6 19.2 15.3 15.5 15.3Z"/>',
  rel:'<circle class="gi" cx="13" cy="15.3" r="2.1"/><circle class="gi" cx="19" cy="15.3" r="2.1"/><path class="gi" d="M9.6 23C9.6 20.6 11 19.4 13 19.4C15 19.4 16 20.6 16 23M16 23C16 20.6 17 19.4 19 19.4C21 19.4 22.4 20.6 22.4 23"/>',
  rest:'<path class="gi" d="M21 18.6A6.4 6.4 0 1 1 14 10.2A5 5 0 0 0 21 18.6Z"/>',
  money:'<circle class="gi" cx="16" cy="16" r="5.6"/><path class="gi" style="stroke-width:1.4" d="M13.2 14L14.4 18.2L16 14.6L17.6 18.2L18.8 14M12.6 16H19.4"/>'};
var IC={lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  dots:'<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  anchor:'<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 11h8M5 14a7 7 0 0 0 14 0"/>',
  down:'<path d="M6 9l6 6 6-6"/>'};
function ic(n){return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>'}
var VLABEL={done:'했음',miss:'못 했음',na:'해당 없음'};
var KEYS=['profile','items','entries','daylogs','experiments','ui'];
var JOBS=D.jobs||Object.keys(D.job_boost);
// 샘플 카드 한 줄 설명 (기획안 1장 ① 4번)
var SDESC={dotori:'4주 기록 · 기본 시연',raon:'가입 첫 주',gureum:'컨디션이 계속 낮을 때'};

/* ───────── 저장 (localStorage, 모든 읽기·쓰기는 try/catch) ───────── */
var mem={};
var LS={
  get:function(k,def){
    try{var v=window.localStorage.getItem('anchor.'+k);if(v!=null)return JSON.parse(v)}catch(e){}
    return Object.prototype.hasOwnProperty.call(mem,k)?JSON.parse(mem[k]):def},
  set:function(k,v){var s=JSON.stringify(v);mem[k]=s;try{window.localStorage.setItem('anchor.'+k,s)}catch(e){}},
  clear:function(){KEYS.forEach(function(k){delete mem[k];try{window.localStorage.removeItem('anchor.'+k)}catch(e){}});baseCache=null}
};

/* ───────── 날짜 (기기 시각, 주는 일–토) ───────── */
function pad(n){return (n<10?'0':'')+n}
function nowDate(){
  try{var p=new URLSearchParams(window.location.search).get('date');
    if(p&&/^\d{4}-\d{2}-\d{2}$/.test(p)){var a=p.split('-');return new Date(+a[0],+a[1]-1,+a[2],12)}}catch(e){}
  return new Date()}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var a=s.split('-');return new Date(+a[0],+a[1]-1,+a[2],12)}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return ymd(d)}
function dow(s){return parse(s).getDay()}
function weekStart(s){return addDays(s,-dow(s))}
function TODAY(){return ymd(nowDate())}
function md(s){var d=parse(s);return (d.getMonth()+1)+'월 '+d.getDate()+'일'}
function mdw(s){return md(s)+' '+DOWS[dow(s)]+'요일'}

/* ───────── 프로필 · 항목 ───────── */
function profile(){return LS.get('profile',null)}
function items(){return LS.get('items',[])}
function qText(tid,target){var t=TPL[tid];return t.q.replace(/\{.+?\}/,target||t.target||'')}
function qHtml(tid,target,pressable){var t=TPL[tid];
  return esc(t.q).replace(/\{.+?\}/,'<span class="tgt"'+(pressable?' role="button" tabindex="0" data-a="tgt" data-t="'+tid+'" aria-label="기준값 '+esc(target||t.target)+' 바꾸기"':'')+'>'+esc(target||t.target||'')+'</span>')}
function makeItems(list){
  return list.map(function(o,i){var t=TPL[o.template],target=o.target||t.target,q=qText(t.id,target);
    return {id:o.id||('i'+pad(i+1)),template:t.id,domain:t.domain,freq:t.freq,order:i,version:1,target:target,question:q,
      history:[{from:'0000-00-00',target:target,question:q}]}})}
function itemQ(it,date){var h=it.history||[],q=it.question;for(var i=0;i<h.length;i++)if(h[i].from<=date)q=h[i].question;return q}
function dailyItems(dom){return items().filter(function(i){return i.freq==='daily'&&(!dom||i.domain===dom)})}
function weeklyItems(){return items().filter(function(i){return i.freq==='weekly'})}

/* ───────── 샘플 기록 (접속한 날 기준으로 날짜 계산) ───────── */
var baseCache=null;
function sample(){var p=profile();if(!p||p.mode!=='sample')return null;
  for(var i=0;i<D.samples.length;i++)if(D.samples[i].id===p.sample_id)return D.samples[i];return null}
function base(){
  var s=sample();if(!s)return null;var t=TODAY(),key=s.id+'|'+t;
  if(baseCache&&baseCache.key===key)return baseCache;
  var ws=weekStart(t),b={key:key,entries:{},logs:{},exps:[]};
  // 팀 원본 구조: 주 기준은 [w, 요일, …], 오늘 기준은 [d, …]. 앞쪽 칸이 날짜, 나머지가 값
  var wkMode=s.date_mode==='week',n=wkMode?2:1;
  function dateOf(r){return wkMode?addDays(ws,7*r[0]+r[1]):addDays(t,r[0])}
  s.daily_entries.forEach(function(r){var dt=dateOf(r);if(dt>=t||!VLABEL[r[n+1]])return;(b.entries[dt]=b.entries[dt]||{})[r[n]]=r[n+1]});
  s.weekly_entries.forEach(function(r){var wk=addDays(ws,7*r[0]);if(addDays(wk,7)>=t||!VLABEL[r[2]])return;(b.entries['W'+wk]=b.entries['W'+wk]||{})[r[1]]=r[2]});
  s.day_logs.forEach(function(r){var dt=dateOf(r);if(dt>=t)return;b.logs[dt]={condition:r[n],memo:r[n+1]||''}});
  s.experiments.forEach(function(o){var wk=addDays(ws,7*o.w);
    b.exps.push({week_start:wk,text:o.text,domain:o.domain,minutes:o.minutes,times:o.times!=null?o.times:o.target,
      done_dates:o.done_dows.map(function(x){return addDays(wk,x)}).filter(function(x){return x<t})})});
  baseCache=b;return b}

/* ───────── 기록 읽기·쓰기 (샘플 위에 내가 입력한 것만 덧씌움) ───────── */
function getE(key){var b=base(),o=LS.get('entries',{})[key],r={},k;
  if(b&&b.entries[key])for(k in b.entries[key])r[k]=b.entries[key][k];
  if(o)for(k in o){if(o[k]==null)delete r[k];else r[k]=o[k]}
  return r}
function setE(key,id,val){var all=LS.get('entries',{}),o=all[key]||{},b=base();
  var inBase=b&&b.entries[key]&&b.entries[key][id];
  if(val==null){if(inBase)o[id]=null;else delete o[id]}else o[id]=val;
  all[key]=o;LS.set('entries',all)}
function getLog(date){var o=LS.get('daylogs',{})[date];if(o)return o;var b=base();return (b&&b.logs[date])||null}
function setLog(date,log){var all=LS.get('daylogs',{});all[date]=log;LS.set('daylogs',all)}
function allDates(){var set={},b=base(),k;
  function add(k){var d=k.charAt(0)==='W'?k.slice(1):k;if(/^\d{4}-\d{2}-\d{2}$/.test(d))set[d]=1}
  if(b){for(k in b.entries)add(k);for(k in b.logs)add(k)}
  var o=LS.get('entries',{});for(k in o){var has=false;for(var j in o[k])if(o[k][j])has=true;if(has)add(k)}
  o=LS.get('daylogs',{});for(k in o)add(k);
  return Object.keys(set).sort()}
function exps(){var b=base(),ov=LS.get('experiments',[]);
  var list=(b?b.exps:[]).filter(function(e){return !ov.some(function(o){return o.week_start===e.week_start})});
  return list.concat(ov)}
function expOf(ws){var l=exps();for(var i=0;i<l.length;i++)if(l[i].week_start===ws)return l[i];return null}
function saveExp(e){var ov=LS.get('experiments',[]).filter(function(o){return o.week_start!==e.week_start});ov.push(e);LS.set('experiments',ov)}

/* ───────── 계산 규칙 (기획안 2장) ───────── */
// 항목 배분: 영역마다 2개 먼저, 남은 N−10개를 중요도 비율로. 내림 후 나머지가 큰 영역부터(같으면 중요도 높은 영역)
function allocate(imp,N){var sum=0,out={},rem=[],left=N-10,used=0;
  DOM.forEach(function(d){sum+=imp[d]});
  DOM.forEach(function(d,i){var x=left*imp[d]/sum,f=Math.floor(x+1e-9);out[d]=2+f;used+=f;rem.push({d:d,r:x-f,imp:imp[d],i:i})});
  rem.sort(function(a,b){return (b.r-a.r)>1e-9?1:(a.r-b.r)>1e-9?-1:(b.imp-a.imp)||(a.i-b.i)});
  for(var k=0;k<left-used;k++)out[rem[k%5].d]++;
  return out}
// 영역 채움: 그날 그 영역 ● ÷ (● + ○) ≥ 50%. ●·○가 없으면 판정 안 함
function domDay(date,dom){var e=getE(date),its=dailyItems(dom),a=0,b=0,n=0;
  its.forEach(function(i){var v=e[i.id];if(v==='done')a++;else if(v==='miss')b++;else if(v==='na')n++});
  return {done:a,miss:b,na:n,total:its.length,entered:a+b+n,state:(a+b)>0?(a/(a+b)>=0.5?'fill':'out'):(n>0?'gray':'dim')}}
function hasChecks(date){var e=getE(date);for(var k in e)if(e[k])return true;return false}
// 기록한 날 = 체크가 1개라도 있는 날. 컨디션까지 있으면 마무리한 날
function dayState(date){var l=getLog(date);if(l&&l.condition)return 'closed';return hasChecks(date)?'partial':'none'}
function filledN(date){return DOM.filter(function(d){return domDay(date,d).state==='fill'}).length}
// 실천률 = ● ÷ (● + ○). −와 미입력은 뺌. 주간 항목은 그 주 기록(W키)으로 합산
function weekStats(ws){var cnt={},rate={},conds=[],states=[],rec=0,cs=0,cn=0,its=items(),i;
  DOM.forEach(function(d){cnt[d]=[0,0]});
  function tally(e,freq){its.forEach(function(it){if(it.freq!==freq)return;var v=e[it.id];if(v==='done')cnt[it.domain][0]++;else if(v==='miss')cnt[it.domain][1]++})}
  for(i=0;i<7;i++){var dt=addDays(ws,i);tally(getE(dt),'daily');states.push(dayState(dt));if(hasChecks(dt))rec++;
    var l=getLog(dt),c=(l&&l.condition)||null;conds.push(c);if(c){cs+=c;cn++}}
  tally(getE('W'+ws),'weekly');
  DOM.forEach(function(d){var t=cnt[d][0]+cnt[d][1];rate[d]=t?Math.round(100*cnt[d][0]/t):null});
  return {rate:rate,conds:conds,states:states,recorded:rec,avg:cn?(cs/cn).toFixed(1):null}}
// 안전 규칙: 최근 3회 연속 컨디션 1(모두 최근 7일 안) 또는 최근 7일 마무리 3일 이상·평균 1.8 이하
function safetyHit(){var t=TODAY(),from=addDays(t,-6),ds=allDates().filter(function(d){return d<=t}).reverse(),closed=[];
  ds.forEach(function(d){var l=getLog(d);if(l&&l.condition)closed.push({d:d,c:l.condition})});
  var last=closed.slice(0,3);
  if(last.length===3&&last.every(function(x){return x.c===1&&x.d>=from}))return true;
  var w=closed.filter(function(x){return x.d>=from});
  if(w.length>=3){var s=0;w.forEach(function(x){s+=x.c});if(s/w.length<=1.8)return true}
  return false}
function maybeSafety(){if(!safetyHit())return false;var ui=LS.get('ui',{}),ws=weekStart(TODAY());
  if(ui.safety_week===ws)return false;ui.safety_week=ws;LS.set('ui',ui);S.sheet={type:'safety'};return true}

/* ───────── 기준값 (범위·조정 단위는 문항표) ───────── */
function qty(s,unit){var m=/^([\d,]+)\s*(.*)$/.exec(String(s).trim());if(!m)return null;return {n:+m[1].replace(/,/g,''),unit:m[2]||unit||''}}
function fmtDur(m){var h=Math.floor(m/60),r=m%60;return h?(h+'시간'+(r?' '+r+'분':'')):(r+'분')}
function fmtClock(x){var h=Math.floor(x/60)%24,m=x%60;
  if(h===0&&m===0)return '자정';var p=h>=18?'밤 '+(h-12)+'시':h===0?'밤 12시':h<6?'새벽 '+h+'시':h+'시';return p+(m?' '+m+'분':'')}
function targetOptions(t){
  if(!t.target||t.range==='—')return null;
  if(t.range==='직접 입력')return {free:true};
  if(t.range.indexOf(':')>0){var ab=t.range.split('–'),tm=function(s){var p=s.split(':');return +p[0]*60+ +p[1]};
    var s0=tm(ab[0]),e0=tm(ab[1]),st=parseInt(t.step,10)||30,o=[];if(e0<=s0)e0+=1440;
    for(var x=s0;x<=e0;x+=st)o.push(fmtClock(x%1440));return {opts:o}}
  if(t.range.indexOf('하루')===0)return {opts:['하루','이틀','사흘','나흘','닷새','엿새','일주일']};
  var parts=t.range.split('–'),pb=qty(parts[1]),pa=qty(parts[0],pb.unit),ps=qty(t.step,pb.unit)||{n:1,unit:pb.unit};
  var min,max,step,fmt;
  if(pa.unit!==pb.unit||ps.unit!==pb.unit){var toM=function(q){return q.unit==='시간'?q.n*60:q.n};min=toM(pa);max=toM(pb);step=toM(ps);fmt=fmtDur}
  else{min=pa.n;max=pb.n;step=ps.n;fmt=function(n){return n.toLocaleString('en-US')+pb.unit}}
  var opts=[fmt(min)];for(var v=Math.floor(min/step)*step+step;v<=max;v+=step)opts.push(fmt(v));
  return {opts:opts}}

/* ───────── 화면 상태 ───────── */
var S={view:'start',date:null,fold:{},flash:null,draft:null,close:null,doneInfo:null,rep:{},sheet:null,toast:null};
var app,sheets,live,timers={};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function glSvg(dom,noIcon){return GSH[dom]+(noIcon?'':GIC[dom])}
function gl(dom,cls,noIcon){return '<span class="gl d-'+dom+(cls?' '+cls:'')+'" aria-hidden="true"><svg viewBox="0 0 32 32">'+glSvg(dom,noIcon)+'</svg></span>'}
function naHint(tid){var t=TPL[tid];return t&&t.na_hint?'<span class="nah">'+esc(t.na_hint)+'</span>':''}
// 노을 그림에 쓰는 붓 자국 한 줄 (구름, 물에 비친 빛)
function streak(x,y,w,h,c,o){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(h/2)+'" style="fill:var(--'+c+')" opacity="'+o+'"/>'}
function streaks(list){return list.map(function(s){return streak.apply(null,s)}).join('')}
function skyStops(list){return list.map(function(s){return '<stop offset="'+s[0]+'" style="stop-color:var(--'+s[1]+')"/>'}).join('')}
function say(t){if(live){live.textContent='';setTimeout(function(){live.textContent=t},30)}}
function sayLabel(it,date){var m=/^(.*?)\{.+?\}/.exec(TPL[it.template].q),h=it.history||[],tg=it.target;
  if(!m)return itemQ(it,date).replace(/\?$/,'');
  for(var i=0;i<h.length;i++)if(h[i].from<=date)tg=h[i].target;return (m[1]+tg).trim()}
function toast(t){S.toast=t;renderSheet();clearTimeout(timers.toast);timers.toast=setTimeout(function(){S.toast=null;renderSheet()},2200)}
function go(view){S.view=view;S.sheet=null;render();try{window.scrollTo(0,0)}catch(e){}}
function tabbar(cur){return '<nav class="tabbar" aria-label="하단 탭"><button data-a="tab" data-v="today"'+(cur==='today'?' aria-current="page"':'')+'>오늘</button><button data-a="tab" data-v="report"'+(cur==='report'?' aria-current="page"':'')+'>리포트</button></nav>'}
var WAVE='<svg viewBox="0 0 390 34" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12C45 2 85 4 130 12S215 24 262 12S345 0 390 10V34H0Z" style="fill:var(--shore-foam)"/><path d="M0 22C50 12 92 14 140 22S228 32 276 22S350 12 390 20V34H0Z" style="fill:var(--shore-sand)"/></svg>';

/* ───────── ① 시작 ───────── */
function vStart(){var d=S.draft||(S.draft={name:'',job:null});
  return '<div class="shore" aria-hidden="true">'+WAVE+'</div><div class="start">'+
  '<h1>반가워요.<br>나를 지키는 기준부터<br>함께 정해요</h1><p class="sub" style="margin:8px 0 0">건강·성장·관계·회복·재정, 다섯 가지만 챙겨요</p>'+
  '<label class="lab" for="nm">무엇이라고 불러 드릴까요?</label><input class="inp" id="nm" maxlength="10" placeholder="비우면 ‘나’로 불러요" value="'+esc(d.name)+'" autocomplete="off" aria-describedby="nmh">'+
  '<p class="tiny" id="nmh" style="margin:6px 0 0">별명도 좋아요. 실명은 필요 없어요</p>'+
  '<span class="lab" id="joblab">어떤 일을 하고 있나요?</span><div class="chips" role="group" aria-labelledby="joblab">'+
  JOBS.map(function(j){return '<button class="chip" data-a="job" data-j="'+esc(j)+'" aria-pressed="'+(d.job===j)+'">'+esc(j)+'</button>'}).join('')+'</div>'+
  '<p class="lock">'+ic('lock')+'기록은 이 기기에만 저장돼요</p>'+
  '<div class="foot"><button class="btn" data-a="startNext"'+(d.job?'':' disabled')+'>다음</button><button class="btn ghost" data-a="samples">샘플로 둘러보기</button></div></div>'}

/* ───────── ② 나다움 설계 ───────── */
function recOrder(dom,chip,job){var out=[];
  function push(id){if(TPL[id]&&TPL[id].domain===dom&&out.indexOf(id)<0)out.push(id)}
  (D.chip_map[chip]||[]).forEach(push);(D.job_boost[job]||[]).forEach(push);
  D.item_templates.forEach(function(t){push(t.id)});return out}
function designInit(){var d=S.draft;d.step=1;d.imp={};DOM.forEach(function(k){d.imp[k]=3});d.total=16;d.chips={};d.picks={};d.lists={};d.targets={};d.idx=0;d.hint='';d.warned=false}
function designOrder(){var d=S.draft;return DOM.slice().sort(function(a,b){return (d.imp[b]-d.imp[a])||(DOM.indexOf(a)-DOM.indexOf(b))})}
function designList(dom){var d=S.draft,al=allocate(d.imp,d.total)[dom];
  if(!d.lists[dom]||d.lists[dom].al!==al||d.lists[dom].chip!==(d.chips[dom]||'')){
    var ord=recOrder(dom,d.chips[dom],d.job).slice(0,al+2);
    d.lists[dom]={al:al,chip:d.chips[dom]||'',ids:ord};d.picks[dom]=ord.slice(0,al)}
  return d.lists[dom]}
function vDesign(){var d=S.draft,al=allocate(d.imp,d.total),h='';
  if(d.step===1){
    h+='<div class="stephead">1 / 3 · 영역 중요도</div><div class="pad" style="padding-top:6px"><h1>요즘 가장 지키고 싶은<br>영역은 어디인가요?</h1><p class="sub" style="margin:6px 0 10px">중요할수록 체크 항목이 더 배정돼요</p>';
    DOM.forEach(function(k){
      h+='<div class="imp d-'+k+'">'+gl(k,'xl')+'<div class="nm"><b>'+NM[k]+'</b><span class="tiny">'+HINT[k]+'</span></div><div class="cells" role="radiogroup" aria-label="'+NM[k]+' 중요도">';
      for(var v=1;v<=5;v++)h+='<button role="radio" aria-checked="'+(d.imp[k]===v)+'" aria-label="'+v+'점" data-a="imp" data-k="'+k+'" data-v="'+v+'" data-f="imp-'+k+'-'+v+'"'+(d.imp[k]===v?'':' tabindex="-1"')+'>'+gl(k,v<=d.imp[k]?'':'clear',true)+'</button>';
      h+='</div><span class="num" aria-hidden="true">'+d.imp[k]+'</span></div>'});
    h+='<div class="card alloc"><div class="row"><h2>항목 배분 미리보기</h2><span class="sp"></span><span class="stepper"><button data-a="total" data-v="-1" aria-label="총 항목 수 줄이기"'+(d.total<=15?' disabled':'')+'>−</button><span aria-live="polite">총 '+d.total+'개</span><button data-a="total" data-v="1" aria-label="총 항목 수 늘리기"'+(d.total>=20?' disabled':'')+'>+</button></span></div>'+
      '<div class="allocbar" aria-hidden="true">'+DOM.map(function(k){return '<i class="d-'+k+'" style="flex:'+al[k]+'"></i>'}).join('')+'</div>'+
      '<p class="tiny" style="margin:0">'+DOM.map(function(k){return NM[k]+' '+al[k]}).join(' · ')+'</p></div>'+
      '<p class="hint" role="status">'+esc(d.hint)+'</p></div><div class="bottom"><div class="two"><button class="btn ghost" data-a="dPrev">이전</button><button class="btn" data-a="dNext1">다음</button></div></div>'}
  else if(d.step===2){
    var ord=designOrder(),dom=ord[d.idx],L=designList(dom),picks=d.picks[dom],q=DOMQ[dom];
    h+='<div class="stephead">2 / 3 · 항목 고르기</div><div class="prog" role="tablist" aria-label="영역 진행">'+
      ord.map(function(k,i){var done=i<d.maxIdx;return '<button role="tab" aria-selected="'+(i===d.idx)+'" aria-label="'+NM[k]+(done?' 확정됨':'')+'" data-a="dJump" data-i="'+i+'"'+(i<=d.maxIdx?'':' disabled')+'>'+gl(k,i<=d.maxIdx?'':'dim')+'</button>'}).join('')+'</div>'+
      '<div class="pad d-'+dom+'"><div class="row" style="margin-top:6px"><h1 style="font-size:20px">'+NM[dom]+'</h1><span class="sub">· '+L.al+'개 고르기</span></div>'+
      '<div class="ask"><span class="who" aria-hidden="true">'+ic('anchor')+'</span><p>'+esc(q.q)+'</p></div><div class="chips" role="group" aria-label="빠른 답">'+
      q.chips.map(function(c){return '<button class="chip" data-a="dChip" data-c="'+esc(c)+'" aria-pressed="'+(d.chips[dom]===c)+'">'+esc(c)+'</button>'}).join('')+'</div><div style="height:14px"></div>'+
      L.ids.map(function(id){var on=picks.indexOf(id)>=0,t=TPL[id];
        return '<div class="pick d-'+dom+'" role="checkbox" tabindex="0" aria-checked="'+on+'" data-a="dPick" data-t="'+id+'" data-f="pick-'+id+'"><span class="box"></span><span class="q">'+qHtml(id,d.targets[id],true)+naHint(id)+'</span><span class="freq">'+(t.freq==='daily'?'매일':'주 1회')+'</span></div>'}).join('')+
      '<p class="tiny" style="text-align:center;margin:10px 0 0"><b>'+picks.length+' / '+L.al+'개 선택됨</b> · 점선 상자를 누르면 기준값을 바꿔요</p><p class="hint" role="status" style="text-align:center">'+esc(d.hint)+'</p></div>'+
      '<div class="bottom"><div class="two"><button class="btn ghost" data-a="dPrev">이전</button><button class="btn" data-a="dConfirm"'+(picks.length===L.al?'':' disabled')+'>'+NM[dom]+' 확정하고 '+(d.idx<4?NM[ord[d.idx+1]]+'으로':'확인하기')+'</button></div></div>'}
  else{
    var list=designFinal(),nd=list.filter(function(o){return TPL[o.template].freq==='daily'}).length;
    h+='<div class="stephead">3 / 3 · 확인</div><div class="pad" style="padding-top:6px"><h1>'+esc(d.name||'나')+' 님의 앵커 '+list.length+'개</h1><p class="sub" style="margin:6px 0 0">매일 '+nd+' · 주 1회 '+(list.length-nd)+'</p><ul class="sum">'+
      list.map(function(o){var t=TPL[o.template];return '<li class="d-'+t.domain+'">'+gl(t.domain,'md')+'<span style="flex:1">'+esc(qText(o.template,o.target))+'</span><span class="freq">'+(t.freq==='daily'?'매일':'주 1회')+'</span></li>'}).join('')+
      '</ul><div style="height:16px"></div></div><div class="bottom"><button class="btn" data-a="dStart">이대로 시작하기</button><button class="link" style="width:100%" data-a="dBack">항목 다시 고르기</button></div>'}
  return h}
function designFinal(){var d=S.draft,out=[];
  DOM.forEach(function(dom){var L=designList(dom);L.ids.forEach(function(id){if(d.picks[dom].indexOf(id)>=0)out.push({template:id,target:d.targets[id]||TPL[id].target})})});
  return out}

/* ───────── ③ 오늘 체크 ───────── */
function editable(date){var t=TODAY();return date===t||date===addDays(t,-1)}
function groupsFor(date){var g=[];
  if(dow(date)===0&&weeklyItems().length)g.push({key:'weekly',title:'지난주 돌아보기',ekey:'W'+addDays(date,-7),its:weeklyItems()});
  DOM.forEach(function(dom){var its=dailyItems(dom);if(its.length)g.push({key:dom,dom:dom,title:NM[dom],ekey:date,its:its})});
  return g}
function groupInfo(g){var e=getE(g.ekey),ent=0,done=0;g.its.forEach(function(i){var v=e[i.id];if(v){ent++;if(v==='done')done++}});return {e:e,entered:ent,done:done,total:g.its.length,complete:ent===g.its.length}}
function initFold(){S.fold={};if(S.date!==TODAY())return;groupsFor(S.date).forEach(function(g){if(groupInfo(g).complete)S.fold[g.key]=true})}
function vToday(){var t=TODAY(),date=S.date,p=profile(),can=editable(date),h='',remain=0;
  var smp=p&&p.mode==='sample',log=getLog(date),gs=groupsFor(date);
  h+='<div class="top"><div class="row daterow"><button class="nav" data-a="day" data-v="-1" aria-label="전날로">‹</button><b>'+mdw(date)+'</b><button class="nav" data-a="day" data-v="1" aria-label="다음 날로"'+(date>=t?' disabled':'')+'>›</button><span class="sp"></span>'+
    (smp?'<span class="badge">샘플 기록</span>':'')+'<button class="nav" data-a="menu" aria-label="메뉴">'+ic('dots')+'</button></div>'+
    '<div class="doms" aria-label="오늘의 다섯 영역">'+DOM.map(function(k){var s=domDay(date,k).state;return '<div class="d-'+k+'">'+gl(k,s==='fill'?'':s)+'<span>'+NM[k]+'</span></div>'}).join('')+'</div></div>';
  if(date!==t&&!can)h+='<p class="notice">이틀 전 기록은 볼 수만 있어요</p>';
  else if(date!==t)h+='<p class="notice">어제 기록이에요. 오늘까지 고칠 수 있어요</p>';
  if(date===t&&S.back)h+='<p class="notice">다시 오셨네요. 오늘부터 이어 가요</p>';
  if(log&&log.condition)h+='<p class="notice">'+(date===t?'오늘':md(date))+' 마무리했어요 · 컨디션 '+log.condition+'</p>';
  var ex=expOf(weekStart(t));
  if(ex&&date===t){var didToday=ex.done_dates.indexOf(t)>=0;
    h+='<div class="exp"><div style="flex:1;min-width:0"><small>이번 주 실험 · '+ex.done_dates.length+'/'+ex.times+'회</small><b>'+esc(ex.text)+'</b></div><button data-a="expDone" aria-pressed="'+didToday+'">'+(didToday?'✓ 오늘 했어요':'오늘 했어요')+'</button></div>'}
  h+='<div class="list">';
  gs.forEach(function(g){var info=groupInfo(g),cls=g.dom?'d-'+g.dom:'';remain+=info.total-info.entered;
    if(S.fold[g.key]&&info.complete){
      h+='<button class="fold '+cls+'" data-a="unfold" data-g="'+g.key+'" data-f="g-'+g.key+'" aria-expanded="false">'+(g.dom?gl(g.dom,'sm',true):'')+'<b>'+g.title+' '+info.done+'/'+info.total+'</b><span class="s">· 다 입력했어요</span><span class="sp"></span>'+
        (g.its.length<=4?'<span class="mks" aria-hidden="true">'+g.its.map(function(i){return '<span class="mk '+info.e[i.id]+' d-'+i.domain+'"></span>'}).join('')+'</span>':'<span class="chev">'+ic('down')+'</span>')+'</button>';return}
    h+='<div class="grp '+cls+'" id="grp-'+g.key+'">'+(g.dom?gl(g.dom,'sm',true):'')+g.title+'</div>';
    g.its.forEach(function(it){var v=info.e[it.id]||'',fl=S.flash&&S.flash.id===it.id&&S.flash.key===g.ekey;
      h+='<button class="it d-'+it.domain+(v==='na'?' na':'')+'" data-a="cycle" data-id="'+it.id+'" data-g="'+g.key+'" data-f="it-'+it.id+'"'+(can?'':' disabled')+' aria-label="'+esc(itemQ(it,date))+' '+(VLABEL[v]||'미입력')+'"><span class="t">'+esc(itemQ(it,date))+naHint(it.template)+'</span>'+
        (fl?'<span class="st">'+(VLABEL[v]||'미입력')+'</span>':'')+'<span class="cb '+(v||'e')+'" aria-hidden="true"></span></button>'})});
  h+='</div><div class="dock">'+(can?'<div class="act"><span class="left">'+(remain?'남은 항목 '+remain+'개':'다 입력했어요')+'</span><span class="sp"></span><button class="btn sm" data-a="toClose">하루 마무리하기</button></div>':'')+tabbar('today')+'</div>';
  return h}

/* ───────── ④ 하루 마무리 ───────── */
function vClose(){var c=S.close,date=c.date,t=TODAY(),h='',skipN=[],skipC=0,day=date===t?'오늘':'어제';
  h+='<div class="dusk-top"><svg class="sky" viewBox="0 0 390 262" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'+
    streaks([[250,22,170,12,'dusk-900',.3],[-20,150,120,12,'dusk-500',.35],[230,112,180,12,'sunset-coral',.4],[40,172,110,8,'sunset-coral',.35],[-10,190,90,7,'dusk-500',.3]])+
    '<circle cx="296" cy="208" r="52" style="fill:var(--sunset-glow)" opacity=".9"/><circle cx="296" cy="208" r="39" fill="#FFE2A8" opacity=".75"/>'+
    streaks([[236,182,84,7,'sunset-gold',.6],[300,193,70,5,'sunset-coral',.35]])+
    '<rect y="206" width="390" height="56" style="fill:var(--evening-sea)"/>'+
    streaks([[20,216,90,4,'evening-sea-deep',.5],[240,212,110,4,'sunset-glow',.6],[262,222,70,3,'sunset-coral',.5],[120,220,80,4,'evening-sea-deep',.45]])+'</svg>'+
    '<div class="in"><button class="back" data-a="tab" data-v="today">‹ 오늘 체크로</button><h1>'+day+' 하루, 몸과 마음의<br>컨디션은 어땠나요?</h1></div></div><div class="sheetbody">'+
    '<div class="cond" role="radiogroup" aria-label="컨디션">';
  for(var v=1;v<=5;v++){h+='<button class="c'+v+'" role="radio" aria-checked="'+(c.cond===v)+'" data-a="cond" data-v="'+v+'" data-f="cond-'+v+'"><i aria-hidden="true">';
    for(var b=1;b<=5;b++)h+='<b class="'+(b<=v?'f':'')+'" style="height:'+(6+b*4.8)+'px"></b>';
    h+='</i><strong>'+v+'</strong>'+COND[v]+'</button>'}
  h+='</div><label class="lab" for="memo">병에 담을 한 줄 (선택)</label><div class="scroll">'+
    '<svg viewBox="0 0 34 22" aria-hidden="true"><g transform="rotate(-12 17 11)"><rect x="3" y="5" width="20" height="12" rx="6" style="fill:var(--bottle-glass);stroke:var(--bottle-glass-line)" stroke-width="1.3"/><rect x="22" y="8" width="5" height="6" rx="1.5" style="fill:var(--bottle-glass);stroke:var(--bottle-glass-line)" stroke-width="1.3"/><rect x="26.5" y="7.5" width="3.5" height="7" rx="1.2" style="fill:var(--bottle-cork)"/><rect x="7" y="8" width="11" height="6" rx="1.5" style="fill:var(--scroll-paper)"/></g></svg>'+
    '<input id="memo" maxlength="60" value="'+esc(c.memo)+'" placeholder="오늘 기억하고 싶은 한 줄" autocomplete="off"><span id="memoCnt">'+c.memo.length+'/60</span></div><p class="tiny" style="margin:10px 0 0">나만 볼 수 있어요</p>'+
    '<div class="card shell" style="margin-top:16px"><h2>'+day+'의 다섯 영역</h2><div class="doms">'+
    DOM.map(function(k){var s=domDay(date,k);if(s.total&&!s.entered){skipN.push(NM[k]);skipC+=s.total}
      return '<button class="d-'+k+'" data-a="toDom" data-k="'+k+'" aria-label="'+NM[k]+' '+(s.entered?s.done+'/'+s.total:'입력 없음')+', 눌러서 고치기">'+gl(k,s.state==='fill'?'':s.state)+'<span>'+(s.entered?s.done+'/'+s.total:'—')+'</span></button>'}).join('')+
    '</div>'+(skipN.length?'<p class="tiny" style="margin:4px 0 0">'+skipN.join('·')+' '+skipC+'개는 비워 둘게요</p>':'')+'</div>'+
    '<div class="grow"></div><div style="padding:18px 0 18px"><p class="savehint" role="status">'+(c.cond?'':'위에서 컨디션을 고르면 저장할 수 있어요')+'</p><button class="btn whale" data-a="saveClose"'+(c.cond?'':' disabled')+'>저장하고 마무리</button></div></div>';
  return h}
// 완료 화면: 노을 바다에 고래 꼬리와 떠 있는 병 (시안 06-2). 한 줄의 글자는 보여 주지 않는다.
function vDone(){var i=S.doneInfo,date=i.date;
  return '<div class="donescr" role="button" tabindex="0" data-a="doneTap" data-f="done" aria-label="오늘의 기록을 바다에 남겼어요. 누르면 오늘 화면으로 돌아가요">'+
  '<svg class="scene" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1">'+skyStops([[0,'dusk-700'],[.3,'dusk-500'],[.5,'sunset-coral'],[.7,'sunset-orange'],[.88,'sunset-gold'],[1,'sunset-glow']])+'</linearGradient>'+
  '<linearGradient id="seaD" x1="0" y1="0" x2="0" y2="1">'+skyStops([[0,'evening-sea'],[1,'evening-sea-deep']])+'</linearGradient></defs>'+
  '<rect width="390" height="562" fill="url(#skyD)"/>'+
  streaks([[250,30,150,10,'dusk-900',.28],[-10,74,200,12,'dusk-900',.28],[200,104,200,10,'dusk-900',.22],[262,150,140,9,'sunset-coral',.4],[-10,214,250,13,'dusk-700',.4],[270,236,130,8,'sunset-coral',.4],[-10,292,210,10,'dusk-700',.3],[250,300,150,9,'sunset-gold',.45],[120,352,250,13,'sunset-gold',.5],[60,372,120,7,'sunset-coral',.4],[30,396,315,9,'sunset-glow',.55],[230,420,170,8,'sunset-coral',.4],[-10,436,200,9,'sunset-coral',.38],[-10,496,180,12,'dusk-500',.38],[150,512,250,10,'dusk-500',.32],[60,534,150,6,'sunset-glow',.45]])+
  '<circle cx="222" cy="560" r="64" style="fill:var(--sunset-glow)" opacity=".9"/><circle cx="222" cy="560" r="48" fill="#FFE2A8" opacity=".7"/>'+
  '<rect y="560" width="390" height="284" fill="url(#seaD)"/>'+
  streaks([[250,574,130,5,'sunset-glow',.55],[245,585,120,4,'sunset-coral',.6],[300,614,70,4,'evening-sea-deep',.45],[230,632,75,4,'sunset-glow',.45],[225,644,140,4,'sunset-coral',.55],[180,668,135,4,'sunset-glow',.4],[165,690,70,5,'sunset-glow',.5],[165,700,135,4,'sunset-coral',.5],[20,676,50,4,'sunset-coral',.4],[14,646,120,3,'evening-foam',.25],[290,736,110,3,'evening-foam',.2]])+
  '<path d="M195 469C216 462 298 422 346 366C343 408 302 470 242 488C226 492 213 494 206 497C208 526 212 560 217 594L173 594C178 560 182 526 184 497C177 494 164 492 148 488C88 470 47 408 44 366C92 422 174 462 195 469Z" style="fill:var(--whale)"/>'+
  '<ellipse cx="195" cy="594" rx="42" ry="6" style="fill:var(--evening-foam)" opacity=".85"/><ellipse cx="150" cy="600" rx="14" ry="3" style="fill:var(--evening-foam)" opacity=".5"/><ellipse cx="238" cy="601" rx="12" ry="3" style="fill:var(--evening-foam)" opacity=".5"/>'+
  '<g class="bottle"><g transform="translate(52 618) rotate(-14)"><ellipse cx="50" cy="44" rx="56" ry="5" style="fill:var(--evening-sea-deep)" opacity=".35"/>'+
    '<rect x="0" y="0" width="86" height="40" rx="18" style="fill:var(--bottle-glass);stroke:var(--bottle-glass-line)" fill-opacity=".86" stroke-width="2"/><rect x="84" y="11" width="18" height="18" rx="5" style="fill:var(--bottle-glass);stroke:var(--bottle-glass-line)" fill-opacity=".86" stroke-width="2"/><rect x="100" y="9" width="12" height="22" rx="4" style="fill:var(--bottle-cork)"/>'+
    (i.memo?'<rect x="16" y="9" width="48" height="22" rx="5" style="fill:var(--scroll-paper-hi)"/><rect x="16" y="9" width="9" height="22" rx="4.5" style="fill:var(--scroll-paper)"/><path d="M42 9v22" style="stroke:var(--bottle-twine)" stroke-width="2"/>':'')+
    '<path d="M90 10v20M90 30c2 9 9 10 13 20" style="stroke:var(--bottle-twine)" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M16 6h40" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/></g></g>'+
  streaks([[30,668,90,3,'evening-foam',.3]])+'</svg>'+
  '<div class="txt"><div class="when">'+mdw(date)+' · 하루 마무리</div><h1>오늘의 기록을<br>바다에 남겼어요</h1><span class="pill">컨디션 '+i.cond+' · '+COND[i.cond]+'</span></div>'+
  '<div class="panel"><div class="gls">'+DOM.map(function(k){var s=domDay(date,k).state;return '<span>'+gl(k,s==='fill'?'':s)+NM[k]+'</span>'}).join('')+'</div><b>'+(i.memo?'한 줄을 병에 담아 띄웠어요. 내일 또 만나요.':i.n+'개 영역을 채웠어요. 내일 또 만나요.')+'</b><span class="t">잠시 후 오늘 화면으로 돌아가요</span></div></div>'}

/* ───────── ⑤ 주간 패턴 리포트 ───────── */
function repWeeks(){var cur=weekStart(TODAY()),ds=allDates(),min=cur,out=[];
  if(ds.length){var w=weekStart(ds[0]);if(w<min)min=w}
  for(var x=min;x<=cur;x=addDays(x,7))out.push(x);return out}
function repInit(){var cur=weekStart(TODAY()),ws=repWeeks(),last=addDays(cur,-7);
  S.rep={ws:ws.indexOf(last)>=0?last:cur,vx:null,day:null,pick:null};
  var ui=LS.get('ui',{});ui.last_report_week=S.rep.ws;LS.set('ui',ui)}
function sampleReport(ws){var s=sample();if(!s)return null;var cur=weekStart(TODAY());
  for(var i=0;i<s.reports.length;i++)if(addDays(cur,7*s.reports[i].week)===ws)return s.reports[i];return null}
// 조개 펜던트 오각형: 금테 진주 판 위에 물빛 레진(실천률)과 금선 점선(중요도). 값은 숫자로도 보여 준다.
function pendant(rate,imp){var cx=175,cy=214,R=74,h='';
  function pt(i,r){var a=-Math.PI/2+i*2*Math.PI/5;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]}
  function f(n){return n.toFixed(1)}
  function poly(fn){return DOM.map(function(d,i){var p=pt(i,fn(d,i));return f(p[0])+','+f(p[1])}).join(' ')}
  function frame(r,k){var s='',m0=null;for(var i=0;i<5;i++){var a=pt(i,r),b=pt((i+1)%5,r),c=pt((i+1)%5,r*k),m=[(a[0]+b[0])/2,(a[1]+b[1])/2],n=pt((i+2)%5,r),m2=[(b[0]+n[0])/2,(b[1]+n[1])/2];
      if(!i)s='M'+f(m[0])+' '+f(m[1]);s+='Q'+f(c[0])+' '+f(c[1])+' '+f(m2[0])+' '+f(m2[1])}return s+'Z'}
  var BADGE=[[175,30],[302,172],[249,316],[101,316],[48,172]];
  h+='<svg class="pend" viewBox="0 0 350 366" role="img" aria-label="영역별 실천률: '+DOM.map(function(d){return NM[d]+' '+(rate[d]==null?'기록 없음':rate[d]+'%')}).join(', ')+'">';
  h+='<defs><linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1">'+skyStops([[0,'pendant-gold-hi'],[.45,'pendant-gold'],[1,'pendant-gold-lo']])+'</linearGradient><linearGradient id="resinG" x1="0" y1="0" x2="0" y2="1">'+skyStops([[0,'pendant-resin'],[1,'pendant-resin-sand']])+'</linearGradient></defs>';
  h+='<circle cx="'+cx+'" cy="'+(cy-R-34)+'" r="9" fill="none" stroke="url(#goldG)" stroke-width="5"/>';
  h+='<path d="'+frame(R+24,1.16)+'" style="fill:var(--pendant-pearl)" stroke="url(#goldG)" stroke-width="6" stroke-linejoin="round"/>';
  h+='<path d="'+frame(R+17,1.16)+'" fill="none" style="stroke:var(--pendant-pearl-edge)" stroke-width="2"/>';
  [0.25,0.5,0.75,1].forEach(function(k){h+='<polygon points="'+poly(function(){return R*k})+'" fill="none" style="stroke:var(--pendant-resin-sand)" stroke-width="1"/>'});
  DOM.forEach(function(d,i){var p=pt(i,R);h+='<line x1="'+cx+'" y1="'+cy+'" x2="'+f(p[0])+'" y2="'+f(p[1])+'" style="stroke:var(--pendant-resin-sand)" stroke-width="1"/>'});
  h+='<polygon points="'+poly(function(d){return R*(rate[d]||0)/100})+'" fill="url(#resinG)" fill-opacity=".55" style="stroke:var(--pendant-resin-line)" stroke-width="2" stroke-linejoin="round"/>';
  h+='<polygon points="'+poly(function(d){return R*imp[d]/5})+'" fill="none" style="stroke:var(--pendant-line)" stroke-width="1.8" stroke-dasharray="5 4" stroke-linejoin="round"/>';
  DOM.forEach(function(d,i){var p=pt(i,R*(rate[d]||0)/100);h+='<circle cx="'+f(p[0])+'" cy="'+f(p[1])+'" r="4.4" style="fill:var(--pendant-point);stroke:var(--pendant-resin-line)" stroke-width="1.5"/>'});
  DOM.forEach(function(d,i){var x=BADGE[i][0],y=BADGE[i][1],on=S.rep.vx===d,val=rate[d]==null?'–':rate[d]+'%';
    h+='<g class="vx d-'+d+'" data-a="vx" data-k="'+d+'" data-f="vx-'+d+'" tabindex="0" role="button" aria-pressed="'+on+'" aria-label="'+NM[d]+' '+(rate[d]==null?'기록 없음':rate[d]+'%')+', 항목별 보기">'+
      '<rect x="'+(x-38)+'" y="'+(y-24)+'" width="76" height="66" rx="14" fill="'+(on?'rgba(255,255,255,.18)':'transparent')+'"/>'+
      '<circle cx="'+x+'" cy="'+y+'" r="17" style="fill:var(--pendant-pearl)" stroke="url(#goldG)" stroke-width="3"/>'+
      '<svg x="'+(x-12)+'" y="'+(y-12)+'" width="24" height="24" viewBox="0 0 32 32">'+glSvg(d)+'</svg>'+
      '<text x="'+x+'" y="'+(y+34)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">'+NM[d]+' <tspan font-weight="800" style="fill:var(--sunset-glow)">'+val+'</tspan></text></g>'});
  return h+'</svg>'}
// 해초 막대: 줄기 높이 = 컨디션 숫자, 마디마다 잎 하나
function kelpSvg(c){var H=c*14+6,s='<svg width="26" height="'+H+'" viewBox="0 0 26 '+H+'" aria-hidden="true"><path d="M13 '+H+'V3" style="stroke:var(--kelp-stem)" stroke-width="4" stroke-linecap="round" fill="none"/>';
  for(var k=1;k<=c;k++){var y=H-k*14+9,d=k%2?1:-1;s+='<path d="M13 '+y+'q'+(d*9)+' -2 '+(d*10)+' -10q'+(-d*9)+' 1 '+(-d*10)+' 10z" style="fill:var(--kelp-leaf)"/>'}
  return s+'</svg>'}
function vReport(){var t=TODAY(),cur=weekStart(t),weeks=repWeeks(),ws=S.rep.ws,idx=weeks.indexOf(ws),p=profile(),h='';
  if(idx<0){ws=S.rep.ws=cur;idx=weeks.indexOf(cur)}
  var st=weekStats(ws),rp=sampleReport(ws),isCur=ws===cur,isLast=ws===addDays(cur,-7),total=allDates().filter(function(d){return hasChecks(d)}).length;
  h+='<div class="wk"><button class="nav" data-a="wk" data-v="-1" aria-label="이전 주"'+(idx<=0?' disabled':'')+'>‹</button><b>'+md(ws)+' – '+md(addDays(ws,6))+'</b><button class="nav" data-a="wk" data-v="1" aria-label="다음 주"'+(idx>=weeks.length-1?' disabled':'')+'>›</button></div><div class="rep">';
  if(!allDates().length){h+='<div class="card empty"><b>아직 기록이 없어요</b><p class="tiny" style="margin:4px 0 12px">오늘 체크를 하면 이번 주 차트가 채워져요</p><button class="btn whale sm" style="margin:0 auto" data-a="tab" data-v="today">오늘 체크하러 가기</button></div></div><div class="dock">'+tabbar('report')+'</div>';return h}
  var first=weekStart(allDates()[0])>=addDays(cur,-7),need=Math.max(1,10-total);
  var sumtxt=isCur?'이번 주 중간 점검이에요. 문장과 실험은 주가 끝나면 나와요.':rp?rp.summary:(first?'첫 주는 기록을 모으는 중이에요.':(total<10?need+'일만 더 기록하면 다음 주 리포트에 패턴이 나와요.':'이 주의 기록이에요.'));
  h+='<div class="rcard"><small>'+(st.avg?'평균 컨디션 '+st.avg+' · ':'')+'기록 '+st.recorded+'일</small><p class="sumtxt">'+esc(sumtxt)+'</p>'+pendant(st.rate,p.importance)+'<p class="cap">청록 실선 실천률 · 금색 점선 내가 정한 중요도</p></div>';
  if(S.rep.vx){var dom=S.rep.vx,we=getE('W'+ws);
    h+='<div class="card d-'+dom+'" role="region" aria-label="'+NM[dom]+' 항목별 기록"><div class="row">'+gl(dom,'md')+'<h2 style="font-size:15px">'+NM[dom]+' 항목별 ● 횟수</h2></div>'+items().filter(function(i){return i.domain===dom}).map(function(it){var a=0,b=0;
      if(it.freq==='daily'){for(var i=0;i<7;i++){var v=getE(addDays(ws,i))[it.id];if(v==='done')a++;else if(v==='miss')b++}return '<p style="margin:6px 0 0;font-weight:600">'+esc(it.question)+' <b style="white-space:nowrap">● '+a+' / '+(a+b)+'</b></p>'}
      return '<p style="margin:6px 0 0;font-weight:600">'+esc(it.question)+' <b style="white-space:nowrap">'+(VLABEL[we[it.id]]||'미입력')+'</b></p>'}).join('')+'</div>'}
  if(rp&&!isCur){h+='<div class="gb2">';
    if(rp.good.length)h+='<div class="card"><b>좋았던 점</b>'+rp.good.map(function(x){return '<p>'+esc(x)+'</p>'}).join('')+'</div>';
    if(rp.short.length)h+='<div class="card"><b>부족했던 점</b>'+rp.short.map(function(x){return '<p>'+esc(x)+'</p>'}).join('')+'</div>';
    h+='</div>'}
  if(!rp&&!isCur&&first)h+='<p class="tiny" style="text-align:center;font-weight:700">'+need+'일만 더 기록하면 다음 주 리포트에 패턴이 나와요</p>';
  if(!rp&&isCur&&total<10)h+='<p class="tiny" style="text-align:center;font-weight:700">'+need+'일만 더 기록하면 다음 주 리포트에 패턴이 나와요</p>';
  // 요일별 컨디션
  h+='<h2>요일별 컨디션</h2><div class="kelp">';
  for(var i=0;i<7;i++){var dt=addDays(ws,i),c=st.conds[i],s=st.states[i],fut=dt>t;
    h+='<button data-a="kday" data-d="'+dt+'" data-f="k-'+dt+'" aria-pressed="'+(S.rep.day===dt)+'"'+(fut||s==='none'?' disabled':'')+' aria-label="'+DOWS[i]+'요일 '+(c?'컨디션 '+c:s==='partial'?'체크만 한 날':fut?'아직 안 온 날':'기록 없는 날')+'">'+
      (c?kelpSvg(c)+'<span class="n">'+c+'</span>':s==='partial'?'<span class="n">−</span>':fut?'':'<span class="dot"></span>')+'<span>'+DOWS[i]+'</span></button>'}
  h+='</div>';
  if(S.rep.day){var lg=getLog(S.rep.day);
    h+='<div class="card daycard" role="region" aria-label="'+md(S.rep.day)+' 기록"><b>'+mdw(S.rep.day)+(lg&&lg.condition?' · 컨디션 '+lg.condition+' '+COND[lg.condition]:' · 체크만 한 날')+'</b>'+(lg&&lg.memo?'<p class="memo">“'+esc(lg.memo)+'”</p>':'<p class="tiny" style="margin:4px 0 8px">남긴 한 줄이 없어요</p>')+
      '<div class="doms">'+DOM.map(function(k){var x=domDay(S.rep.day,k);return '<div class="d-'+k+'">'+gl(k,x.state==='fill'?'':x.state)+'<span>'+(x.entered?x.done+'/'+x.total:'—')+'</span></div>'}).join('')+'</div></div>'}
  // 최근 4주 기록
  h+='<h2>최근 4주 기록</h2><div><div class="strip"><span></span>'+DOWS.map(function(x){return '<span class="hd">'+x+'</span>'}).join('');
  [-3,-2,-1,0].forEach(function(w){var wk=addDays(cur,7*w);
    h+='<span class="wl'+(wk===ws?' on':'')+'">'+(w===0?'이번주':w===-1?'지난주':(-w)+'주전')+'</span>';
    for(var j=0;j<7;j++){var d2=addDays(wk,j),s2=dayState(d2),n=s2==='none'?0:filledN(d2),cell='';
      if(d2>t)cell='';
      else if(s2==='none')cell=d2===t?'<i class="today" style="background:transparent"></i>':'<i class="none"></i>';
      else if(s2==='partial')cell='<i class="partial'+(d2===t?' today':'')+'" style="background:'+depth(n||1)+'"></i>';
      else cell='<i class="'+(n?'':'zero')+(d2===t?' today':'')+'" style="'+(n?'background:'+depth(n):'')+'"></i>';
      h+='<span class="c" title="'+md(d2)+'">'+cell+'</span>'}});
  h+='</div><div class="legend" aria-label="범례"><span><span class="scale">'+[1,2,3,4,5].map(function(n){return '<i style="background:'+depth(n)+'"></i>'}).join('')+'</span>채운 영역 1–5</span><span><i class="zero"></i>0개 영역</span><span><i class="partial"></i>체크만</span><span><i class="none"></i>기록 없음</span></div></div>';
  // 발견한 패턴 · 빈 구간 읽기
  if(rp&&!isCur){
    if(rp.gap)h+='<div class="card pat"><small>빈 구간 읽기</small><b>'+esc(rp.gap.text)+'</b></div>';
    rp.insights.slice(0,2).forEach(function(x){h+='<div class="card pat d-'+x.domain+'"><small>발견한 패턴 · 근거 '+x.a+'일 vs '+x.b+'일</small><b>'+esc(x.text)+'</b></div>'});
    // 작은 실험
    var chosen=expOf(addDays(ws,7)),pick=S.rep.pick;
    if(pick==null){pick=-1;rp.experiments.forEach(function(x,k){if(chosen?chosen.text===x.text:(!isLast&&x.selected))pick=k})}
    h+='<h2>'+(isLast?'다음 주 해 볼 실험 하나':'이 주에 고른 실험')+'</h2>';
    if(rp.last_exp)h+='<p class="tiny" style="margin:-6px 0 0;font-weight:700">지난 실험 · '+esc(rp.last_exp.text)+' '+rp.last_exp.done+'/'+rp.last_exp.target+'회'+(rp.last_exp.note?'<br>'+esc(rp.last_exp.note):'')+'</p>';
    h+='<div role="radiogroup" aria-label="작은 실험" style="display:flex;flex-direction:column;gap:8px">'+rp.experiments.map(function(x,k){
      return '<button class="radio d-'+x.domain+'" role="radio" aria-checked="'+(pick===k)+'" data-a="expPick" data-k="'+k+'" data-f="ex-'+k+'"'+(isLast?'':' disabled')+'><span class="o"></span>'+gl(x.domain,'sm',true)+'<span style="flex:1">'+esc(x.text)+'</span><small>'+x.minutes+'분 · 주 '+x.times+'회</small></button>'}).join('')+'</div>';
    if(isLast){var same=chosen&&pick>=0&&rp.experiments[pick].text===chosen.text;
      h+='<button class="btn whale" data-a="expSave"'+(pick<0||same?' disabled':'')+'>'+(chosen?(same?'이번 주 실험으로 정했어요':'실험 바꾸기'):'이 실험으로 정하기')+'</button>'}
    else h+='<p class="tiny" style="text-align:center">지난 주 리포트는 읽기 전용이에요</p>'}
  h+='</div><div class="dock">'+tabbar('report')+'</div>';
  return h}

/* ───────── 시트 ───────── */
function renderSheet(){var s=S.sheet,h='',ae=document.activeElement,fk=ae&&sheets.contains(ae)&&ae.getAttribute('data-a')?ae.getAttribute('data-a')+'|'+(ae.getAttribute('data-v')||''):null;
  if(s){
    if(s.type==='samples'){h='<div class="scrim" data-a="closeSheet"><div class="bs" role="dialog" aria-modal="true" aria-label="샘플 고르기"><h2>샘플로 둘러보기</h2><p class="sub" style="margin:0">가상의 기록이에요. 오늘 날짜에 맞춰 채워져요.</p>'+
      D.samples.map(function(x){return '<button class="scard" data-a="pickSample" data-id="'+x.id+'"><span class="av" aria-hidden="true">'+esc(x.name.charAt(0))+'</span><span><b>'+esc(x.name)+'</b><span class="tiny">'+esc(x.job)+' · '+esc(x.desc||SDESC[x.id]||'')+'</span></span></button>'}).join('')+'</div></div>'}
    else if(s.type==='menu'){var p=profile();h='<div class="scrim" data-a="closeSheet"><div class="bs menu" role="dialog" aria-modal="true" aria-label="메뉴"><button data-a="csv">내 기록 내보내기 (CSV)</button>'+(p&&p.mode==='sample'?'<button data-a="leave">샘플 나가기</button>':'<button data-a="reset">처음부터 다시</button>')+'<button data-a="closeSheet" data-x="1">닫기</button></div></div>'}
    else if(s.type==='confirm'){h='<div class="scrim center"><div class="safe" role="alertdialog" aria-modal="true" aria-label="기록 삭제 확인"><h2>모든 기록을 지우고 처음부터 다시 할까요?</h2><p>이 기기에 저장된 항목과 기록이 모두 지워져요. 되돌릴 수 없어요.</p><div class="row"><button class="btn" style="background:#fff;color:var(--ink);border:1.5px solid var(--ink)" data-a="closeSheet" data-x="1">취소</button><button class="btn" style="background:var(--ink)" data-a="resetYes">지우기</button></div></div></div>'}
    else if(s.type==='target'){var t=TPL[s.tpl],o=targetOptions(t);
      h='<div class="scrim" data-a="closeSheet"><div class="bs" role="dialog" aria-modal="true" aria-label="기준값 수정"><h2>기준값 바꾸기</h2><p class="sub" style="margin:0">'+esc(qText(s.tpl,s.value))+'</p>'+
      (o.free?'<input class="inp" id="tfree" maxlength="12" value="'+esc(s.value)+'" style="margin:16px 0 6px" aria-label="기준값">':
        '<div class="bigstep"><button data-a="tStep" data-v="-1" aria-label="줄이기"'+(s.i<=0?' disabled':'')+'>−</button><output aria-live="polite">'+esc(o.opts[s.i])+'</output><button data-a="tStep" data-v="1" aria-label="늘리기"'+(s.i>=o.opts.length-1?' disabled':'')+'>+</button></div><p class="tiny" style="text-align:center;margin:0 0 6px">범위 '+esc(t.range)+'</p>')+
      (s.from==='today'?'<p class="tiny" style="text-align:center;margin:0 0 12px">다음 체크부터 이 기준으로 물어볼게요. 지난 기록의 문장은 그대로예요.</p>':'<div style="height:12px"></div>')+
      '<button class="btn" data-a="tSave">이 기준으로 정하기</button></div></div>'}
    else if(s.type==='safety'){var sf=D.safety;h='<div class="scrim center"><div class="safe" role="alertdialog" aria-modal="true" aria-labelledby="sfh"><h2 id="sfh">'+esc(sf.title)+'</h2><p>'+esc(sf.body)+'</p><ul>'+
      sf.contacts.map(function(c){var tel=c.tel||(/^[\d\- ]+$/.test(c.value)?c.value.replace(/\D/g,''):'');return '<li><span>'+esc(c.label||c.name)+'</span>'+(tel?'<a href="tel:'+tel+'">'+esc(c.value)+'</a>':'<span>'+esc(c.value)+'</span>')+'</li>'}).join('')+'</ul><button class="btn" data-a="closeSheet" data-x="1">'+esc(sf.close||'닫기')+'</button></div></div>'}
  }
  if(S.toast)h+='<div class="toast" role="status">'+esc(S.toast)+'</div>';
  sheets.innerHTML=h;
  if(s){var f=null;
    if(fk)Array.prototype.forEach.call(sheets.querySelectorAll('[data-a]'),function(x){if(!f&&!x.disabled&&x.getAttribute('data-a')+'|'+(x.getAttribute('data-v')||'')===fk)f=x});
    if(!f&&!sheets.contains(document.activeElement))f=sheets.querySelector('[role="dialog"] button:not([disabled]),[role="dialog"] input,[role="alertdialog"] .btn:last-child');
    if(f)try{f.focus({preventScroll:true})}catch(e){}}}

/* ───────── 그리기 ───────── */
function render(){var v=S.view,fk=document.activeElement&&document.activeElement.getAttribute&&document.activeElement.getAttribute('data-f');
  var dusk=v==='close'||v==='done'||v==='report';
  app.className='app'+(dusk?' dusk':'')+(v==='start'?' sand':'');
  app.innerHTML=v==='start'?vStart():v==='design'?vDesign():v==='today'?vToday():v==='close'?vClose():v==='done'?vDone():vReport();
  if(fk){var el=app.querySelector('[data-f="'+fk+'"]');if(el)try{el.focus({preventScroll:true})}catch(e){}}
  renderSheet()}

/* ───────── 동작 ───────── */
function enterToday(){S.date=TODAY();initFold();
  var t=S.date,ds=allDates().filter(function(d){return d<t&&dayState(d)!=='none'});
  S.back=ds.length>0&&ds[ds.length-1]<addDays(t,-3)&&dayState(t)==='none';
  go('today')}
function startSample(id){var s=null;D.samples.forEach(function(x){if(x.id===id)s=x});if(!s)return;
  LS.clear();LS.set('profile',{name:s.name,job:s.job,importance:s.importance,total:s.total,mode:'sample',sample_id:s.id});
  LS.set('items',makeItems(s.items));S.draft=null;enterToday();if(maybeSafety())renderSheet()}
function csv(){var rows=[['날짜','구분','영역','문항','값','컨디션','한 줄']],its=items(),val={done:'했음',miss:'못 했음',na:'해당 없음'};
  function q(x){x=String(x==null?'':x);return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x}
  var keys={},b=base(),k;if(b)for(k in b.entries)keys[k]=1;var o=LS.get('entries',{});for(k in o)keys[k]=1;
  Object.keys(keys).sort(function(a,b){return a.replace('W','')<b.replace('W','')?-1:1}).forEach(function(key){var e=getE(key),wk=key.charAt(0)==='W',date=wk?key.slice(1):key,lg=wk?null:getLog(date);
    its.forEach(function(it){if(e[it.id])rows.push([date,wk?'주간(그 주 시작일)':'매일',NM[it.domain],itemQ(it,date),val[e[it.id]],lg&&lg.condition||'',lg&&lg.memo||''])})});
  var text='\ufeff'+rows.map(function(r){return r.map(q).join(',')}).join('\n');
  try{var blob=new Blob([text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='anchor_'+TODAY()+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);toast('기록 '+(rows.length-1)+'줄을 CSV로 내보냈어요')}
  catch(e){toast('이 환경에서는 파일을 저장할 수 없어요')}}
function openTarget(tpl,value,from,itemId){var t=TPL[tpl],o=targetOptions(t);if(!o)return false;
  var i=o.free?0:Math.max(0,o.opts.indexOf(value));S.sheet={type:'target',tpl:tpl,value:value,i:i,from:from,itemId:itemId};renderSheet();return true}

var ACT={
  job:function(el){S.draft.job=el.getAttribute('data-j');render()},
  startNext:function(){var n=document.getElementById('nm');S.draft.name=(n&&n.value||'').trim().slice(0,10);designInit();S.draft.maxIdx=0;go('design')},
  samples:function(){S.sheet={type:'samples'};renderSheet()},
  pickSample:function(el){startSample(el.getAttribute('data-id'))},
  closeSheet:function(el,ev){if(el.classList.contains('scrim')&&ev.target!==el)return;S.sheet=null;renderSheet()},
  imp:function(el){var d=S.draft;d.imp[el.getAttribute('data-k')]=+el.getAttribute('data-v');d.hint='';d.lists={};d.maxIdx=0;render()},
  total:function(el){var d=S.draft;d.total=Math.max(15,Math.min(20,d.total+ +el.getAttribute('data-v')));d.lists={};d.maxIdx=0;render()},
  dNext1:function(){var d=S.draft,eq=DOM.every(function(k){return d.imp[k]===d.imp.health});
    if(eq&&!d.warned){d.warned=true;d.hint='차이를 두면 더 나다운 구성이 돼요';render();return}
    d.hint='';d.step=2;d.idx=0;go('design')},
  dJump:function(el){var d=S.draft;d.idx=+el.getAttribute('data-i');d.hint='';go('design')},
  dChip:function(el){var d=S.draft,dom=designOrder()[d.idx],c=el.getAttribute('data-c');d.chips[dom]=d.chips[dom]===c?'':c;d.hint='';render()},
  dPick:function(el,ev){if(ev.target.closest&&ev.target.closest('[data-a="tgt"]'))return;
    var d=S.draft,dom=designOrder()[d.idx],L=designList(dom),id=el.getAttribute('data-t'),p=d.picks[dom],i=p.indexOf(id);
    if(i>=0){p.splice(i,1);d.hint=''}else if(p.length>=L.al){d.hint='다른 항목을 해제하거나 앞 단계에서 개수를 늘려요'}else{p.push(id);d.hint=''}
    render()},
  tgt:function(el){var d=S.draft,id=el.getAttribute('data-t');openTarget(id,d.targets[id]||TPL[id].target,'design')},
  dPrev:function(){var d=S.draft;d.hint='';if(d.step===1){go('start');return}if(d.idx>0)d.idx--;else d.step=1;go('design')},
  dConfirm:function(){var d=S.draft;d.hint='';if(d.idx<4){d.idx++;d.maxIdx=Math.max(d.maxIdx||0,d.idx);go('design')}else{d.step=3;go('design')}},
  dBack:function(){S.draft.step=2;S.draft.idx=0;S.draft.maxIdx=4;go('design')},
  dStart:function(){var d=S.draft;LS.clear();
    LS.set('profile',{name:d.name||'나',job:d.job,importance:d.imp,total:d.total,mode:'own',sample_id:null});
    LS.set('items',makeItems(designFinal()));S.draft=null;enterToday()},
  tab:function(el){var v=el.getAttribute('data-v');if(v==='report'){repInit();go('report')}else{if(S.view!=='today'&&S.view!=='close'){S.date=TODAY();initFold()}go('today')}},
  day:function(el){var n=+el.getAttribute('data-v'),d=addDays(S.date,n);if(d>TODAY())return;S.date=d;initFold();S.flash=null;render()},
  menu:function(){S.sheet={type:'menu'};renderSheet()},
  csv:function(){S.sheet=null;csv()},
  leave:function(){LS.clear();S.draft=null;go('start')},
  reset:function(){S.sheet={type:'confirm'};renderSheet()},
  resetYes:function(){LS.clear();S.draft=null;go('start')},
  cycle:function(el){
    var id=el.getAttribute('data-id'),gk=el.getAttribute('data-g'),g=null;groupsFor(S.date).forEach(function(x){if(x.key===gk)g=x});if(!g||!editable(S.date))return;
    var cur=getE(g.ekey)[id]||'',nx={'':'done',done:'miss',miss:'na',na:''}[cur];
    setE(g.ekey,id,nx||null);S.flash={id:id,key:g.ekey};S.back=false;
    var it=null;g.its.forEach(function(x){if(x.id===id)it=x});say(sayLabel(it,S.date)+', '+(VLABEL[nx]||'미입력'));
    clearTimeout(timers.flash);timers.flash=setTimeout(function(){S.flash=null;if(S.view==='today')render()},800);
    if(groupInfo(g).complete){if(S.fold[gk]===undefined){clearTimeout(timers['f'+gk]);timers['f'+gk]=setTimeout(function(){
      var g2=null;groupsFor(S.date).forEach(function(x){if(x.key===gk)g2=x});
      if(g2&&groupInfo(g2).complete&&S.fold[gk]===undefined&&S.view==='today'){S.fold[gk]=true;render()}},600)}}
    else{clearTimeout(timers['f'+gk]);delete S.fold[gk]}
    render()},
  unfold:function(el){S.fold[el.getAttribute('data-g')]=false;render()},
  expDone:function(){var t=TODAY(),ws=weekStart(t),e=expOf(ws);if(!e)return;e=JSON.parse(JSON.stringify(e));var i=e.done_dates.indexOf(t);
    if(i>=0)e.done_dates.splice(i,1);else e.done_dates.push(t);saveExp(e);render()},
  toClose:function(){var lg=getLog(S.date);S.close={date:S.date,cond:lg?lg.condition:null,memo:lg?lg.memo||'':''};go('close')},
  cond:function(el){S.close.cond=+el.getAttribute('data-v');var m=document.getElementById('memo');if(m)S.close.memo=m.value;render()},
  toDom:function(el){var k=el.getAttribute('data-k');S.fold[k]=false;go('today');var g=document.getElementById('grp-'+k);if(g&&g.scrollIntoView)try{g.scrollIntoView({block:'center'})}catch(e){}},
  saveClose:function(){var c=S.close,m=document.getElementById('memo');if(m)c.memo=m.value;if(!c.cond)return;
    setLog(c.date,{condition:c.cond,memo:c.memo.trim().slice(0,60)});
    if(maybeSafety()){S.view='today';S.date=TODAY();initFold();render();return}
    S.doneInfo={date:c.date,cond:c.cond,memo:c.memo.trim(),n:filledN(c.date)};go('done');
    clearTimeout(timers.done);timers.done=setTimeout(function(){if(S.view==='done')ACT.doneTap()},2000)},
  doneTap:function(){clearTimeout(timers.done);S.date=TODAY();initFold();go('today')},
  wk:function(el){var w=repWeeks(),i=w.indexOf(S.rep.ws)+ +el.getAttribute('data-v');if(i<0||i>=w.length)return;S.rep={ws:w[i],vx:null,day:null,pick:null};
    var ui=LS.get('ui',{});ui.last_report_week=w[i];LS.set('ui',ui);render()},
  vx:function(el){var k=el.getAttribute('data-k');S.rep.vx=S.rep.vx===k?null:k;render()},
  kday:function(el){var d=el.getAttribute('data-d');S.rep.day=S.rep.day===d?null:d;render()},
  expPick:function(el){S.rep.pick=+el.getAttribute('data-k');render()},
  expSave:function(){var rp=sampleReport(S.rep.ws),x=rp&&rp.experiments[S.rep.pick];if(!x)return;var ws=addDays(S.rep.ws,7);
    var b=base(),orig=null;if(b)b.exps.forEach(function(e){if(e.week_start===ws&&e.text===x.text)orig=e});
    if(orig)LS.set('experiments',LS.get('experiments',[]).filter(function(o){return o.week_start!==ws}));
    else saveExp({week_start:ws,text:x.text,domain:x.domain,minutes:x.minutes,times:x.times,done_dates:[]});S.rep.pick=null;render();toast('이번 주 실험으로 정했어요. 오늘 탭에서 볼 수 있어요')},
  tStep:function(el){var s=S.sheet,o=targetOptions(TPL[s.tpl]);s.i=Math.max(0,Math.min(o.opts.length-1,s.i+ +el.getAttribute('data-v')));s.value=o.opts[s.i];renderSheet()},
  tSave:function(){var s=S.sheet,f=document.getElementById('tfree'),val=f?(f.value.trim()||TPL[s.tpl].target):s.value;
    if(s.from==='design'){S.draft.targets[s.tpl]=val}
    else{var its=items(),t=TODAY();its.forEach(function(it){if(it.id!==s.itemId||it.target===val)return;
        it.version=(it.version||1)+1;it.target=val;it.question=qText(it.template,val);
        it.history=(it.history||[]).filter(function(h){return h.from!==t});it.history.push({from:t,target:val,question:it.question})});
      LS.set('items',its)}
    S.sheet=null;render()}
};

function onClick(ev){if(S.lp){S.lp=false;return}
  var el=ev.target.closest?ev.target.closest('[data-a]'):null;if(!el||el.disabled)return;
  var a=el.getAttribute('data-a');
  if(el.getAttribute('data-x')&&a==='closeSheet'){S.sheet=null;renderSheet();return}
  if(ACT[a])ACT[a](el,ev)}
function onKey(ev){var el=ev.target;
  if((ev.key==='Enter'||ev.key===' ')&&el.getAttribute&&el.getAttribute('data-a')&&el.tagName!=='BUTTON'&&el.tagName!=='INPUT'){ev.preventDefault();ev.stopPropagation();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));return}
  if(ev.key==='Escape'&&S.sheet&&S.sheet.type!=='safety'&&S.sheet.type!=='confirm'){S.sheet=null;renderSheet();return}
  if((ev.key==='ArrowLeft'||ev.key==='ArrowRight')&&el.getAttribute&&el.getAttribute('data-a')==='imp'){ev.preventDefault();
    var d=S.draft,k=el.getAttribute('data-k'),v=Math.max(1,Math.min(5,d.imp[k]+(ev.key==='ArrowRight'?1:-1)));d.imp[k]=v;d.lists={};d.maxIdx=0;render();
    var n=app.querySelector('[data-f="imp-'+k+'-'+v+'"]');if(n)n.focus()}}
function onInput(ev){if(ev.target.id==='memo'&&S.close){S.close.memo=ev.target.value;var c=document.getElementById('memoCnt');if(c)c.textContent=ev.target.value.length+'/60'}
  if(ev.target.id==='nm'&&S.draft)S.draft.name=ev.target.value}
// 길게 누르면 기준값 수정
var lpT=null,lpXY=null;
function onDown(ev){S.lp=false;var el=ev.target.closest?ev.target.closest('[data-a="cycle"]'):null;if(!el||el.disabled)return;
  lpXY=[ev.clientX,ev.clientY];clearTimeout(lpT);
  lpT=setTimeout(function(){var id=el.getAttribute('data-id'),it=null;items().forEach(function(x){if(x.id===id)it=x});
    if(it&&openTarget(it.template,it.target,'today',it.id))S.lp=true},550)}
function onUp(){clearTimeout(lpT)}
function onMove(ev){if(lpXY&&(Math.abs(ev.clientX-lpXY[0])>10||Math.abs(ev.clientY-lpXY[1])>10))clearTimeout(lpT)}
// 왼쪽으로 밀면 어제로
var sw=null;
function onTS(ev){if(S.view!=='today'||S.sheet)return;var t=ev.touches[0];sw=[t.clientX,t.clientY]}
function onTE(ev){if(!sw||S.view!=='today')return;var t=ev.changedTouches[0],dx=t.clientX-sw[0],dy=t.clientY-sw[1];sw=null;
  if(Math.abs(dx)<70||Math.abs(dy)>40)return;var d=addDays(S.date,dx<0?-1:1);if(d>TODAY())return;S.date=d;initFold();S.flash=null;render()}

function boot(){app=document.getElementById('app');sheets=document.getElementById('sheets');live=document.getElementById('live');
  document.addEventListener('click',onClick);document.addEventListener('keydown',onKey);document.addEventListener('input',onInput);
  document.addEventListener('pointerdown',onDown);document.addEventListener('pointerup',onUp);document.addEventListener('pointercancel',onUp);document.addEventListener('pointermove',onMove);
  document.addEventListener('contextmenu',function(ev){if(ev.target.closest&&ev.target.closest('[data-a="cycle"]'))ev.preventDefault()});
  document.addEventListener('touchstart',onTS,{passive:true});document.addEventListener('touchend',onTE,{passive:true});
  var p=profile();
  if(p&&items().length){enterToday();if(maybeSafety())renderSheet()}else{S.view='start';render()}
  try{if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&window.top===window)navigator.serviceWorker.register('./sw.js').catch(function(){})}catch(e){}}
window.__anchor={S:S,LS:LS,allocate:allocate,weekStats:weekStats,targetOptions:targetOptions,TPL:TPL,safetyHit:safetyHit,dayState:dayState,filledN:filledN,addDays:addDays,weekStart:weekStart,TODAY:TODAY,recOrder:recOrder,expOf:expOf,items:items,getE:getE};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
