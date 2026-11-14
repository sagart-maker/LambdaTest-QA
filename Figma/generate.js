// Generates Figma-importable SVG frames for the LambdaTest QA Agent web app.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const L = { bg:'#f5f6f8', card:'#ffffff', text:'#1d2433', muted:'#5b6475', border:'#dde2ea', navy:'#14213d', accent:'#f2a65a', accentInk:'#9a4614', ok:'#1f7a3a', okBg:'#e5f4ea', bad:'#b42318', badBg:'#fde8e6', warnBg:'#fff3e0', infoBg:'#e8eefb', code:'#0f1626', codeText:'#d6deeb' };
const D = { bg:'#0f131b', card:'#171c26', text:'#e4e8ef', muted:'#98a2b3', border:'#2a3242', navy:'#c9d4ea', accent:'#f2a65a', accentInk:'#f5b77a', ok:'#6fcf8c', okBg:'#16301f', bad:'#f28b82', badBg:'#3a1a18', warnBg:'#3a2a14', infoBg:'#1c2740', code:'#0a0e15', codeText:'#d6deeb' };
const C = L;
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";
const MONO = "Consolas, 'JetBrains Mono', monospace";

const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const tw = (s, size, w=400) => s.length * size * (w >= 600 ? 0.58 : 0.54); // approx text width

const fit=(t,max,size,w)=>{ if(tw(t,size,w)<=max) return t; while(t.length&&tw(t+'…',size,w)>max) t=t.slice(0,-1); return t+'…'; };
class Svg {
  constructor(w, h, name) { this.w=w; this.h=h; this.name=name; this.parts=[]; this.stack=[]; }
  g(id, fn) { this.parts.push(`<g id="${esc(id)}">`); fn(); this.parts.push('</g>'); }
  rect(x,y,w,h,{fill='none',stroke,r=0,sw=1,id}={}) {
    this.parts.push(`<rect${id?` id="${esc(id)}"`:''} x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''}/>`);
  }
  line(x1,y1,x2,y2,stroke=C.border,sw=1){ this.parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`); }
  circle(cx,cy,r,{fill='none',stroke,sw=1}={}){ this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''}/>`); }
  path(d,{fill='none',stroke,sw=1.5}={}){ this.parts.push(`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`); }
  text(x,y,s,{size=15,w=400,fill=C.text,anchor='start',font=FONT}={}) {
    this.parts.push(`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${w}" fill="${fill}"${anchor!=='start'?` text-anchor="${anchor}"`:''}>${esc(s)}</text>`);
  }
  // wrapped paragraph; returns height used
  para(x,y,s,maxW,{size=15,lh=1.5,...o}={}) {
    const words=s.split(' '); const lines=[]; let cur='';
    for (const wd of words){ const t=cur?cur+' '+wd:wd; if (tw(t,size,o.w)>maxW && cur){ lines.push(cur); cur=wd; } else cur=t; }
    if (cur) lines.push(cur);
    lines.forEach((ln,i)=>this.text(x, y+size + i*size*lh - (size*lh-size)/2*0, ln, {size,...o}));
    return lines.length*size*lh;
  }
  save(file) {
    const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">\n<title>${esc(this.name)}</title>\n${this.parts.join('\n')}\n</svg>\n`;
    fs.writeFileSync(path.join(OUT, file), body);
  }
}

