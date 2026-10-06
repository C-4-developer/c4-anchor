// 기획안 v2.0의 기능 설명을 한 줄씩 실제 브라우저 엔진(크로미움)에서 눌러 보고 docs/checklist_v2.0.md 를 다시 쓴다.
// 쓰는 법: npm run build 뒤에  node tools/check_spec.js   (playwright 가 필요하다. package.json 에는 넣지 않았다)
// jsdom(npm test)은 화면 크기·터치·내려받기·오프라인을 볼 수 없어서 따로 둔 점검이다.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..'); // 저장소 맨 바깥의 index.html, sw.js, fonts/ 를 그대로 띄운다
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const DATA = require('../data/anchor_demo_data.json');
const VIZ = require('../docs/spec-data/VIZ.json');
const D0 = '2026-10-08'; // 목요일. 기획안 화면 예시의 날짜

let browser, base, external = [], pageErrors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function open(date = D0, opt = {}) {
  const ctx = opt.ctx || await browser.newContext({ viewport: { width: opt.w || 390, height: opt.h || 844 }, hasTouch: true, isMobile: true, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('request', r => { if (!r.url().startsWith(base) && !/^(data|blob):/.test(r.url())) external.push(r.url()); });
  p.on('pageerror', e => pageErrors.push(e.message));
  p.on('dialog', d => { pageErrors.push('dialog: ' + d.message()); d.dismiss(); });
  await p.goto(base + '?date=' + date); await p.waitForTimeout(220);
  return p;
}
const txt = p => p.evaluate(() => document.getElementById('app').innerText + '\n' + document.getElementById('sheets').innerText);
const A = (p, fn, arg) => p.evaluate(fn, arg);
const view = p => p.evaluate(() => window.__anchor.S.view);
const has = async (p, s) => (await txt(p)).includes(s);
async function sample(p, id) { await p.click('[data-a="samples"]'); await p.click(`[data-a="pickSample"][data-id="${id}"]`); await p.waitForTimeout(120); }
async function setup(p, o = {}) { // ① → ② → ③ 직접 설정
  if (o.name != null) await p.fill('#nm', o.name);
  await p.click(`[data-a="job"][data-j="${o.job || '회계·감사'}"]`); await p.click('[data-a="startNext"]');
  const imp = o.imp || { health: 5, grow: 4, rel: 4, rest: 3, money: 2 };
  for (const k in imp) await p.click(`[data-a="imp"][data-k="${k}"][data-v="${imp[k]}"]`);
  await p.click('[data-a="dNext1"]');
  for (let i = 0; i < 5; i++) await p.click('[data-a="dConfirm"]');
  if (o.stopAt3) return;
  await p.click('[data-a="dStart"]'); await p.waitForTimeout(100);
}
async function swipe(p, dx) { // 손가락으로 가로로 미는 동작
  await p.evaluate(dx => { const t = document.querySelector('.list'), x0 = 200, y = 400;
    const mk = x => new Touch({ identifier: 1, target: t, clientX: x, clientY: y });
    t.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(x0)], changedTouches: [mk(x0)] }));
    t.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(x0 + dx)] })); }, dx);
  await p.waitForTimeout(80);
}
const dateText = p => p.textContent('.daterow b');
const cyc = (p, id) => p.click(`[data-a="cycle"][data-id="${id}"]`);
const entry = (p, key, id) => p.evaluate(([k, i]) => window.__anchor.getE(k)[i] || '', [key, id]);
const ls = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem('anchor.' + k)), k);
async function closeDay(p, cond, memo) { await p.click('[data-a="toClose"]'); await p.click(`[data-a="cond"][data-v="${cond}"]`); if (memo) await p.fill('#memo', memo); await p.click('[data-a="saveClose"]'); await p.waitForTimeout(150); }

// ───────── 점검 목록: [번호, 기획안 위치, 요구, 확인 함수 | '사람 확인: 이유'] ─────────
const C = [];
const add = (id, where, req, run) => C.push({ id, where, req, run });

// ① 시작
add('①-1', '1장 ① 표 1', '호칭 1–10자, 선택. 비우면 ‘나’', async () => {
  const p = await open(); await p.click('#nm'); await p.keyboard.type('가나다라마바사아자차카타');
  assert.equal((await p.inputValue('#nm')).length, 10, '10자에서 멈춰야 함');
  const q = await open(); await setup(q, { stopAt3: true }); assert(await has(q, '나 님의 앵커 16개'), '비우면 나');
  return '12자를 쳐도 10자에서 멈춤. 비우고 진행하면 “나 님의 앵커 16개”';
});
add('①-2', '1장 ① 표 2·3', '직무 칩 하나 선택(필수). 고르면 ‘다음’ 활성 → ②', async () => {
  const p = await open(); assert(await p.isDisabled('[data-a="startNext"]')); assert.equal(await p.locator('[data-a="job"]').count(), 5);
  await p.click('[data-a="job"][data-j="법률"]'); await p.click('[data-a="job"][data-j="컨설팅"]');
  assert.equal(await p.locator('[data-a="job"][aria-pressed="true"]').count(), 1); assert(!(await p.isDisabled('[data-a="startNext"]')));
  await p.click('[data-a="startNext"]'); assert(await has(p, '1 / 3 · 영역 중요도'));
  return '직무 5개 중 하나만 선택되고, 고르기 전에는 ‘다음’이 눌리지 않음';
});
add('①-4', '1장 ① 표 4', '샘플로 둘러보기: 바텀시트에서 3개 중 선택 → 바로 ③, 상단에 ‘샘플 기록’ 배지', async () => {
  const p = await open(); await p.click('[data-a="samples"]'); const t = await txt(p);
  for (const s of ['도토리', '4주 기록 · 기본 시연', '라온', '가입 첫 주', '구름', '컨디션이 계속 낮을 때']) assert(t.includes(s), s);
  await p.click('[data-a="pickSample"][data-id="dotori"]'); await p.waitForTimeout(100);
  assert.equal(await view(p), 'today'); assert(await has(p, '샘플 기록'));
  return '카드 3개와 한 줄 설명이 보이고, 고르면 오늘 체크로 바로 들어감';
});
add('①-5', '1장 ① 아래', '이미 설정을 마친 사람이 열면 ①을 건너뛰고 ③', async () => {
  const p = await open(); await setup(p, { name: '밤톨' }); await p.reload(); await p.waitForTimeout(200);
  assert.equal(await view(p), 'today'); return '설정 뒤 새로고침하면 오늘 체크가 먼저 뜸';
});

