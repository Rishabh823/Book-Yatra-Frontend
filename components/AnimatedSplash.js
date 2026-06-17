import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

const SPLASH_MS = 6500;
const FADE_MS = 600;

// Read from assets at build time via inline require
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<title>TripKart</title>
<style>
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { width:100%; height:100%; background:#7C2D12; }
  body { width:100%; height:100%; overflow:hidden; background:#7C2D12; touch-action:none; -webkit-tap-highlight-color:transparent; }
  canvas { position:fixed; top:0; left:0; width:100vw; height:100vh; height:100dvh; display:block; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
const cv = document.getElementById('c');
const cx = cv.getContext('2d');
let W, H, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width  = W * DPR;
  cv.height = H * DPR;
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
resize();
window.addEventListener('resize', resize);

const T = { busDone:3200, pause:3800, logo:4800, pin:5000, barDone:6400 };
const START = performance.now();

let busX = 0;
let wheelAngle = 0;
let dashOff = 0;
let logoAlpha = 0, logoScale = 0.72;
let barW = 0;
let pinAlpha = 0, pinBounce = 0, pinDir = 1;
let dustSpawnTimer = 0;

const dustArr = [];
function spawnDust(x, y) {
  for (let i = 0; i < 5; i++) {
    dustArr.push({
      x, y,
      vx: -(0.8 + Math.random()*1.8),
      vy: -(0.3 + Math.random()*1.2),
      r:  3 + Math.random()*6,
      life: 1,
      decay: 0.022 + Math.random()*0.015,
    });
  }
}

let trees = [];
function initTrees() {
  trees = [];
  for (let i = 0; i < 18; i++) {
    trees.push({ x: i * (W / 8), size: 0.6 + Math.random()*0.5 });
  }
}

const lerp = (a,b,t) => a + (b-a)*t;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const easeOut3 = t => 1 - Math.pow(1-t, 3);
const easeOut5 = t => 1 - Math.pow(1-t, 5);
const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,  x+w,y+h, r);
  ctx.arcTo(x+w,y+h,x,  y+h, r);
  ctx.arcTo(x,  y+h,x,  y,   r);
  ctx.arcTo(x,  y,  x+w,y,   r);
  ctx.closePath();
}

function drawBG() {
  const g = cx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   '#4A1506');
  g.addColorStop(0.4, '#7C2D12');
  g.addColorStop(1,   '#EA580C');
  cx.fillStyle = g;
  cx.fillRect(0, 0, W, H);
  const sg = cx.createRadialGradient(W*.5, H*.1, 0, W*.5, H*.1, H*.4);
  sg.addColorStop(0, 'rgba(253,186,116,0.22)');
  sg.addColorStop(1, 'rgba(124,45,18,0)');
  cx.fillStyle = sg;
  cx.fillRect(0, 0, W, H);
}