// ---------- components ----------
function checkbox(s,x,y,label,checked,{c=C}={}) {
  s.g(`Checkbox / ${label}`, () => {
    s.rect(x,y,16,16,{fill:checked?c.navy:c.card,stroke:checked?c.navy:c.muted,r:3});
    if (checked) s.path(`M${x+4} ${y+8.5} L${x+7} ${y+11.5} L${x+12} ${y+5}`,{stroke:c.card,sw:2});
    s.text(x+24,y+13,label,{size:15,fill:c.text});
  });
  return 24 + tw(label,15);
}
function radio(s,x,y,checked,c=C){ s.circle(x+8,y+8,7.5,{fill:c.card,stroke:checked?c.navy:c.muted}); if(checked) s.circle(x+8,y+8,4,{fill:c.navy}); }
function input(s,x,y,w,label,{value='',placeholder='',h=38,select=false,c=C,focus=false}={}) {
  s.g(`Field / ${label}`, () => {
    s.text(x,y+14,label,{size:14,w:600,fill:c.text});
    s.rect(x,y+22,w,h,{fill:c.bg,stroke:focus?c.navy:c.border,r:6,sw:focus?2:1});
    s.text(x+10,y+22+24,fit(value||placeholder,w-(select?44:20),15),{size:15,fill:value?c.text:c.muted});
    if (select) s.path(`M${x+w-22} ${y+22+16} l5 5 l5 -5`,{stroke:c.muted,sw:1.6});
  });
  return 22+h+10;
}
function button(s,x,y,label,{kind='default',c=C,w}={}) {
  const bw = w || Math.round(tw(label,15,kind==='primary'?600:400)+32);
  s.g(`Button / ${kind} / ${label}`, () => {
    const fill = kind==='primary'?c.navy:c.card, stroke = kind==='primary'?c.navy:c.border;
    const fg = kind==='primary'?c.card:kind==='danger'?c.bad:c.text;
    s.rect(x,y,bw,40,{fill,stroke,r:6});
    s.text(x+bw/2,y+25,label,{size:15,w:kind==='primary'?600:400,fill:fg,anchor:'middle'});
  });
  return bw;
}
function badge(s,x,y,label,kind='info',{c=C,size=13,spinner=false}={}) {
  const map={ok:[c.okBg,c.ok],bad:[c.badBg,c.bad],wait:[c.warnBg,c.accentInk],info:[c.infoBg,c.text]};
  const [bg,fg]=map[kind]; const extra=spinner?18:0;
  const w=Math.round(tw(label,size,600)+24+extra);
  s.g(`Badge / ${kind} / ${label}`, () => {
    s.rect(x,y,w,26,{fill:bg,r:13});
    if (spinner){ s.path(`M${x+18} ${y+7} A6 6 0 1 1 ${x+12} ${y+13}`,{stroke:fg,sw:2}); }
    s.text(x+12+extra,y+18,label,{size,w:600,fill:fg});
  });
  return w;
}
function pill(s,x,y,label,kind='ok',c=C){
  const map={ok:[c.okBg,c.ok],bad:[c.badBg,c.bad],info:[c.infoBg,c.text]};
  const [bg,fg]=map[kind]; const w=Math.round(tw(label,13)+20);
  s.g(`Pill / ${kind} / ${label}`,()=>{ s.rect(x,y,w,22,{fill:bg,r:11}); s.text(x+10,y+15.5,label,{size:13,fill:fg}); });
  return w;
}
function fieldset(s,x,y,w,h,legend,c=C){
  s.rect(x,y,w,h,{stroke:c.border,r:8,fill:c.card});
  const lw=tw(legend,15,700)+12;
  s.rect(x+10,y-10,lw,20,{fill:c.card});
  s.text(x+16,y+5,legend,{size:15,w:700,fill:c.text});
}
function topbar(s,w,{mobile=false,c=C}={}){
  s.g('Top bar',()=>{
    s.rect(0,0,w,mobile?92:56,{fill:c.card});
    s.line(0,mobile?92:56,w,mobile?92:56,c.border);
    s.rect(20,17,30,22,{fill:c.navy,r:6}); s.text(35,32.5,'QA',{size:13,w:700,fill:c.card,anchor:'middle'});
    s.text(58,33,'LambdaTest QA Agent',{size:15,w:700});
    const pills=[['Claude Code 2.4','ok'],['QA agent plugin','ok'],['LambdaTest keys (~/.lambdatest/.env)','ok']];
    if (mobile){ let px=20; pills.slice(0,2).forEach(([t,k])=>{px+=pill(s,px,56,t,k)+8;}); }
    else { let total=pills.reduce((a,[t])=>a+tw(t,13)+28,0); let px=w-20-total+8; pills.forEach(([t,k])=>{px+=pill(s,px,17,t,k)+8;}); }
  });
}
function steps(s,x,y,w,active,c=C){
  const labels=['Plan','Approve','Run on LambdaTest','Report']; const gap=6; const sw=(w-gap*3)/4;
  s.g('Steps',()=>labels.forEach((l,i)=>{
    const sx=x+i*(sw+gap); const st=i<active?'done':i===active?'active':'todo';
    const fill=st==='done'?c.okBg:st==='active'?c.warnBg:c.card;
    const stroke=st==='done'?null:st==='active'?c.accent:c.border;
    const fg=st==='done'?c.ok:st==='active'?c.accentInk:c.muted;
    s.g(`Step / ${l} / ${st}`,()=>{ s.rect(sx,y,sw,36,{fill,stroke,r:6}); s.text(sx+sw/2,y+23,(st==='done'?'✓ ':'')+l,{size:13,w:st==='active'?600:400,fill:fg,anchor:'middle'}); });
  }));
}