// ② 나다움 설계
add('②-1', '1장 ② 표 1', '중요도 씨글라스 5칸: 탭한 칸까지 채움, 기본 3, 좌우 키로도 조정', async () => {
  const p = await open(); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]');
  const filled = k => p.locator(`.imp.d-${k} .cells .gl:not(.clear)`).count();
  for (const k of ['health', 'grow', 'rel', 'rest', 'money']) assert.equal(await filled(k), 3, '기본 3');
  await p.click('[data-a="imp"][data-k="health"][data-v="5"]'); assert.equal(await filled('health'), 5);
  await p.focus('[data-a="imp"][data-k="health"][data-v="5"]'); await p.keyboard.press('ArrowLeft'); assert.equal(await filled('health'), 4);
  await p.keyboard.press('ArrowRight'); assert.equal(await filled('health'), 5);
  return '다섯 영역 모두 3칸으로 시작, 5번째 칸을 누르면 5칸, ← 키로 4칸, → 키로 5칸';
});
add('②-2', '1장 ② 표 2 · 2장 항목 배분', '배분 미리보기 실시간 계산, 영역당 최소 2개. 예: 5·4·4·3·2, 16개 → 4·3·3·3·3', async () => {
  const p = await open(); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]');
  for (const [k, v] of [['health', 5], ['grow', 4], ['rel', 4], ['rest', 3], ['money', 2]]) await p.click(`[data-a="imp"][data-k="${k}"][data-v="${v}"]`);
  assert(await has(p, '건강 4 · 성장 3 · 관계 3 · 회복 3 · 재정 3'));
  const bad = await A(p, () => { const out = []; for (let N = 15; N <= 20; N++) for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) for (let c = 1; c <= 5; c += 2) { const o = window.__anchor.allocate({ health: a, grow: b, rel: c, rest: 6 - a, money: 6 - b }, N), v = Object.values(o); if (v.reduce((x, y) => x + y, 0) !== N || v.some(x => x < 2)) out.push(N) } return out.length });
  assert.equal(bad, 0); return '예시 값이 그대로 나오고, 450가지 조합에서 합계와 최소 2개가 지켜짐';
});
add('②-3', '1장 ② 표 3', '총 항목 수 15–20, 기본 16. 점수가 모두 같으면 안내 1회 후 진행', async () => {
  const p = await open(); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]');
  assert(await has(p, '총 16개')); await p.click('[data-a="total"][data-v="-1"]'); assert(await has(p, '총 15개')); assert(await p.isDisabled('[data-a="total"][data-v="-1"]'));
  for (let i = 0; i < 5; i++) await p.click('[data-a="total"][data-v="1"]'); assert(await has(p, '총 20개')); assert(await p.isDisabled('[data-a="total"][data-v="1"]'));
  await p.click('[data-a="dNext1"]'); assert(await has(p, '차이를 두면 더 나다운 구성이 돼요')); assert(await has(p, '1 / 3'));
  await p.click('[data-a="dNext1"]'); assert(await has(p, '2 / 3 · 항목 고르기'));
  return '15와 20에서 버튼이 멈추고, 같은 점수면 안내가 한 번 뜬 뒤 다시 누르면 넘어감';
});
add('②-4', '1장 ② 표 4 · 설명', '중요도 높은 영역부터 5번 반복. 끝낸 영역은 진하게, 탭하면 그 영역으로 돌아가 수정', async () => {
  const p = await open(); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]');
  await p.click('[data-a="imp"][data-k="rest"][data-v="5"]'); await p.click('[data-a="dNext1"]');
  assert.equal((await p.textContent('.pad h1')).trim(), '회복', '가장 높은 영역부터');
  assert.equal(await p.locator('.prog .gl.dim').count(), 4); await p.click('[data-a="dConfirm"]');
  assert.equal(await p.locator('.prog .gl.dim').count(), 3); assert((await p.getAttribute('.prog button >> nth=0', 'aria-label')).includes('확정됨'));
  await p.click('.prog button >> nth=0'); assert.equal((await p.textContent('.pad h1')).trim(), '회복');
  return '중요도 5로 올린 회복이 먼저 나오고, 확정한 영역 아이콘이 진해지며 누르면 돌아감';
});
add('②-5', '1장 ② 표 5 · 3장 추천 순서', '빠른 답 칩 하나 선택(선택 사항). 추천 순서 = 고른 칩 → 직무 가중 → 나머지(ID 순)', async () => {
  const p = await open(); await p.click('[data-a="job"][data-j="회계·감사"]'); await p.click('[data-a="startNext"]'); await p.click('[data-a="imp"][data-k="health"][data-v="5"]'); await p.click('[data-a="dNext1"]');
  const ids = () => p.$$eval('.pick', x => x.map(e => e.getAttribute('data-t')).join(','));
  assert.equal(await ids(), 'H01,H02,H03,H04,H05,H06', '칩 없이: 직무(H01) → ID 순');
  await p.click('[data-a="dChip"][data-c="운동을 못 해요"]'); assert.equal(await ids(), 'H03,H04,H05,H01,H02,H06');
  await p.click('[data-a="dChip"][data-c="운동을 못 해요"]'); assert.equal(await ids(), 'H01,H02,H03,H04,H05,H06', '다시 누르면 해제');
  return '“운동을 못 해요”를 고르면 H03·H04·H05가 맨 위로, 그다음 직무 문항 H01, 나머지 순';
});
add('②-6', '1장 ② 표 6', '추천 항목: 배정 수 + 2개 노출, 위에서부터 배정 수만큼 미리 체크. 넘겨 체크하면 안내', async () => {
  const p = await open(); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]'); await p.click('[data-a="imp"][data-k="health"][data-v="5"]'); await p.click('[data-a="dNext1"]');
  const st = await p.$$eval('.pick', x => x.map(e => e.getAttribute('aria-checked')).join(','));
  assert.equal(st, 'true,true,true,true,false,false'); await p.click('.pick >> nth=4');
  assert(await has(p, '다른 항목을 해제하거나 앞 단계에서 개수를 늘려요')); assert.equal(await p.locator('.pick[aria-checked="true"]').count(), 4);
  return '배정 4개일 때 6개가 보이고 위 4개가 체크됨. 5번째를 누르면 안내 문구만 뜨고 체크되지 않음';
});
add('②-7', '1장 ② 표 7 · 시트 기준값 수정', '기준값(점선 상자) 탭 → 스테퍼 시트. 범위·조정 단위는 문항표. 바꾼 값은 문장에 바로 반영', async () => {
  const p = await open(); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]'); await p.click('[data-a="imp"][data-k="health"][data-v="5"]'); await p.click('[data-a="dNext1"]');
  await p.click('.pick[data-t="H01"] .tgt'); assert.equal(await p.textContent('.bigstep output'), '7시간'); assert(await has(p, '범위 5–9시간'));
  await p.click('[data-a="tStep"][data-v="1"]'); await p.click('[data-a="tStep"][data-v="1"]'); assert(await p.isDisabled('[data-a="tStep"][data-v="1"]'), '9시간에서 멈춤');
  await p.click('[data-a="tSave"]'); assert(await has(p, '어젯밤 9시간 이상 잤나요?')); assert.equal(await p.getAttribute('.pick[data-t="H01"]', 'aria-checked'), 'true', '상자를 눌러도 체크는 그대로');
  const bad = await A(p, () => window.ANCHOR_DATA.item_templates.filter(t => { const o = window.__anchor.targetOptions(t); return t.target ? !(o && (o.free || o.opts.includes(t.target))) : o !== null }).map(t => t.id));
  assert.equal(bad.length, 0, bad.join()); return '7시간 → 9시간(범위 끝에서 멈춤)으로 바꾸면 문장이 바로 바뀜. 53개 문항의 기본값이 모두 범위 안에 있음';
});
add('②-8', '1장 ② 표 8', '영역 확정: 배정 수를 채우면 활성. 마지막 뒤 3단계 확인(“○○ 님의 앵커 16개 · 매일 n · 주 1회 m”) → 이대로 시작하기 → ③', async () => {
  const p = await open(); await p.fill('#nm', '도토리'); await p.click('[data-a="job"]'); await p.click('[data-a="startNext"]'); await p.click('[data-a="imp"][data-k="health"][data-v="5"]'); await p.click('[data-a="dNext1"]');
  await p.click('.pick >> nth=0'); assert(await p.isDisabled('[data-a="dConfirm"]')); await p.click('.pick >> nth=0');
  for (let i = 0; i < 5; i++) await p.click('[data-a="dConfirm"]');
  const t = await txt(p); assert(t.includes('도토리 님의 앵커 16개')); const m = /매일 (\d+) · 주 1회 (\d+)/.exec(t); assert(m && +m[1] + +m[2] === 16);
  assert.equal(await p.locator('.sum li').count(), 16); await p.click('[data-a="dStart"]'); await p.waitForTimeout(100); assert.equal(await view(p), 'today');
  const items = await ls(p, 'items'); assert.equal(items.length, 16); assert.equal(await p.locator('[data-a="cycle"]').count(), +m[1]);
  return `하나를 해제하면 확정 버튼이 잠김. 확인 화면에 16개 목록과 “매일 ${m[1]} · 주 1회 ${m[2]}”, 시작하면 오늘 체크에 매일 항목 ${m[1]}개`;
});

