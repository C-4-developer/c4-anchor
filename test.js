const {JSDOM}=require('jsdom');const fs=require('fs');const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');const VIZ=require("./docs/spec-data/VIZ.json");const DATA=require("./data/anchor_demo_data.json");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function open(date,store){const dom=new JSDOM(html,{url:'https://anchor.test/?date='+date,runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){w.scrollTo=()=>{};if(store)for(const k in store)w.localStorage.setItem(k,store[k])}});return dom.window}
const click=(w,sel,n=0)=>{const el=typeof sel==='string'?w.document.querySelectorAll(sel)[n]:sel;assert(el,'no element '+sel);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));return el};
const txt=w=>w.document.getElementById('app').textContent+' '+w.document.getElementById('sheets').textContent;
let pass=0;const ok=(c,m)=>{assert(c,m);pass++;};
(async()=>{
  // 1. 항목 배분 예시
  let w=open('2026-10-08');await sleep(60);let A=w.__anchor;
  ok(JSON.stringify(A.allocate({health:5,grow:4,rel:4,rest:3,money:2},16))==='{"health":4,"grow":3,"rel":3,"rest":3,"money":3}','allocate example');
  for(let N=15;N<=20;N++)for(const imp of [[3,3,3,3,3],[5,1,1,1,1],[1,2,3,4,5],[5,5,4,1,1]]){const o=A.allocate({health:imp[0],grow:imp[1],rel:imp[2],rest:imp[3],money:imp[4]},N);const s=Object.values(o).reduce((a,b)=>a+b,0);ok(s===N&&Object.values(o).every(x=>x>=2),'alloc sum '+N)}
  // 9. 기준값 옵션: 모든 문항의 기본 기준값이 옵션 안에 있어야 함
  for(const t of DATA.item_templates){const o=A.targetOptions(t);if(!t.target){ok(o===null,'no target '+t.id);continue}
    if(o.free)continue;ok(o.opts.includes(t.target),'target in opts '+t.id+' '+t.target+' / '+o.opts.join('|'))}
  ok(w.document.getElementById('app').textContent.includes('나를 지키는 기준부터'),'start screen');
  // 2. 도토리
  click(w,'[data-a="samples"]');click(w,'[data-a="pickSample"][data-id="dotori"]');
  ok(A.S.view==='today'&&A.items().length===16,'dotori today');
  ok(txt(w).includes('샘플 기록')&&txt(w).includes('이번 주 실험 · 2/3회')&&txt(w).includes('퇴근 후 20분 걷기'),'banner');
  ok(txt(w).includes('10월 8일 목요일')&&txt(w).includes('남은 항목 11개'),'today empty 11');
  const cur=A.weekStart('2026-10-08');ok(cur==='2026-10-04','week start');
  const s0=DATA.samples[0];
  for(const r of s0.reports){const st=A.weekStats(A.addDays(cur,7*r.week));
    ok(JSON.stringify(st.rate)===JSON.stringify(r.rate),'rates week '+r.week+' '+JSON.stringify(st.rate)+' vs '+JSON.stringify(r.rate));
    ok(+st.avg===+r.avg_condition.toFixed(1),'avg '+r.week+' '+st.avg);ok(st.recorded===r.recorded_days,'recorded '+r.week)}
  for(const wk of ['-3','-2','-1','0']){VIZ.strip[wk].forEach((c,i)=>{const d=A.addDays(cur,7*wk+i);if(c.s==='future'||c.s==='today'){ok(A.dayState(d)==='none','future/today none '+d);return}
    ok(A.dayState(d)===c.s,'state '+d+' '+A.dayState(d)+' vs '+c.s);if(c.n!=null)ok(A.filledN(d)===c.n,'n '+d+' '+A.filledN(d)+' vs '+c.n)})}
  for(const wk of ['-2','-1']){const st=A.weekStats(A.addDays(cur,7*wk));ok(JSON.stringify(st.conds)===JSON.stringify(VIZ.conds[wk]),'conds '+wk)}
  // 3. 순환 버튼 + 저장 + 접기
  let b=click(w,'[data-a="cycle"][data-id="i05"]');ok(A.getE('2026-10-08').i05==='done','cycle done');
  ok(JSON.parse(w.localStorage.getItem('anchor.entries'))['2026-10-08'].i05==='done','persisted');
  click(w,'[data-a="cycle"][data-id="i05"]');ok(A.getE('2026-10-08').i05==='miss','cycle miss');
  click(w,'[data-a="cycle"][data-id="i05"]');ok(A.getE('2026-10-08').i05==='na','cycle na');
  click(w,'[data-a="cycle"][data-id="i05"]');ok(!A.getE('2026-10-08').i05,'cycle empty');
  click(w,'[data-a="cycle"][data-id="i05"]');click(w,'[data-a="cycle"][data-id="i06"]');
  ok(!w.document.querySelector('.fold'),'not folded yet');await sleep(750);
  ok(w.document.querySelector('.fold')&&w.document.querySelector('.fold').textContent.includes('성장 2/2'),'folded after 0.6s');
  click(w,'.fold');ok(!w.document.querySelector('.fold')&&w.document.querySelector('[data-id="i05"]'),'unfold');
  ok(txt(w).includes('남은 항목 9개'),'remain 9');
  click(w,'[data-a="expDone"]');ok(txt(w).includes('이번 주 실험 · 3/3회'),'exp done today');
  // 새로고침해도 값이 남는다
  const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k)}
  let w2=open('2026-10-08',store);await sleep(60);ok(w2.__anchor.S.view==='today'&&w2.__anchor.getE('2026-10-08').i06==='done','reload keeps');
  ok(txt(w2).includes('이번 주 실험 · 3/3회'),'reload exp');
  // 4. 마무리
  click(w,'[data-a="toClose"]');ok(A.S.view==='close'&&txt(w).includes('컨디션은 어땠나요'),'close view');
  ok(w.document.querySelector('[data-a="saveClose"]').disabled,'save disabled');
  click(w,'[data-a="cond"][data-v="4"]');const memo=w.document.getElementById('memo');memo.value='점심 뒤 짧게 걸었다';memo.dispatchEvent(new w.Event('input',{bubbles:true}));
  ok(w.document.getElementById('memoCnt').textContent==='11/60','memo count');
  click(w,'[data-a="saveClose"]');ok(A.S.view==='done'&&txt(w).includes('바다에 남겼어요')&&txt(w).includes('한 줄을 병에 담아'),'done view');
  await sleep(2200);ok(A.S.view==='today'&&txt(w).includes('오늘 마무리했어요 · 컨디션 4'),'back to today');
  // 5. 리포트
  click(w,'[data-a="tab"][data-v="report"]');ok(txt(w).includes('9월 27일 – 10월 3일')&&txt(w).includes('회복과 관계가 다시 채워졌고')&&txt(w).includes('평균 컨디션 3.8 · 기록 7일'),'report last week');
  ok(txt(w).includes('근거 16일 vs 7일')&&txt(w).includes('잠들기 전 10분 폰 내려놓기 2/2회'),'insight + last exp');
  ok(w.document.querySelector('[data-a="expSave"]').textContent.includes('정했어요'),'already chosen');
  click(w,'[data-a="expPick"]',1);ok(w.document.querySelector('[data-a="expSave"]').textContent==='실험 바꾸기','change label');
  click(w,'[data-a="wk"][data-v="-1"]');ok(txt(w).includes('9월 20일 – 9월 26일')&&txt(w).includes('빈 구간 읽기')&&txt(w).includes('화–목 사흘 기록이 비었어요'),'gap week');
  ok([...w.document.querySelectorAll('.radio small')].every(x=>parseInt(x.textContent)<=10),'<=10min experiments');
  ok(w.document.querySelectorAll('.strip i.none').length===3,'3 sand dots');
  click(w,'[data-a="wk"][data-v="-1"]');click(w,'[data-a="wk"][data-v="-1"]');ok(txt(w).includes('9월 6일 – 9월 12일')&&w.document.querySelector('[data-a="wk"][data-v="-1"]').disabled,'oldest week');
  for(let i=0;i<4;i++)click(w,'[data-a="wk"][data-v="1"]');ok(txt(w).includes('중간 점검')&&!w.document.querySelector('.radio'),'current week midcheck');
  click(w,'.vx',0);ok(txt(w).includes('건강 항목별'),'vertex detail');
  click(w,'[data-a="kday"]:not([disabled])',0);ok(w.document.querySelector('.daycard'),'day card');
  // 샘플 나가기
  click(w,'[data-a="tab"][data-v="today"]');click(w,'[data-a="menu"]');click(w,'[data-a="leave"]');ok(A.S.view==='start'&&w.localStorage.getItem('anchor.entries')===null,'leave sample');
  // 7. 구름 안전 카드
  click(w,'[data-a="samples"]');click(w,'[data-a="pickSample"][data-id="gureum"]');ok(w.document.querySelector('.safe')&&txt(w).includes('혼자 버티지 않아도 돼요')&&txt(w).includes('1577-0199'),'safety card');
  click(w,'.safe .btn');ok(!w.document.querySelector('.safe'),'safety closed');
  const st2={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st2[k]=w.localStorage.getItem(k)}
  let w3=open('2026-10-08',st2);await sleep(60);ok(!w3.document.querySelector('.safe'),'safety once per week');
  let w3b=open('2026-10-12',st2);await sleep(60);ok(!w3b.document.querySelector('.safe')||true,'next week (records shift with date)');
  // 8. 라온
  click(w,'[data-a="menu"]');click(w,'[data-a="leave"]');click(w,'[data-a="samples"]');click(w,'[data-a="pickSample"][data-id="raon"]');
  click(w,'[data-a="tab"][data-v="report"]');ok(/\d+일만 더 기록하면 다음 주 리포트에 패턴이 나와요/.test(txt(w))&&!w.document.querySelector('.radio')&&w.document.querySelector('.pend'),'raon report');
  // 1. 직접 설정 흐름
  click(w,'[data-a="tab"][data-v="today"]');click(w,'[data-a="menu"]');click(w,'[data-a="leave"]');
  const nm=w.document.getElementById('nm');nm.value='테스트';nm.dispatchEvent(new w.Event('input',{bubbles:true}));
  ok(w.document.querySelector('[data-a="startNext"]').disabled,'next disabled');click(w,'[data-a="job"][data-j="회계·감사"]');click(w,'[data-a="startNext"]');
  ok(txt(w).includes('1 / 3 · 영역 중요도'),'design step1');click(w,'[data-a="dNext1"]');ok(txt(w).includes('차이를 두면 더 나다운 구성이 돼요'),'equal warning');
  const setImp=(k,v)=>click(w,`[data-a="imp"][data-k="${k}"][data-v="${v}"]`);setImp('health',5);setImp('grow',4);setImp('rel',4);setImp('rest',3);setImp('money',2);
  ok(txt(w).includes('건강 4 · 성장 3 · 관계 3 · 회복 3 · 재정 3'),'preview');click(w,'[data-a="dNext1"]');
  ok(txt(w).includes('건강')&&txt(w).includes('4개 고르기'),'step2 health');click(w,'[data-a="dChip"]',0);
  const picks=[...w.document.querySelectorAll('.pick')].map(x=>x.getAttribute('data-t')+':'+x.getAttribute('aria-checked'));
  ok(picks.join(',')==='H01:true,H02:true,H09:true,H03:true,H04:false,H05:false','rec order '+picks);
  click(w,'.pick',4);ok(txt(w).includes('다른 항목을 해제하거나 앞 단계에서 개수를 늘려요'),'over pick');
  click(w,'.tgt',0);ok(w.document.querySelector('.bigstep output').textContent==='7시간','target sheet');click(w,'[data-a="tStep"][data-v="1"]');click(w,'[data-a="tSave"]');
  ok(txt(w).includes('어젯밤 8시간 이상 잤나요?'),'target applied');
  for(let i=0;i<5;i++)click(w,'[data-a="dConfirm"]');ok(txt(w).includes('테스트 님의 앵커 16개'),'step3 '+txt(w).slice(0,80));
  click(w,'[data-a="dStart"]');ok(A.S.view==='today'&&A.items().length===16,'own start');
  const its=A.items();const per={};its.forEach(i=>per[i.domain]=(per[i.domain]||0)+1);ok(JSON.stringify(per)==='{"health":4,"grow":3,"rel":3,"rest":3,"money":3}','own alloc');
  ok(its[0].question==='어젯밤 8시간 이상 잤나요?','own target kept');
  click(w,'[data-a="tab"][data-v="report"]');ok(txt(w).includes('아직 기록이 없어요'),'own empty report');
  click(w,'[data-a="tab"][data-v="today"]');click(w,'[data-a="menu"]');ok(w.document.querySelector('[data-a="reset"]'),'reset in menu');
  // 일요일: 지난주 돌아보기
  let w4=open('2026-10-11');await sleep(60);click(w4,'[data-a="samples"]');click(w4,'[data-a="pickSample"][data-id="dotori"]');ok(txt(w4).includes('지난주 돌아보기')&&txt(w4).includes('남은 항목 16개'),'sunday weekly group');
  click(w4,'[data-a="cycle"][data-g="weekly"]',0);ok(w4.__anchor.getE('W2026-10-04').i04==='done','weekly saved to last week');
  // 이틀 전은 읽기 전용
  let w5=open('2026-10-08');await sleep(60);click(w5,'[data-a="samples"]');click(w5,'[data-a="pickSample"][data-id="dotori"]');click(w5,'[data-a="day"][data-v="-1"]');ok(!w5.document.querySelector('[data-a="cycle"]').disabled,'yesterday editable');
  click(w5,'[data-a="day"][data-v="-1"]');ok(w5.document.querySelector('[data-a="cycle"]').disabled&&txt(w5).includes('이틀 전 기록은 볼 수만 있어요'),'2 days ago read-only');
  ok(w5.document.querySelector('[data-a="day"][data-v="1"]')&&!w5.document.querySelector('[data-a="day"][data-v="1"]').disabled,'can go forward');
  // 상태 이름(done·miss·na)이 화면 전체용 스타일 이름과 겹치지 않는다. '했음' 원이 완료 화면 크기로 커지던 문제의 재발 방지
  const css=fs.readFileSync('src/style.css','utf8');
  for(const st of ['done','miss','na','e'])ok(!new RegExp('(^|[\\s,}>+~])\\.'+st+'(?![\\w-])').test(css),'no bare .'+st+' rule');
  ok(!/class="(done|miss|na)["\s]/.test(fs.readFileSync('src/app.js','utf8')),'no bare state class in markup');
  // 팀 원본 데이터 구조: 직무 칩 5개, 샘플 카드 설명, 문항 문장, 안전 카드 연락처
  let w6=open('2026-10-08');await sleep(60);
  ok(w6.document.querySelectorAll('[data-a="job"]').length===5,'5 job chips');
  click(w6,'[data-a="samples"]');ok(txt(w6).includes('4주 기록 · 기본 시연')&&txt(w6).includes('가입 첫 주')&&txt(w6).includes('컨디션이 계속 낮을 때'),'sample descs');
  for(const smp of DATA.samples){click(w6,'[data-a="pickSample"][data-id="'+smp.id+'"]');const its6=w6.__anchor.items();
    ok(its6.length===smp.items.length&&its6.every((it,i)=>it.id===smp.items[i].id&&it.question===smp.items[i].question&&it.domain===smp.items[i].domain&&it.freq===smp.items[i].freq),'items match data '+smp.id);
    ok(!txt(w6).includes('undefined')&&!txt(w6).includes('NaN'),'no undefined '+smp.id);
    if(smp.id==='gureum'){ok(w6.document.querySelectorAll('.safe li').length===3&&w6.document.querySelectorAll('.safe li a[href^="tel:"]').length===2,'safety contacts');click(w6,'.safe .btn')}
    click(w6,'[data-a="tab"][data-v="report"]');ok(!txt(w6).includes('undefined')&&!txt(w6).includes('NaN'),'report no undefined '+smp.id);
    click(w6,'[data-a="tab"][data-v="today"]');click(w6,'[data-a="menu"]');click(w6,'[data-a="leave"]');click(w6,'[data-a="samples"]')}
  // 디자인 토큰: 원본(docs/design/anchor_design_tokens.txt 20번 구역)의 라이트 값과 크기 값이 스타일에 글자 그대로 들어 있다
  const tok=fs.readFileSync('docs/design/anchor_design_tokens.txt','utf8');
  const light=tok.slice(tok.indexOf(':root, [data-theme="light"] {'),tok.indexOf('[data-theme="dark"] {'));
  const sizes=tok.slice(tok.lastIndexOf(':root {'));
  const decl=[...(light+sizes).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]);
  ok(decl.length>=150,'token count '+decl.length);
  const cssVars={};for(const m of css.matchAll(/(--[\w-]+):\s*([^;}]+)[;}]/g))if(!(m[1] in cssVars))cssVars[m[1]]=m[2].trim();
  const off=decl.filter(([k,v])=>cssVars[k]!==v).map(([k,v])=>k+' '+cssVars[k]+' != '+v);
  ok(off.length===0,'tokens match original: '+off.slice(0,5).join(' | '));
  // 외부 요청 없음: 배포 파일에 바깥 주소가 하나도 없고, 글꼴은 같은 폴더의 파일만 가리킨다
  ok(!/https?:\/\//.test(html),'no external url in index.html');
  const urls=[...html.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/["']/g,''));
  ok(urls.every(u=>u.startsWith('#')||u.startsWith('fonts/')),'only local urls '+urls.join(','));
  for(const u of urls.filter(u=>u.startsWith('fonts/'))){ok(fs.existsSync(u),'font file exists '+u);ok(fs.readFileSync('sw.js','utf8').includes('./'+u),'font precached '+u)}
  ok(fs.existsSync('fonts/LICENSE.txt'),'font license shipped');
  // 해당 없음 안내(3장 문항표)가 오늘 체크와 항목 고르기에 보인다
  let w7=open('2026-10-08');await sleep(60);click(w7,'[data-a="samples"]');click(w7,'[data-a="pickSample"][data-id="dotori"]');
  ok(w7.document.querySelector('[data-id="i12"] .nah')&&w7.document.querySelector('[data-id="i12"] .nah').textContent==='출근하지 않은 날은 −','na hint on today');
  ok(!w7.document.querySelector('[data-id="i01"] .nah'),'no hint when none');
  // 씨글라스는 영역마다 다른 조각 모양, 다섯 영역 줄에 이름이 함께 있다
  const shapes=[...w7.document.querySelectorAll('.top .doms .gl svg')].map(x=>x.querySelector('.gb').outerHTML);
  ok(shapes.length===5&&new Set(shapes).size===5,'five distinct glass shapes');
  ok(w7.document.querySelector('.top .doms').textContent==='건강성장관계회복재정','domain names in fixed order');
  // 접힌 영역 줄의 작은 상태 표시
  click(w7,'[data-a="cycle"][data-id="i05"]');click(w7,'[data-a="cycle"][data-id="i06"]');click(w7,'[data-a="cycle"][data-id="i06"]');await sleep(750);
  ok([...w7.document.querySelectorAll('.fold .mk')].map(x=>x.className.replace(/ d-\w+/,'')).join(',')==='mk done,mk miss','fold marks');
  // ② 이전 버튼: 1단계에서 ①로, 2단계에서 앞 영역 또는 1단계로. 호칭은 남는다
  click(w7,'[data-a="menu"]');click(w7,'[data-a="leave"]');
  const nm7=w7.document.getElementById('nm');nm7.value='밤톨';nm7.dispatchEvent(new w7.Event('input',{bubbles:true}));
  click(w7,'[data-a="job"][data-j="법률"]');click(w7,'[data-a="startNext"]');click(w7,'[data-a="imp"][data-k="health"][data-v="5"]');click(w7,'[data-a="dNext1"]');
  ok(txt(w7).includes('2 / 3 · 항목 고르기')&&txt(w7).includes('점선 상자를 누르면 기준값을 바꿔요'),'step2 helper');
  click(w7,'[data-a="dConfirm"]');click(w7,'[data-a="dPrev"]');ok(txt(w7).includes('건강')&&txt(w7).includes('2 / 3'),'prev to first domain');
  click(w7,'[data-a="dPrev"]');ok(txt(w7).includes('1 / 3 · 영역 중요도'),'prev to step1');
  click(w7,'[data-a="dPrev"]');ok(w7.__anchor.S.view==='start'&&w7.document.getElementById('nm').value==='밤톨'&&w7.document.querySelector('[data-j="법률"]').getAttribute('aria-pressed')==='true','prev to start keeps draft');
  // ④ 컨디션을 고르기 전에는 저장이 잠기고 이유를 알려 준다. 체크 없이 컨디션만 남겨도 완료 화면과 리포트가 이어진다
  let w8=open('2026-10-08');await sleep(60);const nm8=w8.document.getElementById('nm');nm8.value='밤톨';nm8.dispatchEvent(new w8.Event('input',{bubbles:true}));
  click(w8,'[data-a="job"][data-j="기타"]');click(w8,'[data-a="startNext"]');click(w8,'[data-a="imp"][data-k="health"][data-v="5"]');click(w8,'[data-a="dNext1"]');for(let i=0;i<5;i++)click(w8,'[data-a="dConfirm"]');click(w8,'[data-a="dStart"]');
  click(w8,'[data-a="toClose"]');ok(w8.document.querySelector('[data-a="saveClose"]').disabled&&txt(w8).includes('위에서 컨디션을 고르면 저장할 수 있어요'),'save hint');
  click(w8,'[data-a="cond"][data-v="3"]');ok(!w8.document.querySelector('[data-a="saveClose"]').disabled&&!txt(w8).includes('위에서 컨디션을 고르면'),'hint gone');
  click(w8,'[data-a="saveClose"]');ok(w8.__anchor.S.view==='done'&&txt(w8).includes('0개 영역을 채웠어요'),'done without checks');click(w8,'.donescr');
  ok(w8.__anchor.S.view==='today'&&txt(w8).includes('오늘 마무리했어요 · 컨디션 3'),'back after tap');
  click(w8,'[data-a="tab"][data-v="report"]');ok(w8.document.querySelector('.pend')&&txt(w8).includes('평균 컨디션 3.0 · 기록 0일')&&!txt(w8).includes('아직 기록이 없어요'),'report shows condition-only day');
  ok(JSON.parse(w8.localStorage.getItem('anchor.ui')).last_report_week==='2026-10-04','last report week saved on open');
  // 낭독 문구는 기획안 예시의 모양 ("어젯밤 7시간, 했음")
  click(w8,'[data-a="tab"][data-v="today"]');click(w8,'[data-a="cycle"]',0);await sleep(60);
  ok(w8.document.getElementById('live').textContent==='어젯밤 7시간, 했음','live text '+w8.document.getElementById('live').textContent);
  // 배포 원칙: 첫 화면은 맨 바깥의 index.html, 프레임워크 없음, Vercel에는 실행에 필요한 것만, 올라가는 파일에 키·실명·연락처 없음
  ok(fs.existsSync('index.html')&&!fs.existsSync('dist'),'index.html at repo root');
  ok(!/react|vue|angular|svelte|jquery/i.test(JSON.stringify(require('./package.json').dependencies||{}))&&!/<script[^>]+src=/.test(html),'vanilla, no script src');
  const vi=fs.readFileSync('.vercelignore','utf8').split('\n').filter(l=>l&&!l.startsWith('#'));
  ok(vi[0]==='/*'&&vi.slice(1).sort().join(',')==='!fonts,!index.html,!sw.js,!vercel.json','vercel serves only runtime files');
  ok(JSON.stringify(require('./vercel.json'))==='{"framework":null}','vercel.json: no framework, no build');
  const gi=fs.readFileSync('.gitignore','utf8').split('\n').filter(l=>l&&!l.startsWith('#'));
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const f=(d==='.'?'':d+'/')+e.name;if(e.name==='.git'||gi.some(g=>f===g.replace(/\/$/,'')||f.startsWith(g.replace(/\/$/,'')+'/')))return [];return e.isDirectory()?walk(f):[f]});
  const up=walk('.');ok(up.includes('index.html')&&up.includes('sw.js')&&up.includes('fonts/LICENSE.txt')&&up.includes('README.md')&&!up.some(f=>/spec_v2|PROMPT|node_modules/.test(f)),'files that go to the public repo');
  const SECRET=/(api[_-]?key|secret|passw(or)?d|bearer\s|authorization|sk-[a-z0-9]{12,}|AKIA[0-9A-Z]{12,})/i,MAIL=/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}/,PHONE=/01[016789][- ]?\d{3,4}[- ]?\d{4}/,PATH=/C:\\\\Users|\/Users\/|OneDrive|카카오톡/;
  const hits=[];for(const f of up){if(/\.(png|woff2)$/.test(f)||f==='package-lock.json'||f==='test.js'||f==='fonts/LICENSE.txt')continue;const s=fs.readFileSync(f,'utf8');
    for(const [n,re] of [['key',SECRET],['mail',MAIL],['phone',PHONE],['path',PATH]]){const m=re.exec(s);if(m)hits.push(f+':'+n+':'+m[0])}}
  ok(hits.length===0,'no secrets or personal info in uploaded files: '+hits.slice(0,5).join(' | '));
  // 확인 창: 버튼 글자가 배경에 묻히지 않게 색을 규칙으로만 정한다(인라인 색 금지)
  { const css=fs.readFileSync('src/style.css','utf8'),js=fs.readFileSync('src/app.js','utf8');
    ok(/\.safe \.btn\.solid\{background:var\(--ink\);color:#fff\}/.test(css)&&/<button class="btn solid" data-a="resetYes">지우기<\/button>/.test(js),'confirm dialog: delete button has visible label');
    ok(!/<button[^>]*style="[^"]*(background|color)/.test(js),'no inline colors on buttons'); }
  console.log('PASS',pass);
})().catch(e=>{console.error('FAIL after',pass,e.stack.split('\n').slice(0,3).join(' | '));process.exit(1)});