// ---------- 01 tokens ----------
(function tokens(){
  const s=new Svg(1440,1120,'01 Design tokens'); s.rect(0,0,1440,1120,{fill:'#ffffff'});
  s.text(64,80,'LambdaTest QA Agent — Design tokens',{size:32,w:700});
  s.text(64,112,'From web-app/public/styles.css. Light and dark themes share token names.',{size:16,fill:C.muted});
  const names=Object.keys(L);
  [['Light',L,64],['Dark',D,740]].forEach(([title,pal,ox])=>{
    s.text(ox,170,`Colour — ${title}`,{size:20,w:700});
    names.forEach((n,i)=>{
      const col=i%4,row=Math.floor(i/4); const x=ox+col*158,y=196+row*130;
      s.g(`Colour / ${title} / ${n}`,()=>{
        s.rect(x,y,142,70,{fill:pal[n],stroke:'#dde2ea',r:8});
        s.text(x,y+92,'--'+n.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),{size:13,w:600});
        s.text(x,y+110,pal[n].toUpperCase(),{size:12,fill:C.muted,font:MONO});
      });
    });
  });
  let y=760; s.text(64,y,'Type scale',{size:20,w:700});
  [['H1 / 22 Bold','Inter 22 / 700',22,700],['H2 / 16 Bold','Inter 16 / 700',16,700],['Body / 15 Regular','Inter 15 / 400 · line 1.5',15,400],['Label / 14 Semibold','Inter 14 / 600',14,600],['Small / 13 Regular','Inter 13 / 400',13,400],['Code / 12 Mono','Consolas 12 · line 1.45',12,400]]
    .forEach(([t,spec,sz,w],i)=>{ const yy=y+44+i*48; s.text(64,yy,t,{size:sz,w,font:i===5?MONO:FONT}); s.text(360,yy,spec,{size:13,fill:C.muted}); });
  s.text(740,y,'Radius & spacing',{size:20,w:700});
  [['radius/sm',6,'inputs, buttons, steps'],['radius/md',8,'fieldsets, tiers, run rows'],['radius/lg',10,'cards'],['radius/pill',999,'badges, pills']].forEach(([n,r,u],i)=>{
    const x=740+i*160; s.rect(x,y+30,120,64,{fill:C.infoBg,stroke:C.border,r:Math.min(r,32)}); s.text(x,y+116,n+'  '+(r===999?'999':r),{size:13,w:600}); s.text(x,y+134,u,{size:12,fill:C.muted});
  });
  [4,8,12,16,18,20].forEach((sp,i)=>{ const x=740+i*90; s.rect(x,y+180,sp,sp,{fill:C.accent}); s.text(x,y+180+sp+20,sp+'px',{size:12,fill:C.muted}); });
  s.text(740,y+260,'Layout: max-width 1280 · card padding 18 · grid 3fr / 2fr, gap 16 · stacks below 900px',{size:13,fill:C.muted});
  s.save('01-design-tokens.svg');
})();