// ③ 오늘 체크
add('③-0', '1장 ③ 설명', '항목은 영역별로 묶고, 영역 순서는 늘 건강→성장→관계→회복→재정', async () => {
  const p = await open(); await sample(p, 'dotori'); const g = await p.$$eval('.grp', x => x.map(e => e.textContent.trim()).join(','));
  assert.equal(g, '건강,성장,관계,회복,재정'); assert.equal(await p.textContent('.top .doms'), '건강성장관계회복재정'); return '묶음 제목과 위쪽 씨글라스 줄이 모두 이 순서';
});
add('③-1', '1장 ③ 표 1 · 2장 수정 가능 범위', '날짜: 왼쪽으로 밀면 어제로. 수정은 오늘과 어제만, 그 전은 “이틀 전 기록은 볼 수만 있어요”. 미래로는 이동 불가', async () => {
  const p = await open(); await sample(p, 'dotori'); assert.equal(await dateText(p), '10월 8일 목요일');
  await swipe(p, 120); assert.equal(await dateText(p), '10월 8일 목요일', '오른쪽으로 밀어도 미래로 안 감'); assert(await p.isDisabled('[data-a="day"][data-v="1"]'));
  await swipe(p, -120); assert.equal(await dateText(p), '10월 7일 수요일'); assert(!(await p.isDisabled('[data-a="cycle"] >> nth=0')));
  await cyc(p, 'i03'); const v = await entry(p, '2026-10-07', 'i03'); await cyc(p, 'i03'); assert.notEqual(await entry(p, '2026-10-07', 'i03'), v, '어제는 고칠 수 있음');
  await swipe(p, -120); assert.equal(await dateText(p), '10월 6일 화요일'); assert(await has(p, '이틀 전 기록은 볼 수만 있어요')); assert(await p.isDisabled('[data-a="cycle"] >> nth=0'));
  assert.equal(await p.locator('[data-a="toClose"]').count(), 0); await swipe(p, 120); assert.equal(await dateText(p), '10월 7일 수요일');
  return '손가락으로 왼쪽으로 밀면 어제, 한 번 더 밀면 이틀 전(누를 수 없고 안내 문구). 오늘에서 오른쪽으로 밀어도 그대로';
});
add('③-2', '1장 ③ 표 2 · F4', '⋯ 메뉴: 내 기록 내보내기(CSV) · 처음부터 다시(모든 기록 삭제 확인) · 샘플 중에는 ‘샘플 나가기’', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="menu"]'); let t = await txt(p);
  assert(t.includes('내 기록 내보내기 (CSV)') && t.includes('샘플 나가기') && !t.includes('처음부터 다시'));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="csv"]')]); const f = await dl.path(); const csv = fs.readFileSync(f, 'utf8');
  assert.equal(dl.suggestedFilename(), 'anchor_2026-10-08.csv'); const rows = csv.trim().split('\n'); assert(rows[0].includes('날짜,구분,영역,문항,값,컨디션,한 줄')); assert(rows.length > 300);
  await p.click('[data-a="menu"]'); await p.click('[data-a="leave"]'); assert.equal(await view(p), 'start'); assert.equal(await A(p, () => Object.keys(localStorage).filter(k => k.startsWith('anchor.')).length), 0);
  await setup(p, { name: '밤톨' }); await cyc(p, 'i01'); await p.click('[data-a="menu"]'); t = await txt(p); assert(t.includes('처음부터 다시') && !t.includes('샘플 나가기'));
  await p.click('[data-a="reset"]'); assert(await has(p, '모든 기록을 지우고 처음부터 다시 할까요?')); await p.click('.safe [data-a="closeSheet"]'); assert.equal(await view(p), 'today'); assert.equal(await entry(p, D0, 'i01'), 'done', '취소하면 그대로');
  await p.click('[data-a="menu"]'); await p.click('[data-a="reset"]'); await p.click('[data-a="resetYes"]'); assert.equal(await view(p), 'start'); assert.equal(await A(p, () => Object.keys(localStorage).filter(k => k.startsWith('anchor.')).length), 0);
  return `CSV 파일 anchor_2026-10-08.csv 가 ${rows.length - 1}줄로 내려받아짐. 샘플 나가기·처음부터 다시(확인 창, 취소 가능) 모두 저장소를 비우고 ①로 감`;
});
add('③-3', '1장 ③ 표 3 · 2장 영역 채움', '다섯 영역 씨글라스: 채움 = ● 50% 이상 · 진한 테두리 = 입력했지만 50% 미만 · 흐림 = 입력 없음(−만 있으면 회색). 탭할 때마다 갱신', async () => {
  const p = await open(); await sample(p, 'dotori'); const cls = k => p.getAttribute(`.top .doms .d-${k} .gl`, 'class');
  assert((await cls('grow')).includes('dim')); await cyc(p, 'i05'); assert(!/dim|out|gray/.test(await cls('grow')), '1/1 = 채움');
  await cyc(p, 'i05'); assert((await cls('grow')).includes('out'), '0/1 = 진한 테두리'); await cyc(p, 'i06'); assert(!/dim|out|gray/.test(await cls('grow')), '1/2 = 50% 채움');
  await cyc(p, 'i11'); await cyc(p, 'i11'); await cyc(p, 'i11'); assert((await cls('rest')).includes('gray'), '−만 = 회색'); assert((await cls('money')).includes('dim'));
  return '한 번 누를 때마다 위쪽 조각이 바뀜: 1/1 채움, 0/1 진한 테두리, 1/2 채움, −만 있으면 회색, 입력 없으면 흐림';
});
add('③-4', '1장 ③ 표 4', '실험 배너: 이번 주 실험이 있을 때만. ‘오늘 했어요’ = 오늘 수행 1회(다시 누르면 취소), 하루 1회까지', async () => {
  const p = await open(); await sample(p, 'dotori'); assert(await has(p, '이번 주 실험 · 2/3회')); assert(await has(p, '퇴근 후 20분 걷기'));
  await p.click('[data-a="expDone"]'); assert(await has(p, '이번 주 실험 · 3/3회')); assert.equal(await p.getAttribute('[data-a="expDone"]', 'aria-pressed'), 'true');
  await p.click('[data-a="expDone"]'); assert(await has(p, '이번 주 실험 · 2/3회')); await p.click('[data-a="expDone"]'); await p.reload(); await p.waitForTimeout(200); assert(await has(p, '이번 주 실험 · 3/3회'), '새로고침 뒤에도 남음');
  await p.click('[data-a="day"][data-v="-1"]'); assert.equal(await p.locator('.exp').count(), 0, '어제 화면에는 없음');
  const q = await open(); await sample(q, 'raon'); assert.equal(await q.locator('.exp').count(), 0);
  return '도토리는 2/3회로 시작해 누르면 3/3회, 다시 누르면 2/3회. 실험이 없는 라온에는 배너가 없음';
});
add('③-5a', '1장 ③ 표 5', '순환 버튼: 미입력 → 했음 → 못 했음 → 해당 없음 → 미입력. 행 전체가 탭 영역(높이 52px). 탭하는 즉시 저장', async () => {
  const p = await open(); await sample(p, 'dotori'); const seq = [];
  for (let i = 0; i < 4; i++) { await p.click('[data-id="i01"] .t'); seq.push(await entry(p, D0, 'i01')); }
  assert.equal(seq.join(','), 'done,miss,na,'); const h = await p.$$eval('[data-a="cycle"]', x => Math.min(...x.map(e => e.getBoundingClientRect().height)));
  assert(h >= 52, '높이 ' + h); await cyc(p, 'i01'); assert.equal((await ls(p, 'entries'))[D0].i01, 'done'); await p.reload(); await p.waitForTimeout(200); assert.equal(await entry(p, D0, 'i01'), 'done');
  const shapes = await p.evaluate(() => { const r = {}; for (const s of ['e', 'done', 'miss', 'na']) { const el = document.createElement('span'); el.className = 'cb ' + s + ' d-health'; document.querySelector('.list').appendChild(el); const c = getComputedStyle(el), a = getComputedStyle(el, '::after'); r[s] = [c.borderTopStyle, c.borderTopWidth, c.backgroundColor, a.content !== 'none' ? a.width : ''].join('|'); el.remove() } return r });
  assert.equal(new Set(Object.values(shapes)).size, 4, JSON.stringify(shapes)); assert(shapes.e.startsWith('dashed|') && shapes.miss.startsWith('solid|') && shapes.done.startsWith('none|') && shapes.na.startsWith('none|') && shapes.done !== shapes.na, JSON.stringify(shapes));
  return `문장 쪽을 눌러도 순서대로 바뀜. 가장 낮은 행 높이 ${Math.round(h)}px. 새로고침 뒤에도 값이 남음. 네 상태는 점선 원 / 채움+체크 / 진한 테두리 / 선으로 모양이 다름`;
});
add('③-5b', '1장 ③ 표 5', '바뀔 때 0.8초 상태 문구와 낭독 문구(“어젯밤 7시간, 했음”)', async () => {
  const p = await open(); await sample(p, 'dotori'); await cyc(p, 'i01'); assert.equal(await p.textContent('[data-id="i01"] .st'), '했음'); await p.waitForTimeout(120);
  assert.equal(await p.textContent('#live'), '어젯밤 7시간, 했음'); await p.waitForTimeout(600); assert.equal(await p.locator('[data-id="i01"] .st').count(), 1, '0.7초에는 아직 보임');
  await p.waitForTimeout(350); assert.equal(await p.locator('[data-id="i01"] .st').count(), 0, '0.8초 뒤 사라짐');
  return '누르면 원 왼쪽에 “했음”이 잠깐 보였다 사라지고, 화면 낭독용 문구는 “어젯밤 7시간, 했음”';
});
add('③-5c', '1장 ③ 표 5 · 시트 기준값 수정 · 5장 저장', '길게 누르면 기준값 수정 시트. “다음 체크부터 이 기준으로 물어볼게요”, 지난 기록의 문장은 그대로(새 버전으로 저장)', async () => {
  const p = await open(); await sample(p, 'dotori'); const b = await p.locator('[data-id="i01"]').boundingBox();
  await p.mouse.move(b.x + 80, b.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(100);
  assert(await has(p, '기준값 바꾸기')); assert(await has(p, '다음 체크부터 이 기준으로 물어볼게요')); assert.equal(await entry(p, D0, 'i01'), '', '길게 눌러도 값은 안 바뀜');
  await p.click('[data-a="tStep"][data-v="1"]'); await p.click('[data-a="tSave"]'); assert(await has(p, '어젯밤 8시간 이상 잤나요?'));
  const it = (await ls(p, 'items'))[0]; assert.equal(it.version, 2); assert.equal(it.target, '8시간');
  await p.click('[data-a="day"][data-v="-1"]'); assert(await has(p, '어젯밤 7시간 이상 잤나요?'), '어제 화면은 당시 문장');
  await p.click('[data-a="day"][data-v="1"]'); await p.mouse.move(b.x + 80, b.y + 150); const b2 = await p.locator('[data-id="i05"]').boundingBox();
  await p.mouse.move(b2.x + 80, b2.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); assert.equal(await p.locator('.bigstep').count(), 0, '기준값 없는 문항은 시트가 안 뜸');
  return '0.7초 누르면 시트가 뜨고 값은 그대로. 8시간으로 바꾸면 오늘 문장만 바뀌고 어제 화면은 “7시간” 그대로, 항목 버전이 2가 됨';
});
add('③-6', '1장 ③ 표 6 · 완료 기준 4', '영역 항목을 모두 입력하면 0.6초 뒤 “성장 2/2 · 다 입력했어요” 한 줄로 접힘. 누르면 다시 펼침. 처음엔 모두 펼쳐져 있음', async () => {
  const p = await open(); await sample(p, 'dotori'); assert.equal(await p.locator('.fold').count(), 0); await cyc(p, 'i05'); await cyc(p, 'i06');
  await p.waitForTimeout(350); assert.equal(await p.locator('.fold').count(), 0, '0.35초에는 아직'); await p.waitForTimeout(450);
  assert.equal((await p.textContent('.fold')).replace(/\s+/g, ' ').trim(), '성장 2/2· 다 입력했어요'); await p.click('.fold'); assert.equal(await p.locator('.fold').count(), 0); assert.equal(await p.locator('[data-id="i05"]').count(), 1);
  return '두 항목을 다 누르고 0.6초쯤 뒤 “성장 2/2 · 다 입력했어요” 한 줄로 접히고, 누르면 펼쳐짐';
});
add('③-7', '1장 ③ 표 7·8', '남은 항목 = 미입력 수, 0이면 “다 입력했어요”. 하루 마무리하기는 항상 활성, 남은 항목은 미입력으로 둠(못 했음으로 바꾸지 않음)', async () => {
  const p = await open(); await sample(p, 'dotori'); assert(await has(p, '남은 항목 11개')); assert(!(await p.isDisabled('[data-a="toClose"]')));
  await cyc(p, 'i01'); assert(await has(p, '남은 항목 10개')); await closeDay(p, 3); await p.waitForTimeout(2300);
  const e = (await ls(p, 'entries'))[D0]; assert.deepEqual(e, { i01: 'done' }); assert(await has(p, '남은 항목 10개'));
  for (const id of ['i02', 'i03', 'i05', 'i06', 'i08', 'i09', 'i11', 'i12', 'i14', 'i15']) { await p.click(`[data-a="cycle"][data-id="${id}"]`).catch(async () => { for (const f of await p.$$('.fold')) await f.click(); await cyc(p, id) }); }
  assert((await p.textContent('.dock .left')) === '다 입력했어요'); return '11개로 시작해 누를 때마다 줄고, 하나만 입력하고 마무리해도 나머지는 빈 채로 남음. 다 채우면 “다 입력했어요”';
});
add('③-9', '1장 ③ 표 9 · 전제', '하단 탭은 오늘 · 리포트 2개', async () => {
  const p = await open(); await sample(p, 'dotori'); assert.equal(await p.$$eval('.tabbar button', x => x.map(e => e.textContent).join(',')), '오늘,리포트');
  await p.click('[data-a="tab"][data-v="report"]'); assert.equal(await view(p), 'report'); await p.click('[data-a="tab"][data-v="today"]'); assert.equal(await view(p), 'today'); return '탭 2개로 두 화면을 오감';
});
add('③-일', '1장 ③ 일요일 · 2장 주', '일요일: 주간 항목이 맨 위 ‘지난주 돌아보기’ 묶음으로 나오고, 지난주(일–토) 기록으로 저장', async () => {
  const p = await open('2026-10-11'); await sample(p, 'dotori'); assert.equal((await p.textContent('.grp >> nth=0')).trim(), '지난주 돌아보기'); assert(await has(p, '남은 항목 16개'));
  await p.click('[data-a="cycle"][data-g="weekly"] >> nth=0'); const e = await ls(p, 'entries'); assert.equal(e['W2026-10-04'].i04, 'done'); assert(!e['2026-10-11']);
  const q = await open(D0); await sample(q, 'dotori'); assert(!(await has(q, '지난주 돌아보기'))); return '10월 11일(일)에 주간 5개가 맨 위에 나오고, 누르면 10월 4일 주의 기록으로 저장됨. 목요일에는 안 나옴';
});
add('③-마', '1장 ③ 마무리 뒤 다시 열면', '상단에 “오늘 마무리했어요 · 컨디션 4”. 항목은 계속 고칠 수 있음', async () => {
  const p = await open(); await sample(p, 'dotori'); await closeDay(p, 4); await p.waitForTimeout(2300); await p.reload(); await p.waitForTimeout(200);
  assert(await has(p, '오늘 마무리했어요 · 컨디션 4')); await cyc(p, 'i01'); assert.equal(await entry(p, D0, 'i01'), 'done'); return '마무리 뒤 새로고침해도 문구가 보이고 항목을 누를 수 있음';
});
add('③-3일', '1장 ③ 3일 이상 기록 없이 열면', '“다시 오셨네요. 오늘부터 이어 가요” 한 줄만. 지난 날을 채우라고 하지 않음', async () => {
  const p = await open('2026-10-01'); await setup(p, { name: '밤톨' }); await cyc(p, 'i01'); const ctx = p.context();
  const q = await open('2026-10-04', { ctx }); assert(!(await has(q, '다시 오셨네요')), '이틀 비운 날은 안 뜸');
  const r = await open('2026-10-05', { ctx }); assert(await has(r, '다시 오셨네요. 오늘부터 이어 가요')); await cyc(r, 'i01'); assert(!(await has(r, '다시 오셨네요')));
  return '10월 1일에 기록하고 5일에 열면 문구가 뜸(4일에는 안 뜸). 오늘 항목을 누르면 사라짐';
});

// ④ 하루 마무리
add('④-1', '1장 ④ 표 1', '컨디션 1–5: 필수, 하나 선택. 에너지 막대 수 + 숫자 + 말. 색만으로 구분하지 않음', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="toClose"]');
  const c = await p.$$eval('[data-a="cond"]', x => x.map(e => e.querySelectorAll('b.f').length + ':' + e.querySelector('strong').textContent + ':' + e.textContent.replace(/^\d/, '')).join(' '));
  assert.equal(c, '1:1:많이 지침 2:2:지침 3:3:보통 4:4:괜찮음 5:5:아주 좋음'); await p.click('[data-a="cond"][data-v="2"]'); await p.click('[data-a="cond"][data-v="4"]');
  assert.equal(await p.locator('[data-a="cond"][aria-checked="true"]').count(), 1); return '카드마다 막대 1–5개, 숫자, 말이 함께 있고 하나만 선택됨';
});
add('④-2', '1장 ④ 표 2', '병에 담을 한 줄: 선택, 60자. 리포트의 요일별 컨디션에서 그날을 누르면 다시 보임', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="toClose"]'); await p.click('#memo'); await p.keyboard.type('가'.repeat(65));
  assert.equal((await p.inputValue('#memo')).length, 60); assert.equal(await p.textContent('#memoCnt'), '60/60'); await p.fill('#memo', '점심 뒤 짧게 걸었다'); assert.equal(await p.textContent('#memoCnt'), '11/60');
  await p.click('[data-a="cond"][data-v="4"]'); assert.equal(await p.inputValue('#memo'), '점심 뒤 짧게 걸었다', '컨디션을 골라도 쓴 글이 남음'); await p.click('[data-a="saveClose"]'); await p.waitForTimeout(2400);
  await p.click('[data-a="tab"][data-v="report"]'); await p.click('[data-a="wk"][data-v="1"]'); await p.click('[data-a="kday"][data-d="2026-10-08"]'); assert(await has(p, '“점심 뒤 짧게 걸었다”'));
  return '60자에서 멈추고 글자 수가 표시됨. 저장한 한 줄은 리포트에서 그날 막대를 누르면 다시 보임';
});
add('④-3', '1장 ④ 표 3', '오늘의 다섯 영역: 읽기 전용 요약. 누르면 ③의 그 영역으로 돌아가 수정', async () => {
  const p = await open(); await sample(p, 'dotori'); await cyc(p, 'i05'); await cyc(p, 'i06'); await p.waitForTimeout(800); await p.click('[data-a="toClose"]');
  assert.equal(await p.$$eval('.card.shell .doms button span:last-child', x => x.map(e => e.textContent).join(',')), '—,2/2,—,—,—'); assert(await has(p, '건강·관계·회복·재정 9개는 비워 둘게요'));
  await p.click('[data-a="toDom"][data-k="grow"]'); assert.equal(await view(p), 'today'); assert.equal(await p.locator('[data-id="i05"]').count(), 1, '접혀 있던 성장이 펼쳐짐');
  return '영역별 “2/2”, “—”가 보이고, 성장을 누르면 오늘 체크의 성장 묶음이 펼쳐진 채로 돌아감';
});
add('④-4', '1장 ④ 표 4 · 완료 기준 5', '저장하고 마무리: 컨디션을 고르면 활성. 저장 → 완료 화면 → 2초 뒤 ③', async () => {
  const p = await open(); await setup(p, { name: '밤톨' }); await p.click('[data-a="toClose"]'); await p.fill('#memo', 'ㅇㅇㅇ');
  assert(await p.isDisabled('[data-a="saveClose"]')); assert(await has(p, '위에서 컨디션을 고르면 저장할 수 있어요'));
  await p.click('[data-a="cond"][data-v="3"]'); assert(!(await p.isDisabled('[data-a="saveClose"]'))); assert(!(await has(p, '위에서 컨디션을 고르면')));
  await p.click('[data-a="saveClose"]'); await p.waitForTimeout(200); assert.equal(await view(p), 'done'); assert.deepEqual((await ls(p, 'daylogs'))[D0], { condition: 3, memo: 'ㅇㅇㅇ' });
  await p.waitForTimeout(1500); assert.equal(await view(p), 'done', '1.7초에는 아직 완료 화면'); await p.waitForTimeout(600); assert.equal(await view(p), 'today'); assert(await has(p, '오늘 마무리했어요 · 컨디션 3'));
  await p.click('[data-a="tab"][data-v="report"]'); assert(await has(p, '평균 컨디션 3.0')); assert.equal(await p.locator('.strip i.today').count(), 1);
  return '보내 주신 화면과 같은 상태(항목 0개, 한 줄만 입력)에서: 컨디션 전에는 버튼이 잠기고 안내 문구가 보임 → 컨디션 3을 고르면 눌림 → 완료 화면 → 2초 뒤 오늘 화면 → 리포트에 컨디션 3.0과 오늘 칸이 보임';
});
add('④-4b', '1장 ④ 표 4 · 2장 안전 규칙', '안전 규칙에 해당하면 완료 화면 대신 안전 카드', async () => {
  const p = await open('2026-10-06'); await setup(p, { name: '밤톨' }); await cyc(p, 'i01'); await closeDay(p, 1); assert.equal(await view(p), 'done'); const ctx = p.context();
  const q = await open('2026-10-07', { ctx }); await cyc(q, 'i01'); await closeDay(q, 1); assert.equal(await view(q), 'done'); assert.equal(await q.locator('.safe').count(), 0);
  const r = await open(D0, { ctx }); await cyc(r, 'i01'); await closeDay(r, 1); assert.equal(await view(r), 'today'); assert.equal(await r.locator('.safe').count(), 1);
  return '컨디션 1을 사흘째 저장하는 순간 완료 화면 대신 안전 카드가 뜸';
});
add('④-5', '1장 ④ 표 5', '완료 화면: 노을 위 컨디션 · 오늘 씨글라스 · 문구. 한 줄이 있으면 “한 줄을 병에 담아 띄웠어요”, 없으면 “{n}개 영역을 채웠어요”. 메모 글자는 안 보임. 화면을 누르면 바로 ③', async () => {
  const p = await open(); await sample(p, 'dotori'); await cyc(p, 'i05'); await closeDay(p, 4, '비밀 메모'); let t = await txt(p);
  assert(t.includes('10월 8일 목요일 · 하루 마무리') && t.includes('오늘의 기록을') && t.includes('컨디션 4 · 괜찮음') && t.includes('한 줄을 병에 담아 띄웠어요. 내일 또 만나요.') && t.includes('잠시 후 오늘 화면으로 돌아가요'));
  assert(!(await p.content()).includes('비밀 메모') || !(await p.innerHTML('#app')).includes('비밀 메모'), '메모 글자 없음'); assert.equal(await p.locator('.donescr .panel .gl').count(), 5);
  await p.click('.donescr'); assert.equal(await view(p), 'today', '누르면 바로');
  const q = await open(); await sample(q, 'dotori'); await cyc(q, 'i05'); await cyc(q, 'i01'); await closeDay(q, 4); assert(await has(q, '2개 영역을 채웠어요. 내일 또 만나요.'));
  return '한 줄이 있으면 병 문구, 없으면 “2개 영역을 채웠어요”. 메모 글자는 화면에 없고, 화면을 누르면 2초를 기다리지 않고 돌아감';
});

