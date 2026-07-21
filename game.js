const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha:false });

function resize(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize", resize);
resize();

const input = {x:0,y:0, action:false, enter:false, mission:false, reset:false};
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot((a.x+a.w/2)-(b.x+b.w/2),(a.y+a.h/2)-(b.y+b.h/2));
const rects=(a,b)=>a.x<a.w+b.x && a.x+a.w>b.x && a.y<a.h+b.y && a.y+a.h>b.y;

const world={w:2200,h:1650};
const roads=[];
for(let y=160;y<world.h;y+=290) roads.push({x:0,y,w:world.w,h:90});
for(let x=210;x<world.w;x+=350) roads.push({x,y:0,w:90,h:world.h});

const buildings=[];
for(let y=20;y<world.h-100;y+=145){
  for(let x=20;x<world.w-110;x+=175){
    const onRoad=roads.some(r=>x<r.x+r.w+20&&x+120>r.x-20&&y<r.y+r.h+20&&y+105>r.y-20);
    if(!onRoad) buildings.push({x,y,w:rand(80,135),h:rand(70,120),c:`hsl(${rand(185,260)},22%,${rand(20,37)}%)`});
  }
}

const player={x:260,y:240,w:22,h:28,inCar:null,money:0,health:100,wanted:0};
function car(x,y,police=false){return{x,y,w:48,h:27,vx:0,vy:0,angle:0,speed:0,max:police?5.4:4.5,police,damage:0};}
const cars=[];
for(let i=0;i<30;i++) cars.push(car(rand(70,world.w-80),rand(70,world.h-80)));
cars.push(car(640,520,true),car(1500,950,true),car(1900,300,true));

const peds=[];
for(let i=0;i<70;i++) peds.push({x:rand(40,world.w-40),y:rand(40,world.h-40),w:14,h:20,vx:rand(-.6,.6),vy:rand(-.6,.6),panic:0});

const missions=[
  {name:"Livraison plage",from:{x:330,y:225,w:20,h:20},to:{x:1900,y:1260,w:20,h:20},reward:300,done:false},
  {name:"Course autoroute",from:{x:1220,y:455,w:20,h:20},to:{x:180,y:1450,w:20,h:20},reward:420,done:false},
  {name:"Paquet du port",from:{x:1840,y:260,w:20,h:20},to:{x:720,y:1110,w:20,h:20},reward:360,done:false}
];
let currentMission=null, msg="Joystick à gauche. Boutons à droite.", msgT=240;

function solidMove(o,nx,ny){
  const t={x:nx,y:ny,w:o.w,h:o.h};
  if(nx<0||ny<0||nx+o.w>world.w||ny+o.h>world.h)return false;
  for(const b of buildings) if(rects(t,b)) return false;
  o.x=nx;o.y=ny;return true;
}
function addWanted(v){player.wanted=clamp(player.wanted+v,0,5)}

function update(){
  if(input.reset){player.x=260;player.y=240;player.health=100;player.wanted=0;player.inCar=null;currentMission=null;input.reset=false}

  if(input.enter){
    input.enter=false;
    if(player.inCar){player.inCar=null;msg="Sortie du véhicule.";msgT=110}
    else{
      const c=cars.filter(c=>!c.police).sort((a,b)=>dist(player,a)-dist(player,b))[0];
      if(c&&dist(player,c)<65){player.inCar=c;addWanted(.45);msg="Voiture prise. Police alertée.";msgT=160}
      else {msg="Approche-toi d'une voiture.";msgT=100}
    }
  }

  if(input.action){
    input.action=false;
    const p=peds.find(p=>dist(player,p)<40);
    if(p){p.panic=360;player.money+=10;addWanted(.22);msg="+10€. Des témoins paniquent.";msgT=150}
    else {msg="Personne à proximité.";msgT=80}
  }

  if(input.mission){
    input.mission=false;
    if(currentMission){msg="Va au marqueur vert.";msgT=100}
    else{
      const m=missions.find(m=>!m.done && Math.hypot(player.x-m.from.x,player.y-m.from.y)<85);
      if(m){currentMission=m;msg=`Mission: ${m.name}`;msgT=170}
      else {msg="Va sur un marqueur jaune.";msgT=100}
    }
  }

  if(player.inCar){
    const c=player.inCar;
    const targetAngle=Math.atan2(input.y,input.x);
    const force=Math.hypot(input.x,input.y);
    if(force>.15){
      let diff=((targetAngle-c.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      c.angle+=diff*.08;
      c.speed=clamp(c.speed+.15*force,-1.5,c.max);
    }else c.speed*=.97;
    const nx=c.x+Math.cos(c.angle)*c.speed, ny=c.y+Math.sin(c.angle)*c.speed;
    if(!solidMove(c,nx,ny)){c.speed*=-.35;c.damage+=3;addWanted(.02)}
    player.x=c.x+12;player.y=c.y-2;
  }else{
    const l=Math.hypot(input.x,input.y);
    if(l>.08) solidMove(player,player.x+input.x*2.8,player.y+input.y*2.8);
  }

  for(const p of peds){
    if(p.panic>0){p.panic--;const a=Math.atan2(p.y-player.y,p.x-player.x);p.vx=Math.cos(a)*1.45;p.vy=Math.sin(a)*1.45}
    else if(Math.random()<.012){p.vx=rand(-.65,.65);p.vy=rand(-.65,.65)}
    solidMove(p,p.x+p.vx,p.y+p.vy);
  }

  for(const c of cars){
    if(c===player.inCar)continue;
    if(c.police&&player.wanted>.4){
      const a=Math.atan2(player.y-c.y,player.x-c.x);
      let diff=((a-c.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      c.angle+=diff*.05;c.speed=clamp(c.speed+.045,0,c.max);
      if(dist(c,player)<42) player.health-=.11*player.wanted;
    }else if(Math.random()<.012){c.angle+=rand(-.8,.8);c.speed=rand(.4,1.9)}
    solidMove(c,c.x+Math.cos(c.angle)*c.speed,c.y+Math.sin(c.angle)*c.speed);
  }

  if(currentMission && Math.hypot(player.x-currentMission.to.x,player.y-currentMission.to.y)<85){
    player.money+=currentMission.reward;currentMission.done=true;msg=`Mission réussie +${currentMission.reward}€`;msgT=190;currentMission=null;player.wanted=clamp(player.wanted-.8,0,5)
  }
  player.wanted=clamp(player.wanted-.00045,0,5);
}

function draw(){
  const sw=innerWidth, sh=innerHeight;
  const cam={x:clamp(player.x-sw/2,0,world.w-sw),y:clamp(player.y-sh/2,0,world.h-sh)};
  ctx.fillStyle="#182c28";ctx.fillRect(0,0,sw,sh);
  ctx.save();ctx.translate(-cam.x,-cam.y);

  ctx.fillStyle="#303339";for(const r of roads)ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=3;ctx.setLineDash([24,24]);
  for(const r of roads){ctx.beginPath();if(r.w>r.h){ctx.moveTo(r.x,r.y+r.h/2);ctx.lineTo(r.x+r.w,r.y+r.h/2)}else{ctx.moveTo(r.x+r.w/2,r.y);ctx.lineTo(r.x+r.w/2,r.y+r.h)}ctx.stroke()}
  ctx.setLineDash([]);

  for(const b of buildings){ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle="rgba(255,255,255,.08)";for(let yy=b.y+13;yy<b.y+b.h-8;yy+=23)for(let xx=b.x+10;xx<b.x+b.w-8;xx+=25)ctx.fillRect(xx,yy,9,9)}
  for(const m of missions) if(!m.done) marker(m.from.x,m.from.y,"#ffd84d");
  if(currentMission) marker(currentMission.to.x,currentMission.to.y,"#4dff84");

  for(const p of peds){ctx.fillStyle=p.panic?"#ff6b6b":"#e6c39a";ctx.fillRect(p.x,p.y,p.w,p.h)}
  for(const c of cars) drawCar(c);
  if(!player.inCar){ctx.fillStyle="#5ccfff";ctx.fillRect(player.x,player.y,player.w,player.h)}

  ctx.restore();

  ctx.fillStyle="rgba(0,0,0,.52)";ctx.fillRect(12,12,178,82);
  ctx.fillStyle="#fff";ctx.font="16px -apple-system,Arial";ctx.fillText(`${player.money}€`,25,38);ctx.fillText(`Vie ${Math.max(0,Math.floor(player.health))}`,25,61);
  ctx.fillStyle="#ffd84a";ctx.fillText("★".repeat(Math.round(player.wanted))+"☆".repeat(5-Math.round(player.wanted)),25,84);

  if(msgT>0){msgT--;ctx.fillStyle="rgba(0,0,0,.58)";ctx.fillRect(sw/2-150,18,300,42);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText(msg,sw/2,45);ctx.textAlign="left"}
  minimap(sw,sh);
  if(player.health<=0){ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(0,0,sw,sh);ctx.fillStyle="#fff";ctx.font="44px Arial";ctx.textAlign="center";ctx.fillText("BUSTED",sw/2,sh/2);ctx.textAlign="left"}
}

function marker(x,y,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,18+Math.sin(performance.now()/180)*4,0,Math.PI*2);ctx.fill()}
function drawCar(c){ctx.save();ctx.translate(c.x+c.w/2,c.y+c.h/2);ctx.rotate(c.angle);ctx.fillStyle=c.police?"#f1f4ff":"#c94747";ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);ctx.fillStyle=c.police?"#2868ff":"#222";ctx.fillRect(-5,-c.h/2,10,c.h);ctx.restore()}
function minimap(sw,sh){const mw=128,mh=92,x=sw-mw-12,y=12,sx=mw/world.w,sy=mh/world.h;ctx.fillStyle="rgba(0,0,0,.52)";ctx.fillRect(x,y,mw,mh);ctx.fillStyle="#555";for(const r of roads)ctx.fillRect(x+r.x*sx,y+r.y*sy,r.w*sx,r.h*sy);if(currentMission){ctx.fillStyle="#4dff84";ctx.fillRect(x+currentMission.to.x*sx-3,y+currentMission.to.y*sy-3,6,6)}ctx.fillStyle="#5ccfff";ctx.fillRect(x+player.x*sx-3,y+player.y*sy-3,6,6)}

function frame(){update();draw();requestAnimationFrame(frame)}
frame();

// Touch joystick
const zone=document.getElementById("stick-zone"), base=document.getElementById("stick-base"), stick=document.getElementById("stick");
let activeTouch=null, baseRect=null;
zone.addEventListener("touchstart",e=>{
  const t=e.changedTouches[0]; activeTouch=t.identifier; baseRect=base.getBoundingClientRect(); moveStick(t); e.preventDefault();
},{passive:false});
zone.addEventListener("touchmove",e=>{
  for(const t of e.changedTouches) if(t.identifier===activeTouch) moveStick(t);
  e.preventDefault();
},{passive:false});
zone.addEventListener("touchend",e=>{
  for(const t of e.changedTouches) if(t.identifier===activeTouch){activeTouch=null;input.x=0;input.y=0;stick.style.transform="translate(0px,0px)"}
  e.preventDefault();
},{passive:false});
function moveStick(t){
  const cx=baseRect.left+baseRect.width/2, cy=baseRect.top+baseRect.height/2;
  let dx=t.clientX-cx, dy=t.clientY-cy;
  const max=42, l=Math.hypot(dx,dy);
  if(l>max){dx=dx/l*max;dy=dy/l*max}
  input.x=dx/max;input.y=dy/max;
  stick.style.transform=`translate(${dx}px,${dy}px)`;
}

function bind(id,key){
  const el=document.getElementById(id);
  el.addEventListener("touchstart",e=>{input[key]=true;e.preventDefault()},{passive:false});
  el.addEventListener("click",e=>{input[key]=true;e.preventDefault()});
}
bind("btn-action","action"); bind("btn-enter","enter"); bind("btn-mission","mission"); bind("btn-reset","reset");

document.getElementById("startBtn").onclick=()=>{
  document.getElementById("start").style.display="none";
  if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
};