function drawMountains() {
  const base = H * 0.58;
  cx.fillStyle = 'rgba(60,18,6,0.55)';
  [[0,0],[0.12,0.11],[0.25,0.04],[0.4,0.14],[0.55,0.03],[0.7,0.12],[0.85,0.06],[1,0.08]].forEach(([px,poff], i, arr) => {
    if (i === 0) return;
    const prev = arr[i-1];
    cx.beginPath();
    cx.moveTo(prev[0]*W, base);
    cx.lineTo((prev[0]+px)/2*W, base - poff*H*0.32);
    cx.lineTo(px*W, base);
    cx.fill();
  });
  cx.fillStyle = 'rgba(90,26,8,0.48)';
  cx.beginPath(); cx.ellipse(W*.18, base+8, W*.22, H*.08, 0, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(W*.72, base+8, W*.28, H*.09, 0, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(W*.5,  base+4, W*.2,  H*.07, 0, 0, Math.PI*2); cx.fill();
}

function drawRoad() {
  const ry = H * 0.58;
  const rg = cx.createLinearGradient(0, ry, 0, H);
  rg.addColorStop(0, '#3D1404');
  rg.addColorStop(1, '#1C0800');
  cx.fillStyle = rg;
  cx.fillRect(0, ry, W, H - ry);
  cx.strokeStyle = 'rgba(234,88,12,0.45)';
  cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(0,ry); cx.lineTo(W,ry); cx.stroke();
}

function drawDashes() {
  const DW = W * 0.1, DH = H * 0.012, GAP = W * 0.12;
  const dy = H * 0.58 + (H - H*0.58)*0.48;
  cx.fillStyle = 'rgba(234,88,12,0.30)';
  cx.beginPath();
  for (let x = -dashOff; x < W + DW; x += DW + GAP) {
    rr(cx, x, dy - DH/2, DW, DH, DH/2);
    cx.fill();
    cx.beginPath();
  }
}

function drawTrees() {
  const ground = H * 0.58;
  trees.forEach(t => {
    const th = H * 0.09 * t.size;
    const tw = W  * 0.035 * t.size;
    cx.fillStyle = '#3D1404';
    cx.fillRect(t.x - tw*0.18, ground - th*0.4, tw*0.36, th*0.4);
    cx.fillStyle = 'rgba(80,24,6,0.72)';
    cx.beginPath();
    cx.moveTo(t.x, ground - th);
    cx.lineTo(t.x - tw, ground - th*0.35);
    cx.lineTo(t.x + tw, ground - th*0.35);
    cx.closePath(); cx.fill();
    cx.fillStyle = 'rgba(100,30,8,0.55)';
    cx.beginPath();
    cx.moveTo(t.x, ground - th*0.75);
    cx.lineTo(t.x - tw*0.8, ground - th*0.15);
    cx.lineTo(t.x + tw*0.8, ground - th*0.15);
    cx.closePath(); cx.fill();
  });
}

function drawWheel(wx, wy, wr) {
  const tg = cx.createRadialGradient(wx-wr*.28, wy-wr*.28, wr*.04, wx, wy, wr);
  tg.addColorStop(0, '#78350F'); tg.addColorStop(1, '#1C0800');
  cx.fillStyle = tg;
  cx.beginPath(); cx.arc(wx, wy, wr, 0, Math.PI*2); cx.fill();
  cx.strokeStyle = 'rgba(120,53,15,0.5)'; cx.lineWidth = wr*.08;
  cx.beginPath(); cx.arc(wx, wy, wr*.88, 0, Math.PI*2); cx.stroke();
  cx.fillStyle = '#140500';
  cx.beginPath(); cx.arc(wx, wy, wr*.56, 0, Math.PI*2); cx.fill();
  cx.fillStyle = '#2A0900';
  cx.beginPath(); cx.arc(wx, wy, wr*.36, 0, Math.PI*2); cx.fill();
  cx.save();
  cx.translate(wx, wy); cx.rotate(wheelAngle);
  cx.strokeStyle = '#78350F'; cx.lineWidth = Math.max(1.5, wr*.08); cx.lineCap = 'round';
  for (let i=0; i<4; i++) {
    const a = i * Math.PI/2;
    cx.beginPath();
    cx.moveTo(Math.cos(a)*wr*.16, Math.sin(a)*wr*.16);
    cx.lineTo(Math.cos(a)*wr*.52, Math.sin(a)*wr*.52);
    cx.stroke();
  }
  cx.restore();
  cx.fillStyle = '#EA580C';
  cx.beginPath(); cx.arc(wx, wy, wr*.13, 0, Math.PI*2); cx.fill();
  cx.fillStyle = 'rgba(255,247,237,0.15)';
  cx.beginPath(); cx.arc(wx-wr*.3, wy-wr*.3, wr*.22, 0, Math.PI*2); cx.fill();
}

function drawBus(bx) {
  const ground = H * 0.58;
  const BW = W * 0.82;
  const BH = BW * 0.38;
  const WR = BH * 0.295;
  const by = ground - WR * 0.12;
  const bt = by - BH;

  cx.save(); cx.globalAlpha = 0.3;
  cx.fillStyle = '#0A0200';
  cx.beginPath(); cx.ellipse(bx + BW*.46, ground+5, BW*.42, BH*.06, 0, 0, Math.PI*2); cx.fill();
  cx.restore();

  const bodyG = cx.createLinearGradient(bx, bt, bx, by);
  bodyG.addColorStop(0, '#FFFFFF'); bodyG.addColorStop(1, '#FFE4CC');
  cx.fillStyle = bodyG;
  rr(cx, bx, bt, BW, BH, BH*.065); cx.fill();

  const roofH = BH * .28;
  cx.save(); rr(cx, bx, bt, BW, BH, BH*.065); cx.clip();
  const roofG = cx.createLinearGradient(0, bt, 0, bt+roofH);
  roofG.addColorStop(0, '#F97316'); roofG.addColorStop(1, '#EA580C');
  cx.fillStyle = roofG; cx.fillRect(bx, bt, BW, roofH); cx.restore();

  const FW = BW * 0.085;
  cx.save();
  cx.beginPath();
  cx.moveTo(bx+BW-FW, bt);
  cx.quadraticCurveTo(bx+BW, bt, bx+BW, bt+BH*.14);
  cx.lineTo(bx+BW, by); cx.lineTo(bx+BW-FW, by); cx.closePath();
  const frontG = cx.createLinearGradient(bx+BW-FW, 0, bx+BW, 0);
  frontG.addColorStop(0,'#FED7AA'); frontG.addColorStop(1,'#FDBA74');
  cx.fillStyle = frontG; cx.fill(); cx.restore();

  const wsX = bx+BW-FW*.9, wsY = bt+roofH*.72, wsW = FW*.72, wsH = BH*.4;
  cx.save(); cx.beginPath(); rr(cx, wsX, wsY, wsW, wsH, 5); cx.clip();
  const wsG = cx.createLinearGradient(wsX, wsY, wsX, wsY+wsH);
  wsG.addColorStop(0,'#BAE6FD'); wsG.addColorStop(1,'#7DD3FC');
  cx.fillStyle = wsG; cx.fillRect(wsX, wsY, wsW, wsH);
  cx.fillStyle = 'rgba(255,255,255,0.26)';
  cx.beginPath(); cx.moveTo(wsX+4, wsY+4); cx.lineTo(wsX+wsW*.65, wsY+4); cx.lineTo(wsX+4, wsY+wsH*.6); cx.closePath(); cx.fill();
  cx.restore();

  const nW = 4, wW = BW*.12, wH = BH*.30, wY = bt+roofH*.72;
  for (let i=0; i<nW; i++) {
    const wx2 = bx + BW*.042 + i*(wW + BW*.032);
    cx.save(); cx.beginPath(); rr(cx, wx2, wY, wW, wH, 5); cx.clip();
    const wg = cx.createLinearGradient(wx2, wY, wx2, wY+wH);
    wg.addColorStop(0,'#BAE6FD'); wg.addColorStop(1,'#7DD3FC');
    cx.fillStyle = wg; cx.fillRect(wx2, wY, wW, wH);
    cx.fillStyle = 'rgba(255,255,255,0.20)'; cx.fillRect(wx2, wY, wW, wH*.28);
    cx.restore();
    cx.strokeStyle = 'rgba(234,88,12,0.18)'; cx.lineWidth = 1.5;
    cx.beginPath(); rr(cx, wx2, wY, wW, wH, 5); cx.stroke();
  }

  cx.strokeStyle = 'rgba(234,88,12,0.22)'; cx.lineWidth = BH*.018;
  cx.beginPath(); cx.moveTo(bx, bt+BH*.6); cx.lineTo(bx+BW-FW*.3, bt+BH*.6); cx.stroke();

  const dX = bx+BW*.80, dY = bt+BH*.52, dW = BW*.062, dH = BH*.46;
  cx.save(); cx.beginPath(); rr(cx, dX, dY, dW, dH, 4);
  cx.fillStyle = '#FDDCB5'; cx.fill();
  cx.strokeStyle = '#EA580C'; cx.lineWidth = 2; cx.stroke(); cx.restore();
  cx.fillStyle = '#EA580C';
  cx.beginPath(); rr(cx, dX+dW*.15, dY+dH*.42, dW*.2, dH*.26, 3); cx.fill();

  const hlX = bx+BW-FW*.15, hlY = by-BH*.27;
  const hlg = cx.createRadialGradient(hlX, hlY, 0, hlX, hlY, BH*.1);
  hlg.addColorStop(0,'#FFF7ED'); hlg.addColorStop(1,'rgba(253,186,116,0)');
  cx.fillStyle = hlg;
  cx.beginPath(); cx.ellipse(hlX, hlY, BH*.1, BH*.062, 0, 0, Math.PI*2); cx.fill();
  cx.fillStyle = 'rgba(255,247,237,0.9)';
  cx.beginPath(); cx.ellipse(hlX, hlY, BH*.05, BH*.032, 0, 0, Math.PI*2); cx.fill();

  cx.save(); cx.globalAlpha = 0.06;
  const beamG = cx.createRadialGradient(hlX, hlY, 0, hlX+BW*.18, hlY, BW*.22);
  beamG.addColorStop(0,'#FFF7ED'); beamG.addColorStop(1,'rgba(255,247,237,0)');
  cx.fillStyle = beamG;
  cx.beginPath(); cx.moveTo(hlX, hlY); cx.lineTo(hlX+BW*.28, hlY-BH*.2); cx.lineTo(hlX+BW*.28, hlY+BH*.2); cx.closePath(); cx.fill();
  cx.restore();

  cx.fillStyle = '#EF4444';
  cx.beginPath(); rr(cx, bx+2, by-BH*.42, 7, BH*.22, 3); cx.fill();
  cx.fillStyle = '#C2410C';
  cx.beginPath(); rr(cx, bx+BW-FW, by-9, FW, 10, 3); cx.fill();
  cx.fillStyle = 'rgba(194,65,12,0.6)';
  cx.fillRect(bx, by-9, BW-FW, 9);

  drawWheel(bx + BW*.175, ground - WR*.1, WR);
  drawWheel(bx + BW*.745, ground - WR*.1, WR);

  cx.save(); cx.globalAlpha = 0.55;
  cx.fillStyle = '#EA580C';
  const fs = BH * 0.13;
  cx.font = '900 ' + fs + 'px "Arial Black", Arial, sans-serif';
  cx.textBaseline = 'middle'; cx.textAlign = 'left';
  cx.fillText('Trip', bx + BW*.28, bt + BH*.77);
  cx.fillStyle = '#FDBA74';
  cx.fillText('K', bx + BW*.28 + cx.measureText('Trip').width, bt + BH*.77);
  cx.fillStyle = '#EA580C';
  cx.fillText('art', bx + BW*.28 + cx.measureText('TripK').width, bt + BH*.77);
  cx.restore();
}

function updateDust(dt) {
  for (let i = dustArr.length-1; i >= 0; i--) {
    const d = dustArr[i];
    d.x += d.vx * dt * 0.055;
    d.y += d.vy * dt * 0.055;
    d.life -= d.decay * (dt/16);
    if (d.life <= 0) { dustArr.splice(i,1); continue; }
    cx.save(); cx.globalAlpha = d.life * 0.5;
    cx.fillStyle = '#FDBA74';
    cx.beginPath(); cx.arc(d.x, d.y, d.r, 0, Math.PI*2); cx.fill();
    cx.restore();
  }
}

function drawLogo(alpha, scale) {
  if (alpha <= 0) return;
  cx.save();
  cx.globalAlpha = alpha;
  cx.translate(W/2, H*.42);
  cx.scale(scale, scale);

  const lg = cx.createRadialGradient(0, 0, 0, 0, 0, W*.52);
  lg.addColorStop(0, 'rgba(253,186,116,0.28)');
  lg.addColorStop(1, 'rgba(124,45,18,0)');
  cx.fillStyle = lg;
  cx.beginPath(); cx.arc(0, 0, W*.52, 0, Math.PI*2); cx.fill();

  const iw = W*.22, ih = iw*.38;
  const ix = -iw/2, iy = -ih*3.4;
  cx.fillStyle = '#EA580C';
  cx.beginPath(); rr(cx, ix, iy, iw, ih, ih*.12); cx.fill();
  cx.fillStyle = '#C2410C';
  cx.beginPath(); rr(cx, ix+iw*.02, iy-ih*.32, iw*.96, ih*.36, ih*.08); cx.fill();
  cx.fillStyle = '#BAE6FD';
  for (let i=0; i<3; i++) { cx.beginPath(); rr(cx, ix+iw*.06+i*(iw*.28), iy+ih*.08, iw*.22, ih*.42, 3); cx.fill(); }
  cx.fillStyle = '#1C0800';
  cx.beginPath(); cx.arc(ix+iw*.25, iy+ih, iw*.095, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.arc(ix+iw*.75, iy+ih, iw*.095, 0, Math.PI*2); cx.fill();

  const fs = Math.min(W*.135, H*.075);
  cx.font = '900 ' + fs + 'px "Arial Black", Arial, sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.save(); cx.globalAlpha = 0.25; cx.fillStyle = '#1C0800'; cx.fillText('TripKart', 2, 2); cx.restore();

  const tW = cx.measureText('Trip').width;
  const kW = cx.measureText('K').width;
  const aW = cx.measureText('art').width;
  const total = tW + kW + aW;
  cx.fillStyle = '#FFFFFF'; cx.fillText('Trip', -total/2 + tW/2, 0);
  cx.fillStyle = '#FDBA74'; cx.fillText('K',    -total/2 + tW + kW/2, 0);
  cx.fillStyle = '#FFFFFF'; cx.fillText('art',  -total/2 + tW + kW + aW/2, 0);

  const tsz = Math.min(W*.032, H*.018, 15);
  cx.font = '500 ' + tsz + 'px Arial, sans-serif';
  cx.fillStyle = 'rgba(255,247,237,0.55)';
  cx.fillText('YOUR BUS  ·  YOUR TRIP', 0, fs*.78);
  cx.restore();
}

function drawPin(alpha, bob) {
  if (alpha <= 0) return;
  const pr = Math.min(W*.065, H*.038);
  const px2 = W*.78, py2 = H*.16 + bob;
  cx.save(); cx.globalAlpha = alpha;
  const pg = cx.createRadialGradient(px2, py2, 0, px2, py2, pr*2.8);
  pg.addColorStop(0,'rgba(234,88,12,0.25)'); pg.addColorStop(1,'rgba(234,88,12,0)');
  cx.fillStyle = pg; cx.beginPath(); cx.arc(px2, py2, pr*2.8, 0, Math.PI*2); cx.fill();
  cx.fillStyle = '#FFF7ED';
  cx.beginPath(); cx.arc(px2, py2, pr, 0, Math.PI*2); cx.fill();
  cx.strokeStyle = '#EA580C'; cx.lineWidth = pr*.18; cx.stroke();
  cx.beginPath();
  cx.moveTo(px2-pr*.68, py2+pr*.12);
  cx.lineTo(px2, py2+pr*1.55);
  cx.lineTo(px2+pr*.68, py2+pr*.12);
  cx.fillStyle = '#FFF7ED'; cx.fill();
  cx.strokeStyle = '#EA580C'; cx.lineWidth = pr*.18; cx.stroke();
  const bs = pr*.55;
  cx.fillStyle = '#EA580C';
  cx.beginPath(); rr(cx, px2-bs, py2-bs*.45, bs*2, bs*.7, 3); cx.fill();
  cx.fillStyle = '#C2410C';
  cx.beginPath(); rr(cx, px2-bs*.9, py2-bs*1.05, bs*1.8, bs*.65, 2); cx.fill();
  cx.fillStyle = '#BAE6FD';
  rr(cx, px2-bs*.8, py2-bs*.42, bs*.45, bs*.36, 2); cx.fill();
  rr(cx, px2-bs*.2, py2-bs*.42, bs*.45, bs*.36, 2); cx.fill();
  cx.fillStyle='#1C0800';
  cx.beginPath(); cx.arc(px2-bs*.45, py2+bs*.32, bs*.22, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.arc(px2+bs*.38, py2+bs*.32, bs*.22, 0, Math.PI*2); cx.fill();
  cx.restore();
}

function drawBar(progress, alpha) {
  if (alpha <= 0) return;
  const bw = W * .7, bh = Math.max(5, H*.008);
  const bx2 = W/2-bw/2, by2 = H*.84;
  cx.save(); cx.globalAlpha = alpha;
  cx.fillStyle = 'rgba(255,255,255,0.13)';
  cx.beginPath(); rr(cx, bx2, by2, bw, bh, bh/2); cx.fill();
  if (progress > 0.01) {
    const fg = cx.createLinearGradient(bx2, 0, bx2+bw, 0);
    fg.addColorStop(0,'#FDBA74'); fg.addColorStop(0.5,'#F97316'); fg.addColorStop(1,'#EA580C');
    cx.fillStyle = fg;
    cx.beginPath(); rr(cx, bx2, by2, bw*progress, bh, bh/2); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.55)';
    cx.beginPath(); cx.arc(bx2+bw*progress, by2+bh/2, bh*.8, 0, Math.PI*2); cx.fill();
  }
  const lsz = Math.min(W*.03, H*.016, 13);
  cx.font = '500 ' + lsz + 'px Arial, sans-serif';
  cx.fillStyle = 'rgba(255,247,237,0.5)';
  cx.textAlign = 'center'; cx.textBaseline = 'top';
  cx.fillText('LOADING YOUR TRIPS...', W/2, by2+bh+H*.014);
  cx.restore();
}

let lastNow = START;
initTrees();

function loop(now) {
  const elapsed = now - START;
  const dt = clamp(now - lastNow, 1, 50);
  lastNow = now;
  cx.clearRect(0, 0, W, H);
  const isDriving = elapsed < T.busDone;

  drawBG();
  drawMountains();

  if (isDriving) {
    const tp = elapsed / T.busDone;
    const speed = tp < 0.1 ? easeOut5(tp/0.1) : tp < 0.88 ? 1 : easeOut3((1-tp)/0.12);
    const eased = tp < 0.1 ? easeOut3(tp/0.1)*0.12 : 0.12 + (tp-0.1)/0.78*0.88;
    busX = -W*.86 + eased * (W*1.88);
    wheelAngle += speed * dt * 0.022;
    dashOff = (dashOff + speed * dt * 0.52) % (W*.22);
    trees.forEach(t => { t.x -= speed * dt * 0.28 * t.size; if (t.x + W*.04 < 0) t.x = W + W*.04; });
    drawRoad(); drawDashes(); drawTrees(); drawBus(busX);
    dustSpawnTimer += dt;
    if (dustSpawnTimer > 60 && speed > 0.3) {
      dustSpawnTimer = 0;
      spawnDust(busX + W*.82*.18, H*0.58 - 4);
    }
    updateDust(dt);
  } else {
    drawRoad(); updateDust(dt);
  }

  if (elapsed >= T.pause) {
    const lt = clamp((elapsed - T.pause) / (T.logo - T.pause), 0, 1);
    logoAlpha = easeOut5(lt);
    logoScale = lerp(0.72, 1.0, easeOut5(lt));
    drawLogo(logoAlpha, logoScale);
  }

  if (elapsed >= T.pin) {
    const pt = clamp((elapsed - T.pin) / 700, 0, 1);
    pinAlpha = easeOut5(pt);
    pinBounce += pinDir * dt * 0.028;
    if (Math.abs(pinBounce) > 6) pinDir *= -1;
    drawPin(pinAlpha, pinBounce);
  }

  if (elapsed >= T.logo) {
    const bt2 = clamp((elapsed - T.logo) / (T.barDone - T.logo), 0, 1);
    barW = easeInOut(bt2);
    const ba = clamp((elapsed - T.logo) / 400, 0, 1);
    drawBar(barW, ba);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
</script>
</body>
</html>`;

export default function AnimatedSplash({ onFinish }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // On web, WebView is unsupported — skip immediately
    if (Platform.OS === "web") {
      onFinish?.();
      return;
    }
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => onFinish?.());
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (Platform.OS === "web") return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 9999 }]}>
      <WebView
        source={{ html: HTML }}
        style={styles.web}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType="hardware"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: "#7C2D12" },
});