// ⑤ 주간 패턴 리포트
add('⑤-1', '1장 ⑤ 표 1', '주 이동 ‹ ›: 일–토 단위, 기록이 있는 주까지만 ‹. 탭을 열면 지난주가 먼저. 이번 주는 ‘중간 점검’: 차트만, 문장·실험 없음', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]'); assert.equal(await p.textContent('.wk b'), '9월 27일 – 10월 3일');
  for (let i = 0; i < 3; i++) await p.click('[data-a="wk"][data-v="-1"]'); assert.equal(await p.textContent('.wk b'), '9월 6일 – 9월 12일'); assert(await p.isDisabled('[data-a="wk"][data-v="-1"]'));
  for (let i = 0; i < 4; i++) await p.click('[data-a="wk"][data-v="1"]'); assert.equal(await p.textContent('.wk b'), '10월 4일 – 10월 10일'); assert(await p.isDisabled('[data-a="wk"][data-v="1"]'));
  assert(await has(p, '중간 점검')); assert.equal(await p.locator('.radio').count(), 0); assert.equal(await p.locator('.gb2').count(), 0); assert.equal(await p.locator('.pat').count(), 0); assert.equal(await p.locator('.pend').count(), 1);
  return '지난주로 열리고 4주 전에서 ‹가 멈춤. 이번 주는 “중간 점검” 문구와 차트만 보임';
});
add('⑤-2', '1장 ⑤ 표 2 · 4장 미리 쓴 리포트', '한 줄 요약(샘플 리포트의 미리 쓴 문장), 아래로 좋았던 점 · 부족했던 점 카드', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]'); const cur = '2026-10-04';
  for (const r of DATA.samples[0].reports.slice().reverse()) { const t = await txt(p); assert(t.includes(r.summary), r.summary); assert(r.summary.length <= 60);
    for (const s of r.good.concat(r.short)) assert(t.includes(s), s); assert(t.includes(`평균 컨디션 ${r.avg_condition.toFixed(1)} · 기록 ${r.recorded_days}일`));
    if (r.week > -4) await p.click('[data-a="wk"][data-v="-1"]'); }
  return '4주 치 모두 요약 문장, 좋았던 점·부족했던 점, “평균 컨디션 · 기록 n일”이 데이터의 문장·숫자와 같음';
});
add('⑤-3', '1장 ⑤ 표 3 · 2장 실천률', '조개 펜던트 오각형: 실선 = 영역 실천률, 점선 = 중요도 × 20%. 꼭짓점마다 씨글라스와 숫자(%). 꼭짓점을 누르면 그 영역 항목별 ● 횟수', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]');
  assert.equal(await p.$$eval('.pend .vx text', x => x.map(e => e.textContent).join(',')), '건강 59%,성장 80%,관계 80%,회복 62%,재정 80%');
  const geo = await p.evaluate(() => { const pl = [...document.querySelectorAll('.pend polygon')].slice(-2).map(e => e.getAttribute('points').split(' ')[0].split(',').map(Number)); return pl.map(a => 214 - a[1]) });
  assert(Math.abs(geo[0] - 74 * .59) < .2 && Math.abs(geo[1] - 74) < .2, geo.join()); await p.click('.vx[data-k="health"]'); const t = await txt(p);
  assert(t.includes('건강 항목별 ● 횟수') && t.includes('어젯밤 7시간 이상 잤나요? ● 6 / 7') && t.includes('오늘 물을 5잔 이상 마셨나요? ● 2 / 7'));
  const ok = await p.evaluate(([reps, cur]) => reps.every(r => JSON.stringify(window.__anchor.weekStats(window.__anchor.addDays(cur, 7 * r.week)).rate) === JSON.stringify(r.rate)), [DATA.samples[0].reports, '2026-10-04']); assert(ok);
  return '꼭짓점 숫자가 59·80·80·62·80%, 건강 실선 꼭짓점이 59% 위치, 건강 중요도 5의 점선이 100% 위치. 건강을 누르면 “물 5잔 ● 2 / 7” 등 항목별 횟수(리포트 문장의 “7일 중 2일”과 같음)';
});
add('⑤-4', '1장 ⑤ 표 4', '요일별 컨디션: 해초 막대 높이 = 컨디션 숫자. 기록 없는 날은 모래 점, 체크만 한 날은 ‘−’. 막대를 누르면 그날 한 줄과 다섯 영역', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]');
  const row = () => p.$$eval('.kelp button', x => x.map(e => { const s = e.querySelector('svg'); return s ? Math.round(s.getBoundingClientRect().height) : e.querySelector('.dot') ? 'dot' : e.querySelector('.n') ? e.querySelector('.n').textContent : '' }).join(','));
  assert.equal(await row(), '48,62,−,62,62,62,62', '지난주 3,4,−,4,4,4,4'); await p.click('[data-a="kday"] >> nth=0'); assert(await has(p, '9월 27일 일요일 · 컨디션 3 보통')); assert(await has(p, '“오랜만에 늦잠”')); assert.equal(await p.locator('.daycard .gl').count(), 5);
  await p.click('[data-a="kday"] >> nth=2'); assert(await has(p, '체크만 한 날')); await p.click('[data-a="wk"][data-v="-1"]'); assert.equal(await row(), '34,20,dot,dot,dot,34,48', '2주 전 2,1,·,·,·,2,3');
  assert(await p.isDisabled('[data-a="kday"] >> nth=2')); return '컨디션 1·2·3·4의 줄기 높이가 20·34·48·62px로 숫자에 비례. 화요일(체크만)은 “−”, 2주 전 화–목은 모래 점. 막대를 누르면 그날 한 줄과 다섯 영역 카드';
});
add('⑤-5', '1장 ⑤ 표 5 · 완료 기준 6', '최근 4주 기록: 하루 한 칸. 진하기 = 채운 영역 수, 기록 없는 날 = 작은 모래 점, 체크만 한 날 = 반원, 0개 영역 날 = 테두리만 있는 큰 원, 아직 안 온 날 = 비움. 범례 항상 표시', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]');
  const cells = await p.$$eval('.strip .c', x => x.map(e => { const i = e.querySelector('i'); if (!i) return 'x'; const r = i.getBoundingClientRect(), c = getComputedStyle(i); return (i.className || 'full') + ':' + Math.round(r.width) + 'x' + Math.round(r.height) + ':' + c.backgroundColor }));
  assert.equal(cells.length, 28); const depth = ['', 'rgb(189, 216, 233)', 'rgb(123, 189, 232)', 'rgb(78, 142, 162)', 'rgb(10, 65, 116)', 'rgb(0, 29, 57)'];
  ['-3', '-2', '-1', '0'].forEach((w, wi) => VIZ.strip[w].forEach((c, i) => { const got = cells[wi * 7 + i]; if (c.s === 'none') assert(got.startsWith('none:9x9'), w + i + got); else if (c.s === 'partial') assert(got.startsWith('partial:22x11') && got.endsWith(depth[c.n]), w + i + got); else if (c.s === 'closed') assert(got.includes(':22x22:') && got.endsWith(depth[c.n]), w + i + got); else if (c.s === 'future') assert.equal(got, 'x'); }));
  assert(cells[25].startsWith('today') || cells[25].includes('today'), '오늘 칸'); const lg = await p.textContent('.legend'); assert(lg.includes('채운 영역 1–5') && lg.includes('0개 영역') && lg.includes('체크만') && lg.includes('기록 없음'));
  const q = await open(); await setup(q, { name: '밤톨' }); await cyc(q, 'i01'); await cyc(q, 'i01'); await closeDay(q, 2); await q.waitForTimeout(2300); await q.click('[data-a="tab"][data-v="report"]');
  const z = await q.$eval('.strip i.today', i => i.className + ':' + getComputedStyle(i).backgroundColor + ':' + getComputedStyle(i).borderTopColor); assert(z.startsWith('zero today:rgb(255, 255, 255):rgb(94, 120, 146)'), z);
  return '28칸이 기획안 4주 기록과 한 칸씩 같음(색 5단계, 2주 전 화–목 9px 모래 점, 체크만 한 날 반원, 금·토 빈칸). 못 했음만 있는 날은 테두리만 있는 큰 원';
});
add('⑤-6', '1장 ⑤ 표 6 · 완료 기준 6', '발견한 패턴 최대 2개, 근거 날 수 함께. 빈 구간이 있던 주는 ‘빈 구간 읽기’ 카드가 맨 위', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]'); let pats = await p.$$eval('.pat', x => x.map(e => e.innerText.replace(/\n/g, ' / ')));
  assert.equal(pats.length, 2); assert(pats[0].includes('근거 16일 vs 7일') && pats[0].includes('회복을 챙긴 날 컨디션이 평균 1.7점 높았어요'));
  await p.click('[data-a="wk"][data-v="-1"]'); pats = await p.$$eval('.pat', x => x.map(e => e.innerText)); assert(pats[0].startsWith('빈 구간 읽기') && pats[0].includes('화–목 사흘 기록이 비었어요')); assert(pats.length <= 3);
  assert((await p.$$eval('.radio small', x => x.every(e => parseInt(e.textContent) <= 10 && +/주 (\d)회/.exec(e.textContent)[1] <= 2))), '10분·주 2회 이하'); return '지난주는 패턴 2개와 “근거 16일 vs 7일”. 2주 전은 빈 구간 읽기 카드가 패턴 위에 있고 실험이 모두 10분·주 2회 이하';
});
add('⑤-7', '1장 ⑤ 표 7·8', '작은 실험 3개 중 하나 선택, 위에 지난 실험 결과. 이 실험으로 정하기: 선택하면 활성, 저장 → ③ 실험 배너. 이미 정했으면 ‘실험 바꾸기’. 지난주 리포트에서만, 더 오래된 주는 읽기 전용', async () => {
  const p = await open(); await sample(p, 'dotori'); await p.click('[data-a="tab"][data-v="report"]'); assert.equal(await p.locator('.radio').count(), 3); assert(await has(p, '지난 실험 · 잠들기 전 10분 폰 내려놓기 2/2회'));
  assert(await p.isDisabled('[data-a="expSave"]')); assert.equal((await p.textContent('[data-a="expSave"]')), '이번 주 실험으로 정했어요'); await p.click('.radio >> nth=1'); assert.equal(await p.textContent('[data-a="expSave"]'), '실험 바꾸기');
  await p.click('[data-a="expSave"]'); await p.click('[data-a="tab"][data-v="today"]'); assert(await has(p, '이번 주 실험 · 0/3회')); assert(await has(p, '오전에 물 두 잔 먼저 마시기'));
  await p.click('[data-a="tab"][data-v="report"]'); await p.click('[data-a="wk"][data-v="-1"]'); assert.equal(await p.locator('.radio[disabled]').count(), 3); assert.equal(await p.locator('[data-a="expSave"]').count(), 0); assert(await has(p, '지난 주 리포트는 읽기 전용이에요'));
  return '도토리는 이미 “퇴근 후 20분 걷기”가 정해져 있어 버튼이 잠겨 있고, 다른 실험을 고르면 “실험 바꾸기”. 바꾸면 오늘 화면 배너가 새 실험 0/3회로 바뀜. 2주 전 리포트는 고를 수 없음';
});
add('⑤-7b', '1장 ⑤ 표 8', '아직 정하지 않은 상태: 고르기 전에는 잠김, 고르면 ‘이 실험으로 정하기’ 활성 → 저장하면 ③에 실험 배너', async () => {
  const p = await open(); await p.evaluate(() => { window.ANCHOR_DATA.samples[0].experiments.pop() }); await sample(p, 'dotori'); assert.equal(await p.locator('.exp').count(), 0, '이번 주 실험이 없으면 배너도 없음');
  await p.click('[data-a="tab"][data-v="report"]'); assert.equal(await p.textContent('[data-a="expSave"]'), '이 실험으로 정하기'); assert(await p.isDisabled('[data-a="expSave"]')); assert.equal(await p.locator('.radio[aria-checked="true"]').count(), 0);
  await p.click('.radio >> nth=0'); assert(!(await p.isDisabled('[data-a="expSave"]'))); await p.click('[data-a="expSave"]'); await p.click('[data-a="tab"][data-v="today"]');
  assert(await has(p, '이번 주 실험 · 0/3회')); assert(await has(p, '퇴근 후 20분 걷기')); await p.click('[data-a="expDone"]'); assert(await has(p, '이번 주 실험 · 1/3회'));
  return '시연 데이터에서 이번 주 실험만 뺀 상태로 확인: 배너 없음 → 리포트에서 하나 고르면 버튼이 켜짐 → 저장하면 오늘 화면에 배너 0/3회 → ‘오늘 했어요’로 1/3회';
});
add('⑤-9', '1장 ⑤ 문장이 없는 경우 · 완료 기준 8', '내 기록과 라온 샘플은 차트만 보여 주고 “{n}일만 더 기록하면 다음 주 리포트에 패턴이 나와요” 또는 “첫 주는 기록을 모으는 중이에요”', async () => {
  const p = await open(); await sample(p, 'raon'); await p.click('[data-a="tab"][data-v="report"]'); let t = await txt(p);
  assert(t.includes('7일만 더 기록하면 다음 주 리포트에 패턴이 나와요') && !t.includes('발견한 패턴') && !t.includes('좋았던 점')); assert.equal(await p.locator('.pend').count(), 1); assert.equal(await p.locator('.radio').count(), 0);
  const q = await open(); await setup(q, { name: '밤톨' }); await q.click('[data-a="tab"][data-v="report"]'); assert(await has(q, '아직 기록이 없어요'));
  const ctx = q.context(); await q.click('[data-a="tab"][data-v="today"]'); await cyc(q, 'i01'); const r = await open('2026-10-13', { ctx }); await r.click('[data-a="tab"][data-v="report"]'); t = await txt(r);
  assert(t.includes('첫 주는 기록을 모으는 중이에요') && t.includes('9일만 더 기록하면')); return '라온: 차트와 “7일만 더 기록하면…”만. 내 기록: 기록 전에는 “아직 기록이 없어요”, 다음 주에 열면 “첫 주는 기록을 모으는 중이에요”';
});

