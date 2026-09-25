const $=i=>document.getElementById(i),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rnd=(a,b)=>a+Math.random()*(b-a);
const LV=$('lv').getContext('2d'),PV=$('pv').getContext('2d'),MP=$('mp').getContext('2d'),LD=$('ld').getContext('2d'),CH=$('cv').getContext('2d');
const CLH={ok:'#22c55e',wr:'#f59e0b',cr:'#ef4444',mu:'#9ca3af'},
MISSION_STATES=['Waiting at portal','Entering mine','Zone A patrol active','Deploying sensor','Returning to portal','Mission complete'],
CAMERA_ACTIVE_STATES=new Set(['Entering mine','Zone A patrol active','Deploying sensor','Returning to portal']),cls=s=>s<40?['Safe','ok']:s<70?['Elevated','wr']:['Critical','cr'];
const CK={C1:{x:114,len:1.5,id:'C-01'},C2:{x:171,len:1.8,id:'C-02'},C3:{x:237,len:6.2,id:'C-03'}},TABS=['ov','md','li','se','zn','lg','dh'];
const TL=[['Displacement','mm','d',0,80,'#4fd1c5'],['Vibration PPV','mm/s','v',0,8,'#f59e0b'],['Inclination','°','i',0,3,'#a78bfa'],['Strain','µε','s',100,400,'#60a5fa'],['Crack width','mm','c',0,12,'#f87171'],['Methane (MQ-4)','% CH₄','g',0,2,'#fbbf24']];
$('tl').innerHTML=TL.map(t=>'<div class="tile"><small>'+t[0]+'</small><b id="tv_'+t[2]+'">—</b><span>'+t[1]+'</span><canvas id="tc_'+t[2]+'" width="110" height="30"></canvas></div>').join('');
const TC={};TL.forEach(t=>TC[t[2]]=$('tc_'+t[2]).getContext('2d'));
let S,M=[],sel=null,P={t:0,play:1},L={t:0,yaw:1,lastC:90},TAB='ov',mob=false,ut=0,flt='all';
let UGV={state:0,t:0,active:false,resetCount:0,deployed:false};
let lastZoneASituation='';
let lastFoamState=0;
let lastBlastCount=0;
let lastHighRiskState=false;
const H=(id,h)=>{if(H.c[id]!==h){H.c[id]=h;$(id).innerHTML=h}};H.c={};
const tmago=m=>new Date(Date.now()-m*60000).toTimeString().slice(0,5),tf=t=>'T+'+String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
const rng=s=>()=>{s=(s*16807+11)%2147483647;return s/2147483647};
/* ---------- camera frame renderer (procedural night-vision) ---------- */
function ms(m,t){const a=t/(m.dur||1),st={};(m.cr||[]).forEach(k=>st[k]=(m.st&&m.st[k])||'det');let cam=m.x0+(m.x1-m.x0)*a,p=0;
if(m.mode=='foam'||m.mode=='node'){const hx=CK[m.tgt].x-3.4;cam=a<.35?m.x0+(hx-m.x0)*a/.35:hx;p=clamp((a-.35)/.5,0,1);if(m.mode=='foam')st[m.tgt]=p<=0?'det':p<1?'foam':'sealed'}
if(m.mode=='verify'){st.C1=st.C2='sealed';st.C3='filled'}return{cam,st,p}}
function frame(g,W,H,m,t,o){o=o||{};const q=ms(m,t),cam=q.cam,hw=2.2,hh=1.6,F=Math.min(W,H*1.78)*.62,P=(X,Y,Z)=>{const s=F/(Math.max(X,cam-.3)-cam+.7);return[W/2+Y*s,H*.52-Z*s,s]};
g.fillStyle='#010a03';g.fillRect(0,0,W,H);const base=Math.ceil(cam/2)*2;
const quad=(pts,c)=>{g.fillStyle=c;g.beginPath();pts.forEach((p,i)=>{const r=P(...p);i?g.lineTo(r[0],r[1]):g.moveTo(r[0],r[1])});g.closePath();g.fill()};
for(let k=13;k>=0;k--){const xa=base+k*2,xb=xa-2,sh=clamp(1-(xa-cam)/26,.05,1),gr=v=>'rgb('+Math.round(v*.25*sh)+','+Math.round(v*sh)+','+Math.round(v*.3*sh)+')';
quad([[xa,-hw,-hh],[xa,-hw,hh],[xb,-hw,hh],[xb,-hw,-hh]],gr(120));quad([[xa,hw,-hh],[xa,hw,hh],[xb,hw,hh],[xb,hw,-hh]],gr(105));quad([[xa,-hw,hh],[xa,hw,hh],[xb,hw,hh],[xb,-hw,hh]],gr(70));quad([[xa,-hw,-hh],[xa,hw,-hh],[xb,hw,-hh],[xb,-hw,-hh]],gr(150));
const r=rng(xa*13+7);g.fillStyle='rgba(190,255,200,'+.3*sh+')';for(let i=0;i<14;i++){const p=P(xb+r()*2,r()<.5?-hw:hw,(r()*2-1)*hh),z=Math.max(1,p[2]*.03);g.fillRect(p[0],p[1],z,z)}
const a=P(xa,-hw,hh),b=P(xa,hw,hh),c=P(xa,hw,-hh),d=P(xa,-hw,-hh);g.strokeStyle='rgba(120,255,140,'+.6*sh+')';g.lineWidth=Math.max(1,a[2]*.1);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.lineTo(d[0],d[1]);g.closePath();g.stroke()}
const fs=Math.max(8,W/38);g.font='bold '+Math.max(8,W/45)+'px system-ui';
(m.cr||[]).forEach(k=>{const c=CK[k],s=q.st[k];if(c.x+c.len<cam||c.x-cam>24)return;const pts=[];for(let i=0;i<=12;i++){const R=rng(c.x*3+i);pts.push(P(c.x+c.len*i/12,-hw,Math.sin(i*1.9+c.x)*.5+(R()-.5)*.25))}
const sw=Math.max(1.5,pts[0][2]*.05),pl=(col,w)=>{g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()};let col,lab;
if(s=='det'){pl('rgba(255,50,50,.55)',sw*3);pl('#fff',sw);col='#ff4d3d';lab=(k=='C3'?'HIGH-RISK ':'')+'CRACK '+c.id+' · '+c.len+' m · '+(k=='C3'?97:95)+'%'}
else{const pp=s=='foam'?q.p:1;pl('rgba(255,50,50,.4)',sw*2);pl('rgba(255,235,120,'+(.35+.6*pp)+')',sw*(2+5*pp));col=s=='foam'?'#facc15':'#4ade80';lab=s=='foam'?'PU FOAM '+Math.round(q.p*100)+'%':s=='filled'?'VOID FILLED 96% ✓':'SEALED ✓ '+c.id;
if(s=='foam'&&q.p<1){const cx=pts[6][0],cy=pts[6][1];g.fillStyle='rgba(255,230,120,.8)';for(let i=0;i<22;i++){const u=Math.random();g.beginPath();g.arc(W/2+(cx-W/2)*u+rnd(-4,4),H*.92+(cy-H*.92)*u-Math.sin(u*3.14)*H*.12,W/150+1,0,7);g.fill()}}}
const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs)-6,y0=Math.min(...ys)-8,x1=Math.max(...xs)+6,y1=Math.max(...ys)+8;
if(x1-x0>10){g.strokeStyle=col;g.lineWidth=1.5;g.strokeRect(x0,y0,x1-x0,y1-y0);g.fillStyle=col;g.fillText(lab,clamp(x0,2,W-g.measureText(lab).width-2),Math.max(fs,y0-4))}});
if(m.mode=='node'&&q.p>0){const pz=clamp(q.p*2.5,0,1),r=P(CK.C3.x-1.2,.4,-hh+.2+(1-pz)*2.2),z=r[2]*.24;g.fillStyle='#22d3ee';g.fillRect(r[0]-z/2,r[1]-z/2,z,z);if(pz>=1){g.strokeStyle='#22d3ee';g.lineWidth=2;g.beginPath();g.arc(r[0],r[1],z*.8+(t*8%6),0,7);g.stroke();g.fillStyle='#22d3ee';g.fillText('NODE N-01 DEPLOYED',r[0]-W*.1,r[1]-z-4)}}
if(!o.lite){g.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);g.fillStyle='rgba(180,255,190,.35)';for(let i=0;i<W/4;i++)g.fillRect(Math.random()*W,Math.random()*H,1.5,1.5)}
const vg=g.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.85);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=vg;g.fillRect(0,0,W,H);g.fillStyle='rgba(0,255,70,.06)';g.fillRect(0,0,W,H);
g.font=fs+'px ui-monospace,monospace';g.fillStyle=o.tag=='● REC'||o.tag=='● LIVE'?(Math.floor(t*2)%2?'#ff5050':'#9dffb0'):'#9dffb0';g.fillText(o.tag||'',8,fs+4);g.fillStyle='#9dffb0';
if(W>300){g.fillText(o.ts||'',W-g.measureText(o.ts||'').width-8,fs+4);g.fillText('CH '+cam.toFixed(1)+' m · ZONE A',8,H-8);const r='CH4 '+S.ch4.toFixed(2)+'% · NV-CAM 1';g.fillText(r,W-g.measureText(r).width-8,H-8)}}
/* ---------- media store ---------- */
function mk(id,kind,title,ch,ago,tag,conf,size,o){return{id,kind,title,ch,time:tmago(ago),tag,conf,size,zone:'A',mode:'scan',cr:['C1','C2','C3'],dur:0,x0:0,x1:0,t0:0,...o}}
function initMedia(){M=[mk('IMG-0398','i','Portal gallery – roof supports','0 m',95,'Roof supports intact · no cracks',98,'1.8 MB',{x0:0,x1:0}),
mk('IMG-0402','i','Crack C-01 detected','114 m',88,'Crack C-01 · 1.5 m · small',95,'2.1 MB',{x0:107,x1:107}),
mk('IMG-0403','i','C-01 sealed with PU foam','114 m',84,'C-01 sealed · 2.0 L PU foam',96,'2.0 MB',{x0:107,x1:107,st:{C1:'sealed'}}),
mk('IMG-0407','i','Crack C-02 detected','171 m',70,'Crack C-02 · 1.8 m · small',95,'2.2 MB',{x0:164,x1:164}),
mk('IMG-0408','i','C-02 sealed with PU foam','171 m',66,'C-02 sealed · 2.5 L PU foam',96,'2.1 MB',{x0:164,x1:164,st:{C2:'sealed'}}),
mk('IMG-0411','i','HIGH-RISK crack C-03','237 m',52,'Crack C-03 · 6.2 m · HIGH RISK (≥ 5 m)',97,'2.4 MB',{x0:230,x1:230}),
mk('IMG-0412','i','Sensor node N-01 deployed','245 m',46,'Node N-01 placed at chainage 245 m',99,'2.0 MB',{x0:223,x1:223,mode:'node',tgt:'C3',dur:45,t0:40}),
mk('VID-012a','v','Gallery scan – Run #12 (time-lapse ×4)','90–250 m',110,'3 cracks detected · roof supports OK',96,'86 MB',{x0:90,x1:250,dur:90}),
mk('VID-012b','v','C-01 PU foam sealing','114 m',86,'Foam 2.0 L · sealed in 22 s',96,'31 MB',{mode:'foam',tgt:'C1',x0:100,dur:40}),
mk('VID-012c','v','C-02 PU foam sealing','171 m',68,'Foam 2.5 L · sealed in 22 s',96,'33 MB',{mode:'foam',tgt:'C2',x0:157,dur:40}),
mk('VID-012d','v','C-03 – node N-01 deployment','237 m',50,'High-risk crack · node deployed',97,'38 MB',{mode:'node',tgt:'C3',x0:223,dur:45})];
sel=M[5];P={t:0,play:0}}
function addMedia(m){M.unshift(m);if(M.length>20)M.pop();renderMedia()}
function renderMedia(){const list=M.filter(m=>flt=='all'||m.kind==flt);
H('mg',list.map(m=>'<div class="th'+(sel&&sel.id==m.id?' sel':'')+'" data-m="'+m.id+'"><canvas id="th_'+m.id+'" width="200" height="112"></canvas><div>'+(m.kind=='v'?'▶ ':'')+m.id+' · '+m.ch+'</div></div>').join(''));
list.forEach(m=>{const c=$('th_'+m.id);if(c)frame(c.getContext('2d'),200,112,m,m.kind=='v'?m.dur*(m.mode=='scan'?.45:m.mode=='foam'?.55:.7):m.t0,{lite:1,tag:m.kind=='v'?'▶':''})});
if(sel)H('md','<div class="r"><span>ID</span><b>'+sel.id+'</b></div><div class="r"><span>Type</span><b>'+(sel.kind=='v'?'Video ('+sel.dur+' s)':'Image')+'</b></div><div class="r"><span>Title</span><b>'+sel.title+'</b></div><div class="r"><span>Zone · chainage</span><b>'+sel.zone+' · '+sel.ch+'</b></div><div class="r"><span>Captured</span><b>'+sel.time+(sel.live?' (live capture)':'')+'</b></div><div class="r"><span>Camera / source</span><b>NV-CAM 1 · UGV R-01</b></div><div class="r"><span>AI finding</span><b>'+sel.tag+'</b></div><div class="r"><span>AI confidence</span><b>'+sel.conf+'%</b></div><div class="r"><span>File size</span><b>'+sel.size+'</b></div><div class="r"><span>Delivery</span><b>Auto-synced to SS-1 ✓</b></div>')}
function pick(id){const m=M.find(x=>x.id==id);if(m){sel=m;P={t:0,play:m.kind=='v'};renderMedia()}}
/* ---------- LiDAR cloud ---------- */
const PC=[];(function(){const R=rng(7);for(let x=90;x<=270;x+=1.5)for(let k=0;k<22;k++){const a=k/22*6.283;PC.push([x,Math.cos(a)*2.2+(R()-.5)*.1,Math.sin(a)*1.6+(R()-.5)*.1,0])}
for(let x=213;x<=267;x+=1.2)for(let k=0;k<50;k++){const w=(R()-.5)*3.6;PC.push([x,w,1.6+Math.sin(R()*3.14)*2.2*(1-Math.abs(w)/2.2*.6),1])}
[[114,1.5],[171,1.8],[237,6.2]].forEach(([x,l],j)=>{for(let i=0;i<60;i++){const u=i/60;PC.push([x+l*u,-2.2,Math.sin(u*9+j)*.5+(R()-.5)*.15,j==2?3:2])}});for(let i=0;i<40;i++)PC.push([245+(R()-.5)*.6,.6+(R()-.5)*.4,-1.5+R()*.4,4])})();
function drawLidar(){const g=LD;g.fillStyle='#0d1117';g.fillRect(0,0,900,340);const cy=Math.cos(L.yaw),sy=Math.sin(L.yaw),ph=.42,cp=Math.cos(ph),sp=Math.sin(ph),fill=S.bh[0].st==5;
PC.forEach(p=>{const X=(p[0]-180)*3,Y=p[1]*12,Z=p[2]*12,x1=X*cy-Y*sy,y1=X*sy+Y*cy;g.fillStyle=p[3]==0?'rgba(45,212,191,'+clamp(.35+(p[2]+1.6)/4,.3,.95)+')':p[3]==1?(fill?'#f5d76e':'#ef4444'):p[3]==2?'#f59e0b':p[3]==3?'#ef4444':'#22d3ee';g.fillRect(450+x1,190-(Z*cp+y1*sp),2,2)});
g.fillStyle='#9ca3af';g.font=(mob?18:12)+'px system-ui';g.fillText('Portal 90 m → 270 m · yaw '+((L.yaw*57.3)%360).toFixed(0)+'°',10,20)}
/* ---------- state ---------- */
function sv(){const a=S.Z.A,n=()=>Math.random()-.5;return{d:a.d+n()*.15,v:S.ppv,i:.4+a.d*.028+n()*.01,s:120+a.d*4.5+n()*3,c:4+a.d*.08+n()*.05,g:S.ch4}}

