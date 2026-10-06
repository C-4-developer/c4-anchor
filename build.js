// src/와 data/를 저장소 맨 바깥의 index.html 한 파일로 묶는다. 의존성 없이 돈다: node build.js
// index.html은 이렇게 만들어진 파일이다. 직접 고치지 말고 src/를 고친 뒤 다시 만든다.
const fs=require('fs');
let t=fs.readFileSync('src/index.tpl.html','utf8');
t=t.replace('/*STYLE*/',()=>fs.readFileSync('src/style.css','utf8'))
   .replace('/*DATA*/',()=>JSON.stringify(JSON.parse(fs.readFileSync("data/anchor_demo_data.json","utf8"))).replace(/</g,'\\u003c'))
   .replace('/*APP*/',()=>fs.readFileSync('src/app.js','utf8'));
fs.writeFileSync('index.html',t);
console.log('index.html',Buffer.byteLength(t),'bytes');