// 시트 · 안전
add('시트-3', '1장 시트 안전 카드 · 2장 안전 규칙 · 완료 기준 7', '안전 카드: 앱 열 때 판정, 같은 주에 한 번만. 흰 바탕·잉크색만. 제목·본문·연락처 3줄·닫기', async () => {
  const p = await open(); await sample(p, 'gureum'); assert.equal(await p.locator('.safe').count(), 1); const t = await p.innerText('.safe');
  for (const s of ['요즘 많이 지쳐 보여요. 혼자 버티지 않아도 돼요', '이야기할 곳이 필요하면 아래로 연락해 보세요.', '회사 EAP', '정신건강위기상담전화', '1577-0199', '자살예방상담전화', '109', '닫기']) assert(t.includes(s), s);
  const st = await p.$eval('.safe', e => { const c = getComputedStyle(e); return c.backgroundColor + '|' + c.color + '|' + e.querySelectorAll('svg,img').length }); assert.equal(st, 'rgb(255, 255, 255)|rgb(0, 29, 57)|0');
  await p.keyboard.press('Escape'); assert.equal(await p.locator('.safe').count(), 1, 'Esc로는 안 닫힘'); await p.click('.safe .btn'); assert.equal(await p.locator('.safe').count(), 0);
  await p.reload(); await p.waitForTimeout(200); assert.equal(await p.locator('.safe').count(), 0, '같은 주 다시 안 뜸'); const ctx = p.context();
  const q = await open('2026-10-12', { ctx }); assert.equal(await q.locator('.safe').count(), 1, '다음 주에는 다시'); const d = await open(); await sample(d, 'dotori'); assert.equal(await d.locator('.safe').count(), 0);
  const a = await p.evaluate(() => window.__anchor.safetyHit()); return '구름으로 들어가면 바로 뜨고, 닫은 뒤 새로고침해도 같은 주에는 안 뜨며 다음 주에 다시 뜸. 흰 바탕에 잉크색 글자, 그림 없음. 도토리에는 안 뜸';
});
add('규칙-안전', '2장 안전 규칙', '최근 3회 연속 컨디션 1(세 날 모두 최근 7일 안), 또는 최근 7일 중 마무리 3일 이상이면서 평균 1.8 이하', async () => {
  const run = async (logs) => { const p = await open(); await setup(p, { name: '밤톨' }); return p.evaluate(logs => { localStorage.setItem('anchor.daylogs', JSON.stringify(logs)); return window.__anchor.safetyHit() }, logs) };
  const L = o => Object.fromEntries(Object.entries(o).map(([d, c]) => ['2026-10-0' + d, { condition: c, memo: '' }]));
  assert.equal(await run(L({ 5: 1, 6: 1, 7: 1 })), true, '3연속 1'); assert.equal(await run(L({ 6: 1, 7: 1 })), false, '2회뿐');
  assert.equal(await run(L({ 5: 2, 6: 2, 7: 1 })), true, '평균 1.67'); assert.equal(await run(L({ 5: 2, 6: 2, 7: 2 })), false, '평균 2.0'); assert.equal(await run(L({ 4: 1, 5: 2, 6: 2, 7: 3 })), false, '평균 2.0');
  assert.equal(await run({ '2026-09-20': { condition: 1 }, '2026-09-21': { condition: 1 }, '2026-10-07': { condition: 1 } }), false, '7일 밖'); return '여섯 경우(3연속 1, 2회뿐, 평균 1.67, 평균 2.0 두 가지, 7일 밖)의 판정이 규칙과 같음';
});
add('규칙-계산', '2장 계산 규칙 · 4장 도토리의 4주', '실천률 = ● ÷ (● + ○), 기록한 날, 평균 컨디션(소수 첫째 자리)이 4주 표의 숫자와 같음', async () => {
  const p = await open(); await sample(p, 'dotori'); const got = await p.evaluate(() => [-4, -3, -2, -1].map(w => { const s = window.__anchor.weekStats(window.__anchor.addDays('2026-10-04', 7 * w)); return Object.values(s.rate).join('·') + ' ' + s.avg + ' ' + s.recorded }));
  assert.deepEqual(got, ['82·87·53·85·60 3.9 7', '41·87·47·31·53 2.5 7', '31·78·22·11·33 2.0 4', '59·80·80·62·80 3.8 7']); return '4주 전부터 지난주까지 영역 실천률·컨디션·기록 일수가 기획안 표와 전부 같음';
});