// ---------- 02 components ----------
(function components(){
  const s=new Svg(1440,1110,'02 Components'); s.rect(0,0,1440,1110,{fill:C.bg});
  s.text(64,80,'Components',{size:32,w:700});
  const sec=(y,t)=>s.text(64,y,t,{size:18,w:700});
  sec(140,'Buttons'); let x=64; x+=button(s,x,160,'Create test plan',{kind:'primary'})+16; x+=button(s,x,160,'Adjust plan')+16; x+=button(s,x,160,'Cancel run',{kind:'danger'})+16;
  s.g('Button / disabled',()=>{ s.parts.push('<g opacity="0.5">'); button(s,x,160,'Approve & run on LambdaTest',{kind:'primary'}); s.parts.push('</g>'); });
  sec(250,'Run status badges'); x=64;
  let by=270; [['Starting','wait'],['Planning…','wait'],['Awaiting approval','wait'],['Running tests…','wait'],['Complete','ok'],['Planning failed','bad'],['Run failed','bad'],['Cancelled','bad']].forEach(([t,k])=>{ const ww=tw(t,13,600)+24+(t.endsWith('…')?18:0); if(x+ww>760){x=64;by+=34;} x+=badge(s,x,by,t,k,{spinner:t.endsWith('…')})+10; });
  sec(374,'Test result badges'); x=64;
  [['Passed','ok'],['Failed','bad'],['Blocked','info'],['Flaky','wait']].forEach(([t,k])=>{ x+=badge(s,x,394,t,k)+10; });
  sec(464,'Environment pills'); x=64;
  let py=484; [['Claude Code 2.4','ok'],['QA agent plugin','ok'],['LambdaTest keys (env)','ok'],['No LambdaTest keys: plan only','bad'],['Server offline','bad']].forEach(([t,k])=>{ const ww=tw(t,13)+20; if(x+ww>760){x=64;py+=30;} x+=pill(s,x,py,t,k)+10; });
  sec(574,'Inputs'); input(s,64,590,220,'Website URL',{placeholder:'https://staging.example.com'}); input(s,300,590,220,'Website URL (focus)',{value:'https://shop-uat.example.com',focus:true}); input(s,536,590,220,'Environment',{value:'Staging / UAT',select:true});
  sec(720,'Checkboxes & device tier'); checkbox(s,64,740,'Smoke',true); checkbox(s,200,740,'Regression',false);
  [['Core phones','Latest iPhone, Galaxy S, Pixel',true],['Broad mobile','~20 real phones & tablets',false]].forEach(([t,d,on],i)=>{
    const tx=64+i*240,ty=780; s.g(`Device tier / ${on?'selected':'default'}`,()=>{ s.rect(tx,ty,220,70,{fill:on?C.warnBg:C.card,stroke:on?C.accent:C.border,r:8}); radio(s,tx+10,ty+12,on); s.text(tx+34,ty+25,t,{size:15,w:700}); s.text(tx+10,ty+52,d,{size:13,fill:C.muted}); });
  });
  sec(900,'Progress steps'); steps(s,64,920,700,2);
  s.text(64,990,'States: done (green ✓) · active (amber border) · to do (outline)',{size:13,fill:C.muted});
  // tabs + log
  s.text(820,140,'Document tabs',{size:18,w:700});
  s.g('Tabs',()=>{ let tx=820; [['Report',false],['Test plan',true],['Test cases',false],['Cases (table)',false]].forEach(([t,on])=>{ const w=tw(t,15,on?600:400)+20; s.text(tx+10,180,t,{size:15,w:on?600:400}); if(on) s.rect(tx,192,w,2,{fill:C.accent}); tx+=w+4; }); s.line(820,194,1376,194); });
  s.text(820,250,'Run row (Runs list)',{size:18,w:700});
  runRow(s,820,268,556,'https://staging.example.com','14 Nov 2026, 10:42',['Awaiting approval','wait']);
  s.text(820,370,'Live agent log',{size:18,w:700});
  logBox(s,820,388,556,200);
  s.text(820,630,'File list',{size:18,w:700}); fileList(s,820,646,556);
  s.save('02-components.svg');
})();

function runRow(s,x,y,w,url,date,[label,kind]){
  s.g(`Run row / ${url}`,()=>{ s.rect(x,y,w,64,{fill:C.card,stroke:C.border,r:8}); s.text(x+10,y+24,url,{size:15,w:600}); s.text(x+10,y+49,date+' · ',{size:13,fill:C.muted}); badge(s,x+10+tw(date+' · ',13),y+32,label,kind); });
}
function logBox(s,x,y,w,h,n=9){
  s.g('Live agent log',()=>{ s.rect(x,y,w,h,{fill:C.code,r:6});
    const lines=['[10:42:03] Brief written: intake.md','[10:42:05] Mode B: credentials found, scripts + REST API','[10:42:09] Loading lambdatest-qa:lt-test-cases','[10:43:31] Wrote test-cases.md (64 cases)','[10:43:58] Wrote test-plan.md','[10:44:01] Waiting for approval…','[10:51:12] Smoke gate: 12/12 passed','[10:58:40] Functional: 31 passed, 2 failed','[11:04:22] Writing report.md'];
    lines.slice(0,n).forEach((l,i)=>{ const max=Math.floor((w-20)/6.7); s.text(x+10,y+22+i*17.4,l.length>max?l.slice(0,max-1)+'…':l,{size:12,fill:C.codeText,font:MONO}); });
  });
}
function fileList(s,x,y,w,n=7){
  s.g('File list',()=>[['intake.md','View'],['test-cases.md','View'],['test-cases.csv','Download'],['test-plan.md','View'],['report.md','View'],['report.xlsx','Download'],['report.pdf','Download']].slice(0,n).forEach(([n,a],i)=>{
    const yy=y+i*31; s.text(x,yy+20,n,{size:13}); s.text(x+w,yy+20,a,{size:13,fill:C.text,anchor:'end'}); s.line(x,yy+30,x+w,yy+30);
  }));
}

