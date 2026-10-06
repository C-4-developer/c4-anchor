// 도토리 샘플 기록을 기획안 4장의 숫자(영역 실천률, 4주 기록 줄, 컨디션)에 맞게 재구성
const DOM=['health','grow','rel','rest','money'];
const daily={health:['i01','i02','i03'],grow:['i05','i06'],rel:['i08','i09'],rest:['i11','i12'],money:['i14','i15']};
const weekly={health:'i04',grow:'i07',rel:'i10',rest:'i13',money:'i16'};
let seed=20261008;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
const W={
 '-4':{days:[0,1,2,3,4,5,6],done:{health:18,grow:13,rel:8,rest:11,money:9},na:{i12:[0,6]},n:null,
       cond:[4,4,4,4,4,4,3], extra:m=>(7-[0,1,2,3,4,5,6].filter(d=>m[d].i11==='done').length>1?5:0)},
 '-3':{days:[0,1,2,3,4,5,6],done:{health:9,grow:13,rel:7,rest:4,money:8},na:{i12:[0,6]},n:[2,3,3,4,4,4,3],
       cond:[3,3,3,2,null,2,2]},
 '-2':{days:[0,1,5,6],done:{health:4,grow:7,rel:2,rest:1,money:3},na:{},n:[2,1,null,null,null,1,2],
       cond:[2,1,null,null,null,2,3]},
 '-1':{days:[0,1,2,3,4,5,6],done:{health:13,grow:12,rel:12,rest:8,money:12},na:{i12:[0,6]},n:[4,4,5,5,5,4,3],
       cond:[3,4,null,4,4,4,4], extra:m=>Math.abs([0,1,2,3,4,5,6].filter(d=>m[d].i03==='done').length-2)*3},
 '0':{days:[0,1,2,3,4,5,6],done:null,na:{i12:[0,6]},n:[3,5,5,5,4,5,4],cond:[3,4,4,4,4,4,4]}
};
function filled(m,d,dom){let a=0,b=0;for(const id of daily[dom]){const v=m[d][id];if(v==='done')a++;else if(v==='miss')b++;}return (a+b)>0&&a/(a+b)>=0.5}
function score(w,m,wk){const c=W[w];let s=0;
  if(c.done)for(const dom of DOM){let a=0;for(const d of c.days)for(const id of daily[dom])if(m[d][id]==='done')a++;if(wk[weekly[dom]]==='done')a++;s+=Math.abs(a-c.done[dom])*2}
  if(c.n)for(const d of c.days){const n=DOM.filter(x=>filled(m,d,x)).length;s+=Math.abs(n-c.n[d])*2}
  if(c.extra)s+=c.extra(m);
  if(w==='-2'){ if(filled(m,0,'rest'))s+=5; if(filled(m,1,'rest'))s+=5; }
  return s}
function solve(w){const c=W[w];let best=null,bs=1e9;
  for(let it=0;it<400&&bs>0;it++){
    const m={},wk={};
    for(const d of c.days){m[d]={};for(const dom of DOM)for(const id of daily[dom]){
      if(c.na[id]&&c.na[id].includes(d)){m[d][id]='na';continue}
      const p=c.done?c.done[dom]/(daily[dom].length*c.days.length+1):0.75;m[d][id]=rnd()<p?'done':'miss'}}
    for(const dom of DOM)wk[weekly[dom]]=rnd()<(c.done?c.done[dom]/(daily[dom].length*c.days.length+1):0.7)?'done':'miss';
    let s=score(w,m,wk);
    for(let k=0;k<6000&&s>0;k++){
      const isW=rnd()<0.08;let undo;
      if(isW){const id=weekly[DOM[Math.floor(rnd()*5)]];const o=wk[id];wk[id]=o==='done'?'miss':'done';undo=()=>wk[id]=o}
      else{const d=c.days[Math.floor(rnd()*c.days.length)];const dom=DOM[Math.floor(rnd()*5)];const ids=daily[dom];const id=ids[Math.floor(rnd()*ids.length)];
        if(m[d][id]==='na')continue;const o=m[d][id];m[d][id]=o==='done'?'miss':'done';undo=()=>m[d][id]=o}
      const s2=score(w,m,wk);if(s2<=s)s=s2;else undo();
    }
    if(s<bs){bs=s;best={m:JSON.parse(JSON.stringify(m)),wk:{...wk}}}
  }
  return {bs,...best}}
const out={daily:[],weekly:[],logs:[]};
const memo={'-4':{2:'일찍 퇴근해서 한강 산책',5:'오랜만에 엄마랑 통화'},'-3':{1:'마감 일정 공지 받음',5:'야근. 저녁은 김밥'},'-2':{1:'새벽 퇴근',6:'하루 종일 잤다'},'-1':{0:'밀린 빨래와 장보기',3:'점심 뒤 짧게 걸었다',5:'동기들이랑 저녁'},'0':{1:'퇴근하고 20분 걸었다',3:'걷고 나니 머리가 맑다'}};
for(const w of ['-4','-3','-2','-1','0']){const r=solve(w);console.error('week',w,'score',r.bs);
  for(const d of W[w].days){const e={};for(const id of Object.keys(r.m[d]))e[id]=r.m[d][id];out.daily.push({w:+w,dow:d,e});
    const c=W[w].cond[d];if(c!=null)out.logs.push({w:+w,dow:d,condition:c,memo:(memo[w]&&memo[w][d])||''})}
  if(w!=='0')out.weekly.push({w:+w,e:r.wk});}
require('fs').writeFileSync('dotori.json',JSON.stringify(out));
console.error('daily',out.daily.length,'logs',out.logs.length);