add('데이터-날짜', '4장 더미 데이터 · 날짜 규칙', '날짜는 접속한 날 기준으로 계산, 언제 열어도 ‘지난주 리포트’가 있음. 오늘이나 그 뒤 날짜의 샘플 기록은 불러오지 않음', async () => {
  const same = []; for (let d = 4; d <= 10; d++) { const date = '2026-10-' + String(d).padStart(2, '0'); const p = await open(date); await sample(p, 'dotori');
    assert.equal(await p.locator('.cb.e').count(), await p.locator('[data-a="cycle"]').count(), date + ' 오늘은 비어 있음'); assert.equal(await p.evaluate(d => Object.keys(window.__anchor.getE(window.__anchor.addDays(d, 1))).length, date), 0);
    await p.click('[data-a="tab"][data-v="report"]'); assert(await has(p, '회복과 관계가 다시 채워졌고'), date); const r = await p.$$eval('.pend .vx text', x => x.map(e => e.textContent.replace(/\D/g, '')).join('·')); same.push('일월화수목금토'[d - 4] + (r === '59·80·80·62·80' ? '' : '(' + r + ')')); await p.context().close() }
  assert(same.slice(1).every(x => x.length === 1), same.join(' ')); return '일–토 어느 요일에 열어도 오늘은 비어 있고 지난주 리포트가 뜸. 월–토는 숫자가 문장과 같음. 일요일에 열면 지난주 주간 항목이 아직 입력 전이라 꼭짓점 숫자가 다름: ' + same[0];
});