// ---------- intake form (shared by desktop + mobile) ----------
function intakeForm(s,x,y,w,{mobile=false}={}){
  let cy=y;
  s.text(x,cy+22,'New test run',{size:22,w:700}); cy+=34;
  cy+=s.para(x,cy,'Enter a website. The agent writes test cases and a test plan, waits for your approval, runs the tests on LambdaTest real devices and writes the report.',w,{size:15,fill:C.muted})+16;
  const fw=w, ix=x+14, iw=w-28;
  // 1 Website
  let h=0; const f1y=cy;
  const body1=()=>{ let yy=f1y+16; yy+=input(s,ix,yy,iw,'Website URL',{value:'https://staging.example.com'});
    if (mobile){ yy+=input(s,ix,yy,iw,'Environment',{value:'Staging / UAT',select:true}); yy+=input(s,ix,yy,iw,'Pages',{value:'Crawl from the homepage',select:true}); }
    else { const hw=(iw-12)/2; input(s,ix,yy,hw,'Environment',{value:'Staging / UAT',select:true}); yy+=input(s,ix+hw+12,yy,hw,'Pages',{value:'Crawl from the homepage',select:true}); }
    yy+=input(s,ix,yy,iw,'Critical (P0) flows',{placeholder:'Home → Search → Product → Cart → Checkout'});
    yy+=input(s,ix,yy,iw,'Requirements doc (optional)',{placeholder:'Paste acceptance criteria, or a file path / link to the BRD/PRD',h:58});
    return yy-f1y; };
  // measure by drawing into temp then re-insert with fieldset underneath
  const draw=(fn,legend)=>{ const mark=s.parts.length; const startY=cy; const hh=fn(); const inner=s.parts.splice(mark); s.parts.push(`<g id="${esc('Fieldset / '+legend)}">`); fieldset(s,x,startY,fw,hh,legend); s.parts.push(...inner,'</g>'); cy+=hh+18; };
  draw(body1,'1. Website');
  const f2y=cy;
  draw(()=>{ let yy=f2y+20; let cx=ix; const items=[['Smoke',1],['Functional',1],['UI (design vs live)',1],['Responsive / cross-browser',1],['Accessibility',1],['SEO',1],['Performance',0],['Sanity',0],['Regression',0]];
    items.forEach(([t,on])=>{ const ww=24+tw(t,15)+16; if(cx+ww>ix+iw){cx=ix;yy+=30;} checkbox(s,cx,yy,t,!!on); cx+=ww; });
    yy+=34; yy+=input(s,ix,yy,iw,'Design reference for UI testing (optional)',{placeholder:'Figma link or folder of PNG mockups'}); return yy-f2y; },'2. Test types');
  const f3y=cy;
  draw(()=>{ let yy=f3y+18; const tiers=[['Core phones','Latest iPhone, Galaxy S, Pixel',true],['Broad mobile','~20 real phones & tablets',false],['Phones + desktop','Adds Chrome, Edge, Safari',false],['Phones + desktop + iPad','Adds the latest iPad',false],['Custom list','Name the devices yourself',false]];
    const cols=mobile?1:3; const tw_=(iw-8*(cols-1))/cols; const th=mobile?58:72;
    tiers.forEach(([t,d,on],i)=>{ const c=i%cols,r=Math.floor(i/cols); const tx=ix+c*(tw_+8), ty=yy+r*(th+8);
      s.g(`Device tier / ${t}${on?' / selected':''}`,()=>{ s.rect(tx,ty,tw_,th,{fill:on?C.warnBg:C.card,stroke:on?C.accent:C.border,r:8}); radio(s,tx+10,ty+12,on); s.text(tx+34,ty+25,t,{size:15,w:700}); s.text(tx+10,ty+(mobile?46:54),d,{size:13,fill:C.muted}); }); });
    yy+=Math.ceil(tiers.length/cols)*(th+8)+8; checkbox(s,ix,yy,'Real devices only (no emulators)',true); yy+=30; return yy-f3y; },'3. Devices');
  s.g('Details / 4. More options (collapsed)',()=>{ s.rect(x,cy,fw,44,{fill:C.card,stroke:C.border,r:8}); s.path(`M${x+16} ${cy+16} l6 6 l-6 6`,{fill:C.text}); s.text(x+30,cy+27,'4. More options',{size:15,w:700}); }); cy+=58;
  const f5y=cy;
  draw(()=>{ let yy=f5y+20; let cx=ix; [['Excel',1],['PDF',1],['Word',0]].forEach(([t,on])=>{ cx+=checkbox(s,cx,yy,t,!!on)+20; }); yy+=32; s.text(ix,yy+10,'report.md is always written.',{size:13,fill:C.muted}); yy+=24; return yy-f5y; },'5. Report formats');
  checkbox(s,x,cy+4,'I own this site or am authorized to test it.',true); cy+=36;
  button(s,x,cy,'Create test plan',{kind:'primary',w:mobile?w:undefined}); cy+=40;
  return cy-y;
}
function runsCard(s,x,y,w){
  s.text(x,y+16,'Runs',{size:16,w:700});
  const runs=[['https://staging.example.com','14 Nov 2026, 10:42',['Awaiting approval','wait']],['https://shop-uat.example.com','13 Nov 2026, 16:05',['Complete','ok']],['https://blog-staging.example.com','13 Nov 2026, 11:20',['Running tests…','wait']],['https://localhost:3000','12 Nov 2026, 09:14',['Planning failed','bad']]];
  runs.forEach((r,i)=>runRow(s,x,y+32+i*72,w,...r));
  return 32+runs.length*72;
}

