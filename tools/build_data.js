// 기획안 v2.0 HTML에 들어 있던 실제 데이터(영역, 문항 53개, 칩 연결표, 직무 가중치, 리포트 4개)에
// 재구성한 샘플 기록을 붙여 앱에 넣을 데이터 하나로 만든다.
const fs=require('fs');
// 2026-10-05 팀 원본을 받은 뒤로는 data/ 를 덮어쓰지 않는다. 재구성본은 기록용으로 tools/ 안에만 쓴다.
const OUT='./reconstructed_demo_data.json';
const D=require("../docs/spec-data/DATA.json"), dot=require('./dotori.json');
const order=['i01','i02','i03','i05','i06','i08','i09','i11','i12','i14','i15'];
const enc=e=>order.map(id=>({done:'d',miss:'m',na:'n'}[e[id]]||'-')).join('');
const items=(arr)=>arr.map((t,i)=>({id:'i'+String(i+1).padStart(2,'0'),template:t}));
const data={
  domains:D.domains, item_templates:D.item_templates, chip_map:D.chip_map, job_boost:D.job_boost,
  jobs:['회계·감사','컨설팅','금융·투자','법률','기타'],
  safety:{title:'요즘 많이 지쳐 보여요. 혼자 버티지 않아도 돼요',body:'이야기할 곳이 필요하면 아래로 연락해 보세요.',
    contacts:[{label:'회사 EAP',value:'사내 안내 링크'},{label:'정신건강위기상담전화',value:'1577-0199',tel:'15770199'},{label:'자살예방상담전화',value:'109',tel:'109'}]},
  samples:[
   {id:'dotori',name:'도토리',job:'회계·감사',desc:'4주 기록 · 기본 시연',date_mode:'week',
    importance:{health:5,grow:4,rel:4,rest:3,money:2},total:16,
    items:items(['H01','H03','H12','H04','G01','G02','G06','R01','R03','R04','S01','S02','S08','M12','M03','M06']),
    daily_order:order,
    daily_entries:dot.daily.map(o=>({w:o.w,dow:o.dow,v:enc(o.e)})),
    weekly_entries:dot.weekly.map(o=>({w:o.w,e:o.e})),
    day_logs:dot.logs,
    experiments:[
      {w:-3,text:'점심 뒤 10분 바깥 걷기',domain:'health',minutes:10,times:3,done_dows:[2,4]},
      {w:-2,text:'수요일 저녁 30분 혼자 쉬기',domain:'rest',minutes:30,times:1,done_dows:[]},
      {w:-1,text:'잠들기 전 10분 폰 내려놓기',domain:'rest',minutes:10,times:2,done_dows:[1,4]},
      {w:0,text:'퇴근 후 20분 걷기',domain:'health',minutes:20,times:3,done_dows:[1,3]}],
    reports:D.samples[0].reports},
   {id:'raon',name:'라온',job:'컨설팅',desc:'가입 첫 주',date_mode:'day',
    importance:{health:4,grow:5,rel:3,rest:3,money:2},total:16,
    items:items(['H01','H07','H12','G02','G01','G05','G06','R01','R05','R06','S02','S01','S03','M03','M12','M04']),
    daily_order:['i01','i02','i03','i04','i05','i06','i08','i09','i11','i12','i14','i15'],
    daily_entries:[{d:-3,v:'dmddmmdmmddm'},{d:-2,v:'ddmdd-mdmdmd'},{d:-1,v:'mddddmdddmdd'}],
    weekly_entries:[],
    day_logs:[{d:-3,condition:3,memo:'첫 기록'},{d:-2,condition:4,memo:''},{d:-1,condition:4,memo:'집중이 잘 된 날'}],
    experiments:[],reports:[]},
   {id:'gureum',name:'구름',job:'금융·투자',desc:'컨디션이 계속 낮을 때',date_mode:'day',
    importance:{health:4,grow:3,rel:3,rest:4,money:3},total:16,
    items:items(['H01','H03','H09','H10','G03','G02','G06','R03','R05','R04','S05','S01','S08','M03','M01','M07']),
    daily_order:['i01','i02','i03','i05','i06','i08','i09','i11','i12','i14','i15'],
    daily_entries:[{d:-6,v:'dmddmdmmddm'},{d:-5,v:'mmddmmmmmdm'},{d:-4,v:'mmmdmmdmmmd'},{d:-3,v:'mmmmmmmmmdm'},{d:-2,v:'mmmdmmmmmmm'},{d:-1,v:'mmmmmmmmmmm'}],
    weekly_entries:[],
    day_logs:[{d:-6,condition:3,memo:''},{d:-5,condition:2,memo:''},{d:-4,condition:2,memo:'분기 마감 주간'},{d:-3,condition:1,memo:''},{d:-2,condition:1,memo:'새벽 퇴근'},{d:-1,condition:1,memo:''}],
    experiments:[],reports:[]}
  ]};
fs.writeFileSync(OUT,JSON.stringify(data));
console.log('bytes',fs.statSync(OUT).size);