// 저장 · 기술 전제
add('저장-1', '5장 브라우저 저장', 'localStorage 키 6개와 내용: profile, items, entries, daylogs, experiments, ui. 저장소가 비어 있으면 ①부터', async () => {
  const p = await open(); assert.equal(await view(p), 'start'); await sample(p, 'dotori'); await cyc(p, 'i01'); await p.click('[data-a="expDone"]'); await closeDay(p, 4, '메모'); await p.waitForTimeout(2300); await p.click('[data-a="tab"][data-v="report"]');
  const keys = await p.evaluate(() => Object.keys(localStorage).sort().join(',')); assert.equal(keys, 'anchor.daylogs,anchor.entries,anchor.experiments,anchor.items,anchor.profile,anchor.ui');
  const pr = await ls(p, 'profile'); assert.deepEqual(Object.keys(pr).sort(), ['importance', 'job', 'mode', 'name', 'sample_id', 'total']); assert.equal(pr.mode, 'sample');
  const it = (await ls(p, 'items'))[0]; for (const k of ['template', 'question', 'target', 'freq', 'order', 'version']) assert(k in it, k);
  assert.deepEqual(await ls(p, 'entries'), { [D0]: { i01: 'done' } }, '샘플 기록은 저장소에 복사하지 않고 입력한 것만'); assert.deepEqual(await ls(p, 'daylogs'), { [D0]: { condition: 4, memo: '메모' } });
  const ex = (await ls(p, 'experiments'))[0]; assert.deepEqual(Object.keys(ex).sort(), ['domain', 'done_dates', 'minutes', 'text', 'times', 'week_start']); const ui = await ls(p, 'ui'); assert.equal(ui.last_report_week, '2026-09-27');
  return '키 이름과 안의 항목이 기획안과 같음. 샘플 모드에서는 무대에서 입력한 오늘 기록만 저장됨';
});
add('저장-2', '5장 브라우저 저장', '모든 읽기·쓰기는 try/catch: 저장소를 쓸 수 없는 브라우저에서도 화면이 멈추지 않음', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') } }) });
  const p = await open(D0, { ctx }); await sample(p, 'dotori'); await cyc(p, 'i01'); assert.equal(await entry(p, D0, 'i01'), 'done'); await closeDay(p, 4); assert.equal(await view(p), 'done'); return '저장소가 막힌 브라우저에서도 샘플 선택, 체크, 마무리가 동작(그 창을 닫을 때까지만 기억)';
});
add('기술-1', '5장 기술 전제 · 완료 기준 9', '한 번 연 뒤에는 연결 없이 기록·리포트 동작. 외부 요청 없음', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await open(D0, { ctx }); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(700);
  await sample(p, 'dotori'); await cyc(p, 'i01'); await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(500); assert.equal(await view(p), 'today'); assert.equal(await entry(p, D0, 'i01'), 'done');
  await closeDay(p, 4); await p.waitForTimeout(2300); await p.click('[data-a="tab"][data-v="report"]'); assert(await has(p, '회복과 관계가 다시 채워졌고')); assert(await p.evaluate(() => document.fonts.check('800 22px Pretendard')));
  await ctx.setOffline(false); return '연결을 끊고 새로고침해도 오늘 체크·하루 마무리·리포트와 글꼴이 그대로 나옴(크로미움, 임시 주소에서 확인. Vercel 주소와 실제 휴대폰은 배포 뒤 확인)';
});
add('기술-2', '5장 기술 전제 · 토큰 규칙', '모바일 우선(기준 390×844). 가로로 넘치지 않음, 터치 영역 44px 이상', async () => {
  const out = []; for (const [w, h] of [[390, 844], [360, 640]]) { const p = await open('2026-10-11', { w, h }); await sample(p, 'dotori'); for (const v of ['today', 'report']) { await p.click(`[data-a="tab"][data-v="${v}"]`); const r = await p.evaluate(() => [innerWidth, document.documentElement.scrollWidth]); assert(r[0] === w && r[1] <= w, v + ' ' + r) }
    await p.click('[data-a="tab"][data-v="today"]'); const small = await p.$$eval('#app button:not([disabled]),#app [role=button]', x => x.filter(e => { const r = e.getBoundingClientRect(); return r.height && r.height < 43.5 }).map(e => e.getAttribute('data-a'))); assert.equal(small.length, 0, small.join()); out.push(w + '×' + h) }
  return out.join(', ') + '에서 날짜가 가장 긴 일요일 화면도 가로로 넘치지 않고, 누르는 곳의 높이가 모두 44px 이상';
});
add('전제-탭', '한눈에 보기 전제 · 5장 만들지 않는 것', '화면 5개, 하단 탭 2개. 알림·월간·연간·메모 모아 보기·하루 흐름순·7일 줄·타이머·직접 추가·빈도 바꾸기·AI 호출이 없음', async () => {
  const p = await open(); await sample(p, 'dotori'); let all = await txt(p); await p.click('[data-a="tab"][data-v="report"]'); all += await txt(p); await p.click('[data-a="tab"][data-v="today"]'); await p.click('[data-a="toClose"]'); all += await txt(p);
  for (const s of ['월간', '지도', '설정', '타이머', '하루 흐름순', '직접 추가', '알림', 'AI']) assert(!all.includes(s), s); return '오늘·마무리·리포트 화면 어디에도 해당 메뉴나 버튼이 없음';
});