// ---------- 03 desktop home ----------
(function home(){
  const W=1440; const s=new Svg(W,1540,'03 New test run — Desktop');
  s.rect(0,0,W,1540,{fill:C.bg}); topbar(s,W);
  const mx=(W-1280)/2+16, cw=1248, lw=Math.round((cw-16)*3/5), rw=cw-16-lw;
  const mark=s.parts.length; const h=intakeForm(s,mx+18,56+20+18,lw-36); const inner=s.parts.splice(mark);
  s.g('Card / New test run',()=>{ s.rect(mx,76,lw,h+36,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...inner); });
  const m2=s.parts.length; const h2=runsCard(s,mx+lw+16+18,76+18,rw-36); const in2=s.parts.splice(m2);
  s.g('Card / Runs',()=>{ s.rect(mx+lw+16,76,rw,h2+36,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...in2); });
  s.h=76+h+36+40; s.parts[0]=`<rect x="0" y="0" width="${W}" height="${s.h}" rx="0" fill="${C.bg}"/>`;
  s.save('03-new-test-run-desktop.svg');
})();

// ---------- run detail ----------
function runDetail(s,x,y,w,{mobile=false,state='plan_ready'}={}){
  const cfg={ plan_ready:{badge:['Awaiting approval','wait'],step:1,msg:'Test plan ready: 64 cases across 6 test types on 3 real devices. Review it, then approve or ask for changes.',actions:[['Approve & run on LambdaTest','primary'],['Adjust plan','default'],['Cancel run','danger']]},
              done:{badge:['Complete','ok'],step:4,msg:'Run complete. 58 passed, 4 failed, 2 blocked. Recommendation: No-Go until DEF-001 and DEF-002 are fixed.',actions:[['Re-run tests','default']]} }[state];
  let cy=y;
  s.text(x,cy+16,'← All runs',{size:15,fill:C.muted}); cy+=30;
  const cardY=cy; const m=s.parts.length; let iy=cy+18; const ix=x+18, iw=w-36;
  s.text(ix,iy+22,'https://staging.example.com',{size:22,w:700}); s.text(ix,iy+46,'staging.example.com-2026-11-14',{size:13,fill:C.muted});
  const bl=cfg.badge; if(mobile){ badge(s,ix,iy+56,bl[0],bl[1]); iy+=90; } else { const bw=tw(bl[0],13,600)+24; badge(s,ix+iw-bw,iy+4,bl[0],bl[1]); iy+=56; }
  if (mobile){ // 2x2 steps
    const labels=['Plan','Approve','Run on LambdaTest','Report']; const sw=(iw-6)/2;
    s.g('Steps',()=>labels.forEach((l,i)=>{ const st=i<cfg.step?'done':i===cfg.step?'active':'todo'; const sx=ix+(i%2)*(sw+6), sy=iy+Math.floor(i/2)*42;
      s.rect(sx,sy,sw,36,{fill:st==='done'?C.okBg:st==='active'?C.warnBg:C.card,stroke:st==='done'?null:st==='active'?C.accent:C.border,r:6}); s.text(sx+sw/2,sy+23,(st==='done'?'✓ ':'')+l,{size:13,w:st==='active'?600:400,fill:st==='done'?C.ok:st==='active'?C.accentInk:C.muted,anchor:'middle'}); }));
    iy+=90; } else { steps(s,ix,iy,iw,cfg.step); iy+=50; }
  iy+=s.para(ix,iy,cfg.msg,iw,{size:15})+10;
  let ax=ix; cfg.actions.forEach(([t,k])=>{ const bw=tw(t,15,k==='primary'?600:400)+32; if(mobile&&ax+bw>ix+iw){ax=ix;iy+=48;} ax+=button(s,ax,iy,t,{kind:k})+8; }); iy+=40+18;
  const inner=s.parts.splice(m); s.g('Card / Run header',()=>{ s.rect(x,cardY,w,iy-cardY,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...inner); });
  cy=iy+16;
  const lw=mobile?w:Math.round((w-16)*3/5), rw=mobile?w:w-16-lw;
  // doc card
  const dy=cy; const m2=s.parts.length; let dyy=dy+18; const dx=x+18, dw=lw-36;
  s.g('Tabs',()=>{ let tx=dx; const on=state==='done'?'Report':'Test plan'; ['Report','Test plan','Test cases','Cases (table)'].filter(t=>state==='done'||t!=='Report').forEach(t=>{ const isOn=t===on; const ww=tw(t,15,isOn?600:400)+20; if(mobile&&tx+ww>dx+dw) return; s.text(tx+10,dyy+22,t,{size:15,w:isOn?600:400}); if(isOn) s.rect(tx,dyy+34,ww,2,{fill:C.accent}); tx+=ww+4; }); s.line(dx,dyy+36,dx+dw,dyy+36); });
  dyy+=52;
  dyy=docContent(s,dx,dyy,dw,state,mobile);
  const in2=s.parts.splice(m2); s.g('Card / Documents',()=>{ s.rect(x,dy,lw,dyy-dy+18,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...in2); });
  const rx=mobile?x:x+lw+16, ry=mobile?dyy+18+16:dy;
  const m3=s.parts.length; let r=ry+18; s.text(rx+18,r+16,'Files',{size:16,w:700}); r+=30; const nf=state==='done'?7:4; fileList(s,rx+18,r,rw-36,nf); r+=nf*31+24; s.text(rx+18,r+16,'Live agent log',{size:16,w:700}); r+=30; logBox(s,rx+18,r,rw-36,mobile?140:420,state==='done'?9:6); r+=(mobile?140:420)+18;
  const in3=s.parts.splice(m3); s.g('Card / Files & log',()=>{ s.rect(rx,ry,rw,r-ry,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...in3); });
  return Math.max(dyy+18, r)-y;
}
function docContent(s,x,y,w,state,mobile){
  const h=(t,sz=18)=>{ s.text(x,y+sz,t,{size:sz,w:700}); y+=sz+14; };
  const p=(t)=>{ y+=s.para(x,y,t,w,{size:15})+10; };
  const table=(cols,rows,widths)=>{ const tot=widths.reduce((a,b)=>a+b,0); const ws=widths.map(v=>v/tot*w);
    s.g('Table',()=>{ [cols,...rows].forEach((row,ri)=>{ let cx=x; row.forEach((cell,ci)=>{ s.rect(cx,y,ws[ci],28,{fill:ri===0?C.bg:C.card,stroke:C.border});
      const isB=typeof cell==='object'; if(isB) badge(s,cx+6,y+1,cell[0],cell[1],{size:12}); else s.text(cx+8,y+19,cell,{size:13,w:ri===0?600:400}); cx+=ws[ci]; }); y+=28; }); }); y+=14; };
  if (state==='done'){
    h('Test report: staging.example.com',20);
    s.g('Go / No-Go',()=>{ s.rect(x,y,w,52,{fill:C.badBg,r:8}); s.text(x+14,y+32,'Recommendation: NO-GO, 2 critical defects open',{size:15,w:700,fill:C.bad}); }); y+=68;
    const stats=[['64','Total'],['58','Passed'],['4','Failed'],['2','Blocked']]; const sw=(w-24)/4;
    stats.forEach(([n,l],i)=>s.g(`Stat / ${l}`,()=>{ const sx=x+i*(sw+8); s.rect(sx,y,sw,70,{fill:C.bg,r:8}); s.text(sx+12,y+34,n,{size:24,w:700,fill:i===2?C.bad:i===1?C.ok:C.text}); s.text(sx+12,y+56,l,{size:13,fill:C.muted}); })); y+=86;
    h('Results by test type',16);
    table(['Type','Passed','Failed','Blocked'],[['Smoke','12','0','0'],['Functional','31','2','0'],['UI','6','1','1'],['Accessibility','5','1','0'],['SEO','4','0','1']],[3,1,1,1]);
    h('Defects',16);
    table(['ID','Title','Severity'],[['DEF-001','Checkout button hidden on iPhone',['Critical','bad']],['DEF-002','Coupon field rejects valid code',['Critical','bad']],['DEF-003','Footer contrast 3.1:1',['Major','wait']]],mobile?[2,5,2.4]:[1.2,5,1.5]);
  } else {
    h('Test plan: staging.example.com',20);
    p('Scope: homepage crawl, P0 flow Home → Search → Product → Cart → Checkout. Mode B (LambdaTest scripts + REST API).');
    h('Test types and order',16);
    table(['#','Type','Cases','Devices'],[['1','Smoke (gate)','12','3'],['2','Functional','33','3'],['3','UI (design vs live)','8','3'],['4','Responsive / cross-browser','—','3'],['5','Accessibility (WCAG 2.2 AA)','6','2'],['6','SEO','5','1']],mobile?[0.6,4,1.2,1.4]:[0.5,5,1,1]);
    h('Devices',16);
    if (mobile) table(['Device','OS','Type'],[['iPhone (latest)','iOS','Real'],['Galaxy S (latest)','Android','Real'],['Pixel (latest)','Android','Real']],[3,1.6,1]);
    else table(['Device','OS','Type'],[['iPhone (latest)','iOS, resolved at run','Real'],['Galaxy S (latest)','Android, resolved at run','Real'],['Pixel (latest)','Android, resolved at run','Real']],[3,3.6,1]);
    h('Thresholds',16);
    p('LCP < 2.5 s · CLS < 0.1 · INP < 200 ms · Lighthouse ≥ 80 · WCAG 2.2 AA · visual diff ≤ 0.5%');
    h('Assumptions',16);
    p('No test account was given, so login flows are marked Blocked. Results are Passed / Failed / Blocked / Flaky.');
  }
  return y;
}
(function detail(){
  for (const state of ['plan_ready','done']){
    const W=1440; const s=new Svg(W,2000,`04 Run detail — ${state==='done'?'Report ready':'Awaiting approval'} — Desktop`);
    s.rect(0,0,W,2000,{fill:C.bg}); topbar(s,W);
    const mx=(W-1280)/2+16; const h=runDetail(s,mx,76,1248,{state});
    s.h=76+h+40; s.parts[0]=`<rect x="0" y="0" width="${W}" height="${s.h}" rx="0" fill="${C.bg}"/>`;
    s.save(state==='done'?'05-run-report-ready-desktop.svg':'04-run-awaiting-approval-desktop.svg');
  }
})();