function missionLabel(){return MISSION_STATES[UGV.state]||MISSION_STATES[0]}
function cameraIsActive(){return UGV.active && CAMERA_ACTIVE_STATES.has(missionLabel()) && !S.pause}
function easeOutSlow(p){p=clamp(p,0,1);return 1-Math.pow(1-p,2.35)}
function liveCameraPosition(){
 // R-01 moves progressively slower as it advances; the night-vision feed follows
 // the rover continuously so the visual motion changes from faster to slower.
 if(UGV.state===1) return 90*easeOutSlow(UGV.t/12);
 if(UGV.state===2) return 90+147*easeOutSlow(UGV.t/42);
 if(UGV.state===3) return 237;
 if(UGV.state===4) return Math.max(0,237*(1-easeOutSlow(UGV.t/24)));
 return 0;
}
function liveCameraPhase(){
 if(UGV.state===1) return 'ENTERING MINE';
 if(UGV.state===2) return 'ZONE A PATROL';
 if(UGV.state===3) return 'SENSOR DEPLOYMENT';
 if(UGV.state===4) return 'RETURNING TO PORTAL';
 return 'STANDBY';
}
function resetUgvMission(){
 UGV={state:0,t:0,active:false,resetCount:(UGV.resetCount||0)+1,deployed:false};
 S.cap=0; S.lastCrackAlert=0; S.lastFoamAlert=0; S.lastBlastAlert=0;
 S.fl.w=0; S.fl.c=0; S.fl.g=0; S.fl.highRisk=0; S.siren=0; S.sirenMsg='';
 lastZoneASituation=''; lastFoamState=0; lastBlastCount=0; lastHighRiskState=false;
 al('info','UGV R-01 mission reset. Camera feed is off until the rover enters the mine.');
 ui();
}
function missionStep(dt){
 if(S.pause)return;
 UGV.t+=dt;
 if(UGV.state===0 && UGV.t>=5){UGV.state=1;UGV.t=0;UGV.active=true;al('info','UGV R-01 entered the mine. Live night-vision feed started for Zone A patrol.')}
 else if(UGV.state===1 && UGV.t>=12){UGV.state=2;UGV.t=0;al('info','UGV R-01 reached Zone A. Live camera and sensor monitoring are active.')}
 else if(UGV.state===2 && UGV.t>=42){UGV.state=3;UGV.t=0;UGV.deployed=false;al('info','R-01 is deploying the Zone A sensor device. Live media transfer remains active.')}
 else if(UGV.state===3 && UGV.t>=10){UGV.state=4;UGV.t=0;UGV.deployed=true;al('info','Zone A sensor device deployed successfully. R-01 is returning to the portal.')}
 else if(UGV.state===4 && UGV.t>=24){UGV.state=5;UGV.t=0;UGV.active=false;al('info','UGV R-01 returned outside the mine. Live camera and media transfer stopped automatically.')}
 // Small cracks are notifications, not safety alerts. They appear only when R-01 actually reaches them.
 if(UGV.state===2){
   const ch=liveCameraPosition();
   if(ch>=114 && !S.crack1Notified){S.crack1Notified=1;al('info','NOTIFICATION: Small crack C-01 detected at chainage 114 m. Image/video evidence received from R-01.');}
   if(ch>=171 && !S.crack2Notified){S.crack2Notified=1;al('info','NOTIFICATION: Small crack C-02 detected at chainage 171 m. R-01 is continuing Zone A patrol.');}
 }
}
function init(){const hist=[];for(let i=0;i<=40;i++)hist.push({t:-10+i*.25,d:6+20*Math.pow(i/40,1.2)});
S={t:0,day:0,quiet:1,bump:0,fA:0,cd:0,sub:0,nb:0,bw:0,lastH:0,sk:0,et:2,mq2:0,chT:0,ppv:.8,ch4:.32,sup:0,gen:0,rssi:-92,siren:0,fl:{},lastFoamAlert:0,lastCrackAlert:0,lastBlastAlert:0,hist,evs:[],al:[],mq:[],rows:48210,pause:0,nextB:rnd(50,70),nextG:rnd(70,100),imgN:431,ccr:[],cap:0,crack1Notified:0,crack2Notified:0,
Z:{A:{d:26,r:2},B:{d:9,r:.6},C:{d:4,r:.5},D:{d:2,r:.1}},
bh:[{id:'BH-01',zone:'A',loc:'Chainage 201 m',depth:60,foam:400,st:1,p:0,tm:0,safe:94,why:'12 m before risky void (213–267 m) · crack C-03, 6.2 m'},{id:'BH-02',zone:'C',loc:'Grid C-14',depth:55,foam:300,st:0,p:0,tm:0,safe:88,why:'Blast-induced void under Zone C'}],sp:{}};
const v=sv();TL.forEach(t=>{S.sp[t[2]]=Array(50).fill(v[t[2]])});initMedia();L.lastC=90;
al('info','Substation SS-1 online. UGV R-01 is waiting at the portal. Live camera feed is off until the underground Zone A mission starts.');renderMedia();ui()}
function al(sev,msg){
 const cameraRisk = cameraIsActive() && (score('A')>=70 || /blasting|blast|high risk|critical|seismic/i.test(msg));
 const channels = sev==='crit' ? (cameraRisk?['Siren','SMS','Console']:['SMS','Console']) : sev==='warn'?['SMS','Console']:['Console'];
 S.al.unshift({t:S.t,sev,msg,ch:channels});
 S.al=S.al.slice(0,30);
 if(sev==='crit' && cameraRisk){S.siren=1;S.sirenMsg=msg;}
}
function eta(){const z=S.Z.A;return Math.max(.3,(50+25*S.fA-z.d)/Math.max(.25,z.r))}
function score(id){
 const z=S.Z[id];
 if(id==='A'){
   let s=8;
   const ch=liveCameraPosition();
   if(UGV.active){
     if(ch>=110) s=Math.max(s,28);
     if(ch>=165) s=Math.max(s,48);
     if(ch>=225) s=Math.max(s,76);
   }
   if(S.fA>0) s=Math.max(s,45+S.fA*25);
   if(S.ppv>=5.5) s=Math.max(s,72);
   if(S.ch4>=1.0) s=Math.max(s,70);
   if(S.bw>0 && S.ppv>=5.5) s=Math.max(s,82);
   if(S.bh[0].st===5) s=Math.max(8,s*.45);
   return clamp(Math.round(s),0,100);
 }
 let s=id==='B'?8:id==='C'?6:2;
 if(id==='B') s=clamp(8+S.nb*5,0,100);
 if(id==='C'){s=clamp(6+S.cd*.8,0,100);if(S.sub)s=100;}
 return clamp(Math.round(s),0,100);
}
function dec(id){const s=score(id),b=S.bh[0].st;
if(id=='A')return b==5?'Monitor (reinforced)':b>=2?'Borehole foaming in progress':'Restrict access + borehole BH-01';
if(id=='C')return S.sub?'Restrict – evacuate & seal':s>=70?'Restrict + borehole BH-02':s>=30?'Reinforce (UGV PU foam)':'Monitor';
if(id=='D')return'Survey pending (UGV)';return s>=70?'Restrict':'Monitor (active blasting)'}
function pushEv(src,f,p,cl,act){S.evs.unshift({t:S.t,src,f,p,cl,act});S.evs=S.evs.slice(0,6)}
function blast(){S.nb++;S.bw=.01;S.quiet=0;S.fl.r=0;S.bump+=1.2;const p=rnd(6,8);S.ppv=p;S.gen++;pushEv('Blast – Zone B',rnd(10,18),p,'Blast (genuine)','Counted → risk model');
const m='Blasting detected in Zone B (SG-1 PPV '+p.toFixed(1)+' mm/s). Zone A rate increased and the quiet window was reset.';
if(S.sub)al('warn',m+' Zone C already subsided.');else{S.cd=Math.min(100,S.cd+35);S.ccr.push([rnd(540,650),rnd(190,250),rnd(20,50),rnd(-25,25)],[rnd(560,670),rnd(210,270),rnd(20,50),rnd(-25,25)]);
if(S.cd>=100){S.sub=1;al('crit',m+' Zone C SUBSIDENCE – access road blocked, evacuate Zone C.')}else al(S.cd>=70?'crit':'warn',m+' Zone C cracks appearing (damage '+S.cd+'%).')}
if(S.cd>=70&&S.bh[1].st==0){S.bh[1].st=1;al('warn','AI proposes borehole BH-02 in Zone C (55 m, ~300 L PU). Awaiting approval.')}}
function done(b){if(b.id=='BH-01'){al('info','BH-01: '+b.foam+' L PU foam injected. Zone A reinforced – rate falling, margin +25 mm.');
const n=S.imgN++;addMedia(mk('VID-013','v','Verification scan – Zone A (post foaming)','200–260 m',0,'Void fill 96% · no new voids',96,'52 MB',{mode:'verify',x0:200,x1:260,dur:60,live:1}));addMedia(mk('IMG-0'+n,'i','Void filled – C-03 zone verified','237 m',0,'Void filled 96% ✓',96,'2.3 MB',{mode:'verify',x0:229,x1:229,live:1}));al('info','New media received: VID-013 and IMG-0'+n+' (verification scan).')}
else{if(!S.sub)S.cd=Math.min(S.cd,30);al('info','BH-02: '+b.foam+' L PU foam injected under Zone C. '+(S.sub?'Collapse cannot spread to Zones A/B.':'Damage stabilised.'))}}
function step(dt){if(S.pause)return;S.t+=dt;missionStep(dt);const dd=dt*.3,A=S.Z.A,B=S.Z.B,C=S.Z.C;S.day+=dd;S.quiet+=dd;S.bump*=Math.exp(-dt/5);if(S.bw>0)S.bw+=dt;
const b0=S.bh[0];S.fA=b0.st==5?1:b0.st==4?b0.p:0;
A.r=(2-1.1*S.fA)*(1+.05*Math.sin(S.day*3))+S.bump;A.d=Math.min(A.d+A.r*dd,54+25*S.fA);B.r=.6+.15*Math.sin(S.day*2);B.d+=B.r*dd*.4;
C.d+=((S.sub?62:4+S.cd*.35)-C.d)*Math.min(1,dt*1.2);C.r=.5+S.cd*.03;S.ppv+=(.8+Math.random()*.3-S.ppv)*Math.min(1,dt*1.5);
if(S.chT>0){S.chT-=dt;S.ch4+=(1.15-S.ch4)*Math.min(1,dt*1.2)}else S.ch4+=(.32+Math.random()*.04-S.ch4)*Math.min(1,dt*.8);
S.rssi=-92+Math.sin(S.t)*3;S.rows+=Math.round(dt*9);
S.nextB-=dt;if(S.nextB<=0){S.nextB=rnd(60,90);blast()}S.nextG-=dt;if(S.nextG<=0){S.nextG=rnd(80,120);S.chT=6}
S.bh.forEach(b=>{if(b.st==2){b.tm+=dt;if(b.tm>=3){b.st=3;b.tm=0;al('info',b.id+': drilling started ('+b.depth+' m target).')}}
else if(b.st==3){b.tm+=dt;b.p=b.tm/5;if(b.tm>=5){b.st=4;b.tm=0;b.p=0;al('info',b.id+': void reached, PU foam injection started.')}}
else if(b.st==4){b.tm+=dt;b.p=b.tm/8;if(b.tm>=8){b.st=5;b.p=1;done(b)}}});
/* R-01 movement is handled by the external hardware simulation.
   The dashboard intentionally does not simulate rover position or patrol motion. */
L.lastC=90;
if(S.day-S.lastH>=.25){S.lastH=S.day;S.hist.push({t:S.day,d:A.d});while(S.hist[0].t<S.day-10)S.hist.shift()}
S.sk+=dt;if(S.sk>.3){S.sk=0;const v=sv();TL.forEach(t=>{S.sp[t[2]].push(v[t[2]]);S.sp[t[2]].shift()})}
S.et-=dt;if(S.et<=0){S.et=rnd(3,6);if(Math.random()<.75){const p=rnd(.6,2.4);pushEv('Machinery',rnd(26,45),p,'Machinery','Suppressed');S.sup++}else{const p=rnd(.3,1.2);pushEv('Ground micro-tremor',rnd(3,8),p,'Ground','Watch – logged for LSTM');S.gen++}}
S.mq2-=dt;if(S.mq2<=0){S.mq2=.6;mqLine()}
const e=eta();
if(S.ch4<.6)S.fl.g=0;
if(S.quiet>=2.5&&!S.fl.r){S.fl.r=1;al('info','Sensor fusion is now RELIABLE (2.5 quiet days without blasting).')}
if(S.fA>0.05 && S.lastFoamAlert<1){S.lastFoamAlert=1;al('info','NOTIFICATION: PU foaming detected. Reinforcement activity is active in Zone A.');}
if(S.nb>0 && S.lastBlastAlert<1){S.lastBlastAlert=1;al('crit','ALERT: Blasting/seismic event detected. Substation safety alert activated.');}
const highRisk=score('A')>=70;
if(highRisk && !S.fl.highRisk){S.fl.highRisk=1;al('crit','ALERT: Zone A is HIGH RISK. Live camera has detected a critical condition. Restrict access and follow the borehole intervention plan.');}
if(score('A')<60){S.fl.highRisk=0;if(S.siren){S.siren=0;S.sirenMsg='';}}
if(!cameraIsActive() && S.siren){S.siren=0;S.sirenMsg='';}
}
const liveSt=()=>({C1:'sealed',C2:'sealed',C3:S.bh[0].st==5?'filled':'det'});
function mqLine(){const A=S.Z.A,r=Math.random(),ts=new Date().toTimeString().slice(0,8);let l;
if(r<.25)l='hardware/R-01/status {"link":"online","control":"external","motion":"hardware-simulation"}';
else if(r<.5)l='mine/zoneA/N-01/displacement {"mm":'+A.d.toFixed(2)+',"rate":'+A.r.toFixed(2)+'}';
else if(r<.65)l='mine/zoneA/N-01/vibration {"ppv":'+S.ppv.toFixed(2)+'}';
else if(r<.78)l='mine/zoneA/GS-1/gas {"ch4_pct":'+S.ch4.toFixed(2)+'}';
else if(r<.9)l='seismo/SG-1/ppv {"mm_s":'+S.ppv.toFixed(2)+',"f_hz":'+rnd(8,40).toFixed(0)+'}';
else l='station/ai/predict {"zone":"A","eta_d":'+eta().toFixed(1)+',"conf":'+conf()+'}';
S.mq.push(ts+' '+l);if(S.mq.length>11)S.mq.shift()}
const conf=()=>Math.round(Math.min(96,60+S.quiet*12));
function spk(c,a,col,lo,hi){c.fillStyle='#0f1a1f';c.fillRect(0,0,110,30);c.strokeStyle=col;c.lineWidth=1.3;c.beginPath();a.forEach((v,i)=>{const X=i*110/49,Y=27-clamp((v-lo)/(hi-lo),0,1)*24;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.stroke()}
function ui(){const ids=['A','B','C','D'],sc=ids.map(score),e=eta(),b0=S.bh[0],rel=S.quiet>=2.5,cf=conf(),top=sc.indexOf(Math.max(...sc)),tc=cls(sc[top]),nI=M.filter(m=>m.kind=='i').length+187-7,bs=['—','proposed','crew en route','drilling','injecting','sealed ✓'];
H('pl','<span class="pill ok">SS-1 ↔ mine · 0.80 km</span><span class="pill '+(cameraIsActive()?'ok':'mu')+'">UGV: '+missionLabel()+'</span><span class="pill ok">LoRaWAN '+S.rssi.toFixed(0)+' dBm</span><span class="pill ok">MQTT · TLS 1.3</span><span class="pill ok">UGV R-01 online</span><span class="pill ok">Nodes 5 / 5</span><span class="pill '+(S.siren?'cr':'mu')+'">Siren: '+(S.siren?'RINGING':'STANDBY')+'</span>');
$('sb').style.display=S.siren?'flex':'none';$('sm').textContent='🔔 SIREN – '+(S.sirenMsg||'');
H('kp','<div class="k"><small>Overall risk</small><div style="color:var(--'+tc[1]+')">'+tc[0]+'</div><span>Zone '+ids[top]+' · '+Math.round(sc[top])+'/100</span></div><div class="k"><small>Zone A time to critical</small><div>~'+e.toFixed(1)+' d</div><span>CNN-LSTM · conf '+cf+'%'+(rel?'':' (calibrating)')+'</span></div><div class="k"><small>Active alerts</small><div>'+S.al.filter(a=>a.sev!='info').length+'</div><span>'+S.al.filter(a=>a.sev=='crit').length+' critical</span></div><div class="k"><small>Images / video today</small><div>'+nI+' / 14.2 min</div><span>+'+S.cap+' live captures</span></div><div class="k"><small>Peak methane</small><div style="color:'+(S.ch4>=1?'var(--wr)':'')+'">'+S.ch4.toFixed(2)+'%</div><span>limit 1.0% warn</span></div>');
H('zt',ids.map((id,i)=>{const z=S.Z[id],c=cls(sc[i]);return'<tr><td><b>'+id+'</b></td><td><span class="chip '+(id=='D'?'mu':c[1])+'">'+(id=='C'&&S.sub?'SUBSIDED':id=='D'?'Not surveyed':c[0])+'</span></td><td>'+Math.round(sc[i])+'</td><td>'+z.d.toFixed(1)+' mm</td><td>'+z.r.toFixed(1)+' mm/d</td><td>'+dec(id)+'</td></tr>'}).join(''));
const alh=n=>S.al.slice(0,n).map(a=>'<div class="al '+a.sev+'"><small>'+tf(a.t)+'</small>'+a.msg+'<br>'+a.ch.map(c=>'<span class="chip '+(c=='Siren'?'cr':c=='SMS'?'wr':'mu')+'">'+c+'</span>').join('')+'</div>').join('');
H('alo',alh(5));H('al',alh(30));
H('ms','<div class="r"><span>R-01 link</span><b><span class="chip ok">ONLINE</span></b></div><div class="r"><span>Movement control</span><b>External hardware simulation</b></div><div class="r"><span>Dashboard role</span><b>Monitor &amp; visualize only</b></div><div class="r"><span>LiDAR source</span><b>RPLIDAR A1 + IMU</b></div><div class="r"><span>Scan coverage</span><b>91% of gallery</b></div><div class="r"><span>Cracks logged</span><b>3 (2 sealed · 1 high-risk)</b></div><div class="r"><span>LiDAR points (run #12)</span><b>1.24 M</b></div><div class="r"><span>Last sync to SS-1</span><b>just now ✓</b></div>');
const v=sv();TL.forEach(t=>{const k=t[2],x=v[k],w=k=='g'?(x>=1.5?'cr':x>=1?'wr':''):k=='v'?(x>=3?'wr':''):'';$('tv_'+k).textContent=(k=='g'||k=='v'||k=='i'?x.toFixed(2):k=='s'?Math.round(x):x.toFixed(1));$('tv_'+k).style.color=w?'var(--'+w+')':'';spk(TC[k],S.sp[k],t[5],t[3],t[4])});
H('pm','<span>Model: CNN-LSTM · window 48 h · MAE 1.4 mm</span><span>Confidence '+cf+'%</span><span>Critical threshold '+(50+25*S.fA)+' mm'+(S.fA>=1?' (raised by reinforcement)':'')+'</span>');
H('vc','<div class="r"><span>Machinery events suppressed</span><b>'+S.sup+'</b></div><div class="r"><span>Genuine ground / blast events</span><b>'+S.gen+'</b></div><div class="ov"><table><thead><tr><th>Time</th><th>Source</th><th>Hz</th><th>PPV</th><th>Class</th><th>Action</th></tr></thead><tbody>'+S.evs.map(x=>'<tr><td>'+tf(x.t)+'</td><td>'+x.src+'</td><td>'+x.f.toFixed(0)+'</td><td>'+x.p.toFixed(1)+'</td><td><span class="chip '+(x.cl=='Machinery'?'mu':x.cl=='Ground'?'wr':'cr')+'">'+x.cl+'</span></td><td>'+x.act+'</td></tr>').join('')+'</tbody></table></div>');
const n=()=>Math.random()-.5,env=[['A',S.ch4,12+n()*2,20.6,27.5+n(),78+n()*3,1.6+n()*.2],['B',.28+n()*.03,22+n()*3,20.5,29+n(),74+n()*3,2.1+n()*.2],['C',.41+n()*.04,15+n()*2,20.4,28+n(),81+n()*3,1.2+n()*.2]];
H('en','<table><thead><tr><th>Zone</th><th>CH₄ %</th><th>CO ppm</th><th>O₂ %</th><th>Temp °C</th><th>Humid. %</th><th>Airflow m/s</th></tr></thead><tbody>'+env.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1].toFixed(2)+'</td><td>'+r[2].toFixed(0)+'</td><td>'+r[3].toFixed(1)+'</td><td>'+r[4].toFixed(1)+'</td><td>'+r[5].toFixed(0)+'</td><td>'+r[6].toFixed(1)+'</td></tr>').join('')+'<tr><td><b>D</b></td><td colspan="6" class="mu">Closed – no fixed sensors</td></tr></tbody></table>');
H('nd','<table><thead><tr><th>Device</th><th>Zone</th><th>Link</th><th>Battery</th><th>Signal</th></tr></thead><tbody><tr><td>N-01 risk node</td><td>A · 237 m</td><td><span class="chip ok">online</span></td><td>87%</td><td>'+(S.rssi-1).toFixed(0)+' dBm</td></tr><tr><td>UGV R-01</td><td>A patrol</td><td><span class="chip ok">online</span></td><td>'+Math.max(20,Math.round(71-S.t/40))+'%</td><td>'+(S.rssi+2).toFixed(0)+' dBm</td></tr><tr><td>SG-1 seismograph</td><td>Surface B</td><td><span class="chip ok">wired</span></td><td>mains</td><td>—</td></tr><tr><td>GS-1 gas station</td><td>A</td><td><span class="chip ok">wired</span></td><td>mains</td><td>—</td></tr><tr><td>GS-2 / GS-3 gas</td><td>B / C</td><td><span class="chip ok">wired</span></td><td>mains</td><td>—</td></tr></tbody></table>');
const cs=k=>k=='C3'?(b0.st==5?'void filled ✓':'high risk · node N-01'):'sealed ✓';
H('cr','<table><thead><tr><th>ID</th><th>Chainage</th><th>Length</th><th>Class</th><th>Status</th><th>Evidence</th></tr></thead><tbody>'+[['C1','IMG-0402','VID-012b','2.0 L'],['C2','IMG-0407','VID-012c','2.5 L'],['C3','IMG-0411','VID-012d','']].map(([k,i,v,f])=>{const c=CK[k];return'<tr><td><b>'+c.id+'</b></td><td>'+c.x+' m</td><td>'+c.len+' m</td><td><span class="chip '+(k=='C3'?'cr':'wr')+'">'+(k=='C3'?'HIGH RISK':'Small')+'</span></td><td>'+cs(k)+(f?' · '+f+' foam':'')+'</td><td><button class="f" data-m="'+i+'">Image</button> <button class="f" data-m="'+v+'">Video</button></td></tr>'}).join('')+(S.ccr.length?'<tr><td><b>C-x</b></td><td>Zone C</td><td>'+S.ccr.length+' cracks</td><td><span class="chip cr">Blast-induced</span></td><td>'+(S.sub?'SUBSIDED':'awaiting UGV survey')+'</td><td class="mu">no media yet</td></tr>':'')+'</tbody></table>');
H('bt','<table><thead><tr><th>ID</th><th>Zone · location</th><th>Depth / foam</th><th>Safety</th><th>Status</th><th></th></tr></thead><tbody>'+S.bh.map(b=>'<tr><td><b>'+b.id+'</b></td><td>'+b.zone+' · '+b.loc+'</td><td>'+b.depth+' m / '+b.foam+' L</td><td>'+b.safe+'%</td><td>'+(b.st==0?'<span class="mu">not needed</span>':b.st==3?'drilling '+Math.round(b.p*b.depth)+' / '+b.depth+' m':b.st==4?'injecting '+Math.round(b.p*b.foam)+' / '+b.foam+' L':bs[b.st])+'</td><td>'+(b.st==1?'<button class="p" data-b="'+b.id+'">Approve</button>':'')+'</td></tr><tr><td colspan="6" class="mu" style="font-size:11px">'+(b.st?b.why:'Proposed automatically if Zone C damage ≥ 70%')+'</td></tr>').join('')+'</tbody></table>');
const MX=[[0,.10,.15,.05],[.25,0,.60,.10],[.20,.10,0,.10],[.05,.05,.05,0]],hl=S.bw>0&&S.bw<6;
H('mx','<table><thead><tr><th>From \\ To</th>'+ids.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+MX.map((r,i)=>'<tr><td><b>'+ids[i]+'</b></td>'+r.map((v,j)=>'<td style="text-align:center;background:rgba(239,68,68,'+(v*.7)+');'+(hl&&i==1&&j==2?'outline:2px solid #f97316':'')+'">'+(v?v.toFixed(2):'–')+'</td>').join('')+'</tr>').join('')+'</tbody></table>');
const gb=(3.4+nI*.002+S.cap*.002).toFixed(2);
H('nt','<div class="r"><span>LoRaWAN rock mesh</span><b>'+S.rssi.toFixed(0)+' dBm · SNR '+(8+Math.sin(S.t)).toFixed(1)+' dB</b></div><div class="r"><span>Packet loss</span><b>'+(.6+.3*Math.sin(S.t*.7)).toFixed(1)+'%</b></div><div class="r"><span>MQTT throughput</span><b>'+Math.round(92+8*Math.sin(S.t))+' msg/min</b></div><div class="r"><span>Media stored (images · video)</span><b>'+nI+' · 14.2 min ('+gb+' GB)</b></div><div class="r"><span>PostgreSQL spatial rows</span><b>'+S.rows.toLocaleString()+'</b></div>');
$('mq').textContent=S.mq.join('\n');
H('ls','<div class="r"><span>Scan run</span><b>#12 · Zone A gallery</b></div><div class="r"><span>Points captured</span><b>1.24 M (view: '+PC.length.toLocaleString()+' sampled)</b></div><div class="r"><span>Range covered</span><b>90 – 270 m</b></div><div class="r"><span>Open voids</span><b>'+(b0.st==5?0:1)+'</b></div><div class="r"><span>Cracks</span><b>3</b></div><div class="r"><span>Roof convergence</span><b>'+(2+S.Z.A.d*.06).toFixed(1)+' mm</b></div><div class="r"><span>Sensor</span><b>RPLIDAR A1 + MPU6050</b></div>');
H('lf','<table><thead><tr><th>Feature</th><th>Chainage</th><th>Size</th><th>State</th></tr></thead><tbody><tr><td>Crack C-01</td><td>114 m</td><td>1.5 m</td><td>sealed</td></tr><tr><td>Crack C-02</td><td>171 m</td><td>1.8 m</td><td>sealed</td></tr><tr><td>Crack C-03</td><td>237 m</td><td>6.2 m</td><td>'+(b0.st==5?'filled':'open')+'</td></tr><tr><td>Void V-01</td><td>213 – 267 m</td><td>~380 m³ (est.)</td><td>'+(b0.st==5?'foam-filled 96%':'open')+'</td></tr></tbody></table>');renderZoneASituation()}
function chart(){const g=CH,W=600,Hh=240,L=36,Bm=22,T=10,Rr=10,mx=90,f=mob?1.5:1,x=t=>L+(t+10)/30*(W-L-Rr),y=v=>Hh-Bm-clamp(v,0,mx+15)/mx*(Hh-Bm-T),A=S.Z.A,thr=50+25*S.fA;
g.fillStyle='#14100c';g.fillRect(0,0,W,Hh);g.font=10*f+'px system-ui';g.lineWidth=1;g.strokeStyle='#2c251d';g.fillStyle='#8a7a66';
[0,30,60,90].forEach(v=>{g.beginPath();g.moveTo(L,y(v));g.lineTo(W-Rr,y(v));g.stroke();g.fillText(v,4,y(v)+3)});[-10,0,10,20].forEach(t=>g.fillText((t>0?'+':'')+t+' d',x(t)-10,Hh-6));
g.setLineDash([5,4]);g.strokeStyle='#f59e0b';g.beginPath();g.moveTo(L,y(30));g.lineTo(W-Rr,y(30));g.stroke();g.strokeStyle='#ef4444';g.beginPath();g.moveTo(L,y(thr));g.lineTo(W-Rr,y(thr));g.stroke();g.setLineDash([]);
g.fillStyle='#f59e0b';g.fillText('Elevated',L+4,y(30)-3);g.fillStyle='#ef4444';g.fillText('Critical '+thr+' mm',L+4,y(thr)-3);
const fc=t=>A.d+A.r*t,bd=t=>.5+.3*t;g.fillStyle='rgba(251,146,60,.16)';g.beginPath();for(let t=0;t<=20;t++)g.lineTo(x(t),y(fc(t)+bd(t)));for(let t=20;t>=0;t--)g.lineTo(x(t),y(fc(t)-bd(t)));g.fill();
g.strokeStyle='#fb923c';g.lineWidth=2;g.setLineDash([6,4]);g.beginPath();g.moveTo(x(0),y(A.d));g.lineTo(x(20),y(fc(20)));g.stroke();g.setLineDash([]);
g.strokeStyle='#4fd1c5';g.beginPath();S.hist.forEach((p,i)=>{const X=x(p.t-S.day),Y=y(p.d);i?g.lineTo(X,Y):g.moveTo(X,Y)});g.stroke();
g.strokeStyle='#888';g.lineWidth=1;g.beginPath();g.moveTo(x(0),T);g.lineTo(x(0),Hh-Bm);g.stroke();g.fillStyle='#ccc';g.fillText('Now',x(0)+3,T+10);
const e=eta();if(e<=20){g.fillStyle='#ef4444';g.beginPath();g.arc(x(e),y(thr),5,0,7);g.fill();g.fillText('ETA '+e.toFixed(1)+' d',x(e)-30,y(thr)+16)}
g.fillStyle='#4fd1c5';g.fillText('actual',W-90,T+12);g.fillStyle='#fb923c';g.fillText('LSTM forecast ± band',W-150,T+26)}
function mt(t,x,y,c,s,b){MP.fillStyle=c;MP.font=(b?'bold ':'')+s*(mob?1.5:1)+'px system-ui';MP.fillText(t,x,y)}
function drawMap(){const g=MP,ids=['A','B','C','D'],xm=m=>60+m*1.5,st=liveSt();g.fillStyle='#1c1611';g.fillRect(0,0,900,300);g.fillStyle='#24402f';g.fillRect(0,0,60,300);
[[90,50,400,200],[520,15,180,120],[520,165,180,120],[730,80,150,140]].forEach((r,i)=>{const sc=score(ids[i]),c=ids[i]=='D'?'#9ca3af':CLH[cls(sc)[1]];g.fillStyle=c+'2a';g.strokeStyle=c;g.lineWidth=2;g.fillRect(...r);g.strokeRect(...r);mt('Zone '+ids[i],r[0]+8,r[1]+(mob?26:18),c,13,1);if(!mob)mt(ids[i]=='D'?'not surveyed':(ids[i]=='C'&&S.sub?'SUBSIDED':cls(sc)[0])+' · '+S.Z[ids[i]].d.toFixed(0)+' mm',r[0]+8,r[1]+34,c,11)});
g.fillStyle='#2b241c';g.fillRect(60,136,410,28);g.fillStyle='#211b15';g.fillRect(470,136,260,28);g.fillRect(602,135,16,30);
g.strokeStyle='#ef4444';g.lineWidth=1.5+S.cd/35;S.ccr.forEach(c=>{g.beginPath();g.moveTo(c[0],c[1]);g.lineTo(c[0]+c[2],c[1]+c[3]);g.stroke()});
if(S.sub){g.fillStyle='rgba(15,8,4,.8)';g.beginPath();g.ellipse(610,225,70,45,0,0,7);g.fill();g.strokeStyle='#ef4444';g.lineWidth=2;g.stroke()}
if(S.bh[0].st>=1){g.fillStyle=S.bh[0].st==5?'rgba(245,215,110,.45)':'rgba(239,68,68,.3)';g.fillRect(xm(213),136,xm(267)-xm(213),28)}
Object.keys(CK).forEach(k=>{const c=CK[k],s=st[k];g.fillStyle=s=='det'?'#ef4444':s=='filled'?'#4ade80':'#f5d76e';g.beginPath();g.arc(xm(c.x),150,k=='C3'?8:6,0,7);g.fill();mt(c.id,xm(c.x)-14,124,'#ddd',11)});
const nx=xm(245);g.strokeStyle='#22d3ee';g.setLineDash([5,5]);g.lineDashOffset=-S.t*20;g.lineWidth=1.2;g.beginPath();g.moveTo(nx,150);g.lineTo(34,44);g.stroke();g.setLineDash([]);g.fillStyle='#22d3ee';g.beginPath();g.arc(nx,150,5,0,7);g.fill();mt('N-01',nx-4,182,'#22d3ee',11);
g.fillStyle='#4b5563';g.fillRect(8,14,44,26);mt('SS-1',12,58,'#9fd3a8',11);
S.bh.forEach((b,i)=>{if(!b.st)return;const x=i?600:xm(201),y=i?185:105,c=['','#9ca3af','#f97316','#f97316','#f5d76e','#22c55e'][b.st];g.fillStyle=c;g.beginPath();g.arc(x,y,6,0,7);g.fill();mt(b.id,x+8,y+4,c,11)});
mt('R-01 hardware simulation',70,280,'#22d3ee',11);
}