// 사람이 봐야 하는 것
add('완료-1', '5장 완료 기준 1', '처음 연 사람이 ①→②→③을 3분 안에 끝낸다', '사람 확인: 누르는 횟수는 호칭 입력 + 9번(직무, 다음, 다음, 확정 5번, 시작)이면 끝나지만, 3분 안에 끝나는지는 처음 보는 사람에게 시켜 봐야 압니다');
add('완료-3', '5장 완료 기준 3', '순환 버튼 네 상태가 흑백에서도 구분된다', '사람 확인: 모양이 서로 다른 것은 ③-5a에서 확인했습니다. 실제 흑백 화면과 색약 시뮬레이션은 눈으로 봐야 합니다');
add('완료-9', '5장 완료 기준 9', '비행기 모드에서 다시 열어도 동작, 네트워크 탭에 외부 요청 없음', '사람 확인: 크로미움에서는 기술-1로 확인했습니다. Vercel 주소와 실제 휴대폰(사파리 포함)은 배포 뒤 확인합니다');
// 글자가 배경에 묻히는 곳 찾기: 단색 배경 위의 글자마다 명도 대비를 잰다. 그림·그러데이션 위의 글자는 잴 수 없어 건너뛴다.
const lowContrast = p => p.evaluate(() => {
  const rgb = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 } };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b) };
  const bad = []; let n = 0, skip = 0;
  document.querySelectorAll('#app *, #sheets *').forEach(el => {
    const own = [...el.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent).join('').trim(); if (!own) return;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || +cs.opacity < .1) return;
    if (el.closest('[disabled],[aria-disabled="true"],svg,.sr')) return;
    let bg = null, op = 1;
    for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); op *= +s.opacity; if (s.backgroundImage !== 'none' || e.querySelector(':scope > svg[class*="sky"], :scope > svg.scene')) { bg = null; break }
      const c = rgb(s.backgroundColor); if (c.a > .9) { bg = c; break } if (c.a > .05) { bg = null; break } }
    if (!bg || op < .5) { skip++; return } n++;
    const fg = rgb(cs.color), a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    if (ratio < 3) bad.push(own.slice(0, 14) + ' (' + ratio.toFixed(1) + ':1)');
  });
  return { bad, n, skip };
});
add('화면-글자', '5장 토큰 · 접근성', '버튼과 글자가 배경색에 묻히지 않는다(단색 배경 위 글자 대비 3:1 이상). 확인 창의 ‘취소’·‘지우기’ 포함', async () => {
  const seen = [], bad = []; let n = 0, skip = 0;
  const at = async (p, name) => { await p.waitForTimeout(60); const r = await lowContrast(p); n += r.n; skip += r.skip; seen.push(name); r.bad.forEach(x => bad.push(name + ': ' + x)) };
  let p = await open(); await at(p, '① 시작'); await p.click('[data-a="samples"]'); await at(p, '샘플 고르기'); await p.click('[data-a="closeSheet"][data-x]').catch(() => p.keyboard.press('Escape'));
  p = await open(); await setup(p, { name: '밤톨', stopAt3: true }); await at(p, '② 확인'); await p.click('[data-a="dStart"]'); await at(p, '③ 오늘');
  await cyc(p, 'i01'); await cyc(p, 'i02'); await cyc(p, 'i02'); await cyc(p, 'i03'); await cyc(p, 'i03'); await cyc(p, 'i03'); await at(p, '③ 체크 세 상태');
  await p.click('[data-a="menu"]'); await at(p, '⋯ 메뉴'); await p.click('[data-a="reset"]'); await at(p, '삭제 확인 창');
  const btn = await p.$$eval('.safe .btn', x => x.map(e => e.textContent.trim() + '/' + getComputedStyle(e).color + '/' + getComputedStyle(e).backgroundColor));
  assert.deepEqual(btn, ['취소/rgb(0, 29, 57)/rgb(255, 255, 255)', '지우기/rgb(255, 255, 255)/rgb(0, 29, 57)'], '확인 창 버튼 두 개의 글자·배경');
  await p.click('.safe [data-a="closeSheet"]'); await p.click('[data-a="toClose"]'); await at(p, '④ 마무리(고르기 전)'); await p.click('[data-a="cond"][data-v="4"]'); await at(p, '④ 마무리(고른 뒤)');
  p = await open(); await p.click('[data-a="job"][data-j="회계·감사"]'); await p.click('[data-a="startNext"]'); await at(p, '② 중요도'); await p.click('[data-a="dNext1"]'); await at(p, '② 항목 고르기');
  p = await open(); await sample(p, 'dotori'); await at(p, '③ 샘플(실험 배너)'); await p.click('[data-a="menu"]'); await at(p, '⋯ 메뉴(샘플)'); await p.click('[data-a="closeSheet"][data-x]');
  await p.click('[data-a="tab"][data-v="report"]'); await at(p, '⑤ 지난주'); await p.click('[data-a="wk"][data-v="-1"]'); await at(p, '⑤ 2주 전'); await p.click('[data-a="wk"][data-v="1"]'); await p.click('[data-a="wk"][data-v="1"]'); await at(p, '⑤ 이번 주');
  p = await open(); await sample(p, 'gureum'); await p.waitForTimeout(200); assert.equal(await p.locator('.safe').count(), 1); await at(p, '안전 카드');
  assert.deepEqual(bad, [], '대비가 낮은 글자');
  return `${seen.length}개 화면·창(${seen.join(', ')})에서 글자 ${n}곳의 대비가 모두 3:1 이상. 그림·그러데이션 위 글자 ${skip}곳은 자동으로 잴 수 없어 화면 캡처로 봄`;
});
add('그림', '1장 ④ 아래 · 5장 토큰', '완료 화면 일러스트는 디자인 담당의 시안(06-2_마무리_완료.png)을 그대로 쓴다. Pretendard', '사람 확인: 받은 파일에는 글자 없는 그림 원본과 글꼴 파일이 없어, 시안을 보고 다시 그린 그림과 공식 배포 글꼴을 씁니다(2026-10-06 사용자 결정: 없으면 그대로)');

(async () => {
  const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!/^\/(index\.html|sw\.js|fonts\/[\w.-]+)$/.test(u) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)) });
  await new Promise(r => srv.listen(0, r)); base = 'http://localhost:' + srv.address().port + '/';
  browser = await chromium.launch(); const only = process.argv[2]; let pass = 0, fail = 0, manual = 0; const rows = [];
  for (const c of C) { if (only && !c.id.includes(only)) continue;
    if (typeof c.run === 'string') { manual++; rows.push([c, '사람 확인', c.run.replace(/^사람 확인: /, '')]); continue }
    try { const note = await c.run(); pass++; rows.push([c, '통과', note || '']); console.log('통과', c.id) }
    catch (e) { fail++; rows.push([c, '어긋남', String(e.message).split('\n')[0].slice(0, 200)]); console.log('어긋남', c.id, e.message.split('\n').slice(0,3).join(' / ')) }
    for (const x of browser.contexts()) await x.close(); }
  const extra = []; if (external.length) { fail++; extra.push('외부 요청 ' + external.length + '건: ' + [...new Set(external)].slice(0, 3).join(', ')) } if (pageErrors.length) { fail++; extra.push('화면 오류 ' + pageErrors.length + '건: ' + [...new Set(pageErrors)].slice(0, 3).join(' | ')) }
  console.log(`통과 ${pass} · 어긋남 ${fail} · 사람 확인 ${manual}` + (extra.length ? ' · ' + extra.join(' · ') : ''));
  if (!only) { const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const md = ['# 앵커 시연판 기능 점검표 (기획안 v2.0 기준)', '', '기획안 v2.0의 화면 표, 시트, 계산 규칙, 저장, 완료 기준을 한 줄씩 옮기고, 실제 브라우저 엔진(크로미움, 390×844)에서 직접 눌러 확인한 결과입니다.',
      '`node tools/check_spec.js`가 이 파일을 다시 씁니다. 손으로 고치지 않습니다.', '', `- 점검한 날: ${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })}`, `- 결과: 통과 ${pass} · 어긋남 ${fail} · 사람 확인 ${manual}`,
      `- 점검 중 외부 주소 요청: ${external.length}건 · 화면 오류: ${pageErrors.length}건`, '- 따로 도는 자동 점검 `npm test`(계산 규칙·데이터·토큰)는 이 표와 별개입니다.', '', '| 번호 | 기획안 위치 | 기획안이 요구하는 것 | 결과 | 화면에서 확인한 내용 |', '| --- | --- | --- | --- | --- |']
      .concat(rows.map(([c, r, n]) => `| ${c.id} | ${esc(c.where)} | ${esc(c.req)} | ${r} | ${esc(n)} |`)).concat(extra.length ? ['', '## 점검 중 발견', ''].concat(extra.map(x => '- ' + x)) : []).join('\n') + '\n';
    fs.writeFileSync(path.resolve(__dirname, '..', 'docs', 'checklist_v2.0.md'), md); }
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