// ---------- mobile ----------
(function mobile(){
  const W=375;
  { const s=new Svg(W,3000,'06 New test run — Mobile'); s.rect(0,0,W,3000,{fill:C.bg}); topbar(s,W,{mobile:true});
    const m=s.parts.length; const h=intakeForm(s,16+16,92+16+16,W-64,{mobile:true}); const inner=s.parts.splice(m);
    s.g('Card / New test run',()=>{ s.rect(16,108,W-32,h+32,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...inner); });
    let y=108+h+32+16; const m2=s.parts.length; const h2=runsCard(s,32,y+16,W-64); const in2=s.parts.splice(m2);
    s.g('Card / Runs',()=>{ s.rect(16,y,W-32,h2+32,{fill:C.card,stroke:C.border,r:10}); s.parts.push(...in2); });
    s.h=y+h2+32+24; s.parts[0]=`<rect x="0" y="0" width="${W}" height="${s.h}" rx="0" fill="${C.bg}"/>`;
    s.save('06-new-test-run-mobile.svg'); }
  { const s=new Svg(W,3000,'07 Run detail — Mobile'); s.rect(0,0,W,3000,{fill:C.bg}); topbar(s,W,{mobile:true});
    const h=runDetail(s,16,108,W-32,{mobile:true,state:'plan_ready'});
    s.h=108+h+24; s.parts[0]=`<rect x="0" y="0" width="${W}" height="${s.h}" rx="0" fill="${C.bg}"/>`;
    s.save('07-run-awaiting-approval-mobile.svg'); }
})();
console.log(fs.readdirSync(OUT).join('\n'));