function renderZoneASituation(){
 const s=Math.round(score('A')), zoneClass=s>=70?'CRITICAL':'SAFE';
 lastZoneASituation=zoneClass;
 const badge=$('zoneASituation'); if(badge){badge.textContent=zoneClass;badge.className='situation-badge '+zoneClass.toLowerCase().replace(' ','-');}
 const mission=$('ugvMissionState'); if(mission)mission.textContent=missionLabel();
 const deploy=$('sensorDeployState'); if(deploy)deploy.textContent=UGV.deployed?'Deployed ✓':(UGV.state===3?'Deploying…':'Pending');
 const cam=$('cameraState'); if(cam){cam.textContent=cameraIsActive()?'● CAMERA LIVE':'● CAMERA OFF';cam.className='camera-state '+(cameraIsActive()?'on':'off');}
 const media=$('mediaTransferStatus'); if(media)media.textContent=cameraIsActive()?'Transmitting':'Inactive';
 const crack=$('crackStatus'); if(crack){const ch=liveCameraPosition();crack.textContent=ch>=225?'High-risk crack detected':ch>=165?'Small crack C-02 detected':ch>=110?'Small crack C-01 detected':'Monitoring';}
 const overlay=$('cameraOffOverlay'); if(overlay)overlay.classList.toggle('hidden',cameraIsActive());
 const card=$('liveCameraCard'); if(card)card.classList.toggle('feed-active',cameraIsActive());
 const details=$('zoneASituationDetails');
 if(details)details.innerHTML=[
  ['Overall Zone A risk',zoneClass+' · '+s+'/100'],
  ['Structural displacement',S.Z.A.d.toFixed(1)+' mm'],
  ['Vibration / PPV',S.ppv.toFixed(1)+' mm/s'],
  ['Methane',S.ch4.toFixed(2)+'%'],
  ['Foaming',S.fA>0?'Active / '+Math.round(S.fA*100)+'%':'Not active'],
  ['Blasting',S.bw>0?'Detected / recent':'No active blast'],
  ['Siren',S.siren?'ACTIVE — camera risk detected':'Standby']
 ].map(([a,b])=>'<div class="situation-item"><small>'+a+'</small><b>'+b+'</b></div>').join('');
 const feed=$('zoneAEventFeed');
 if(feed){
   const events=S.al.filter(a=>/crack|foam|blast|blasting|HIGH RISK/i.test(a.msg)).slice(0,5);
   feed.innerHTML=events.length?events.map(a=>'<div class="event-row '+a.sev+'"><span>'+a.sev.toUpperCase()+'</span><b>'+a.msg+'</b></div>').join(''):'<div class="empty-state">No crack, foaming or blasting events detected.</div>';
 }
}
/* ---------- interaction ---------- */
function tab(k){TAB=k;TABS.forEach(t=>{$('t_'+t).style.display=t==k?(t=='ov'||t=='md'||t=='li'||t=='se'||t=='zn'||t=='lg'||t=='dh'?'grid':'block'):'none';$('tb_'+t).className=t==k?'on':''});if(k=='md')renderMedia()}
TABS.forEach(k=>$('tb_'+k).onclick=()=>tab(k));
$('mg').onclick=e=>{const el=e.target.closest?e.target.closest('.th'):e.target;const id=el&&el.dataset&&el.dataset.m;if(id)pick(id)};
$('cr').onclick=e=>{const id=e.target.dataset&&e.target.dataset.m;if(id){pick(id);tab('md')}};
$('bt').onclick=e=>{const id=e.target.dataset&&e.target.dataset.b;if(id){const b=S.bh.find(x=>x.id==id);if(b&&b.st==1){b.st=2;b.tm=0;al('info',b.id+' approved – drilling crew dispatched to '+b.loc+'.');ui()}}};
$('ak').onclick=()=>{S.siren=0;S.sirenMsg='';ui()};
$('resetUgvMission').onclick=resetUgvMission;
const LOGIN_KEY='coalmineX.substation.session.v1';
const DEMO_OPERATOR={id:'SS-1-OP',password:'COALMINE@SS1',name:'SS-1 Operator',role:'Authorized Substation Operator'};
function showOperatorProfile(){
 $('profileName').textContent=DEMO_OPERATOR.name;
 $('profileRole').textContent=DEMO_OPERATOR.role;
 $('profileAvatar').textContent='OP';
}
function loginOperator(e){
 e.preventDefault();
 const id=$('loginId').value.trim().toUpperCase(), pw=$('loginPassword').value;
 if(id===DEMO_OPERATOR.id && pw===DEMO_OPERATOR.password){
   sessionStorage.setItem(LOGIN_KEY,'1');
   $('loginScreen').classList.add('hidden');
   showOperatorProfile();
 }else{
   $('loginError').textContent='Access denied. Only authorized Substation SS-1 personnel can sign in.';
 }
}
function logoutOperator(){
 sessionStorage.removeItem(LOGIN_KEY);
 $('loginScreen').classList.remove('hidden');
 $('loginPassword').value='';
}
$('loginForm').addEventListener('submit',loginOperator);
$('logoutButton').addEventListener('click',logoutOperator);
if(sessionStorage.getItem(LOGIN_KEY)==='1'){$('loginScreen').classList.add('hidden');showOperatorProfile();}
$('resetSystem').addEventListener('click',()=>{
 // One click clears the entire dashboard state, alerts/logs, counters, media session and daily history.
 localStorage.removeItem('coalmineX.dailyHistory.v1');
 init();
 UGV={state:0,t:0,active:false,resetCount:(UGV.resetCount||0)+1,deployed:false};
 S.pause=0;
 $('monitorStatus').textContent='● Monitoring Running';
 $('monitorStatus').className='monitor-status running';
 $('startSystem').classList.add('active'); $('stopSystem').classList.remove('active');
 $('startSystem').disabled=true; $('stopSystem').disabled=false;
 document.body.classList.remove('monitoring-stopped');
 if(typeof renderHistory==='function') renderHistory();
 ui();
});
[['f_all','all'],['f_i','i'],['f_v','v']].forEach(([id,f])=>$(id).onclick=()=>{flt=f;['f_all','f_i','f_v'].forEach(x=>$(x).className='f'+(x==id?' on':''));H.c.mg='';renderMedia()});
$('pp').onclick=()=>{if(sel.kind=='v'){P.play=!P.play;$('pp').textContent=P.play?'⏸':'▶'}};
$('ps').oninput=()=>{if(sel.kind=='v'){P.t=$('ps').value/100*sel.dur;P.play=0;$('pp').textContent='▶'}};
$('yw').oninput=()=>{L.yaw=$('yw').value/100;$('ar').checked=false};
init();tab('ov');
let pt=performance.now();(function f(t){const dt=Math.min(.05,(t-pt)/1000);pt=t;mob=innerWidth<640;step(dt);ut+=dt;if(ut>.25){ut=0;ui()}
if(TAB=='ov'){
 const cam=liveCameraPosition();
 if(cameraIsActive()){
   frame(LV,480,270,{mode:'scan',x0:cam,x1:cam,dur:0,cr:['C1','C2','C3'],st:liveSt()},0,{tag:'● REC · LIVE',ts:new Date().toTimeString().slice(0,8)});
   LV.fillStyle='rgba(0,0,0,.48)'; LV.fillRect(8,30,154,22);
   LV.fillStyle='#9dffb0'; LV.font='bold 10px ui-monospace,monospace';
   LV.fillText(liveCameraPhase()+' · CH '+cam.toFixed(0)+' m',14,45);
 }else{
   const g=LV; g.fillStyle='#070b0f'; g.fillRect(0,0,480,270); g.fillStyle='#667085'; g.font='700 18px system-ui'; g.textAlign='center'; g.fillText('LIVE FEED OFF',240,128); g.font='12px system-ui'; g.fillText('R-01 is outside the mine or the mission is complete.',240,151); g.textAlign='left';
 }
 drawMap()}
if(TAB=='md'&&sel){const dur=sel.dur||1;if(sel.kind=='v'&&P.play&&!S.pause){P.t=(P.t+dt)%dur;$('ps').value=P.t/dur*100}
frame(PV,640,360,sel,sel.kind=='v'?P.t:sel.t0,{tag:sel.kind=='v'?'● REC':'SNAPSHOT',ts:sel.time+' '+new Date().toLocaleDateString()});$('pt').textContent=sel.kind=='v'?Math.floor(P.t/60)+':'+String(Math.floor(P.t%60)).padStart(2,'0')+' / '+Math.floor(dur/60)+':'+String(dur%60).padStart(2,'0'):'still image'}
if(TAB=='li'){if($('ar').checked&&!S.pause){L.yaw+=dt*.35;$('yw').value=(L.yaw%6.28)*100}drawLidar()}
if(TAB=='se')chart();
requestAnimationFrame(f)})(pt);
