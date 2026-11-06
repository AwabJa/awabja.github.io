(()=>{'use strict';
/* Actual high-resolution runtime composites from the 18 self-hosted card illustrations. */
const cache=new Map(),PI=Math.PI,T=PI*2;
const metals={Common:'#aec4ce',Rare:'#8edbff',Epic:'#c4a3ff',Legendary:'#f8d490'};
const ready=im=>im?.complete&&im.naturalWidth>0;
function rgba(hex,a){let n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'}
function rand(n){let v=Math.sin(n*172.17+19.36)*31415.926;return v-Math.floor(v)}
function line(ctx,x,y,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function ring(ctx,x,y,r,color,angle=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(0,0,r,0,T);ctx.stroke();
 for(let i=0;i<8;i++){let a=i*T/8;line(ctx,Math.cos(a)*r*.79,Math.sin(a)*r*.79,Math.cos(a)*r*1.09,Math.sin(a)*r*1.09,color,2)}
 ctx.restore();
}
function glow(ctx,x,y,r,color){
 let g=ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,rgba(color,.5));g.addColorStop(.4,rgba(color,.17));g.addColorStop(1,rgba(color,0));
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,T);ctx.fill();
}
function spell(ctx,card,index){
 let mode=card.kind,h=card.hue;
 ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
 if(['attack','attackdraw','expose'].includes(mode)){
  for(let i=0;i<3;i++){
   ctx.beginPath();ctx.moveTo(-40,365+i*45);ctx.quadraticCurveTo(125,330+i*15,480,75+i*42);
   ctx.shadowColor=h;ctx.shadowBlur=13;ctx.strokeStyle=i===1?'#f1f1ff':h;ctx.lineWidth=i===1?6:3;ctx.stroke();
  }
 }else if(['chain','hex'].includes(mode)){
  ring(ctx,210,240,132,h,index*.25);ring(ctx,210,240,82,'#b9e8ff',-index*.3);
  for(let i=0;i<5;i++){
   let x=35+i*72,y=400-i*17;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+32,y-56);ctx.lineTo(x+16,y-87);ctx.lineTo(x+82,y-178);
   ctx.strokeStyle=i%2?h:'#d6eaff';ctx.lineWidth=4;ctx.shadowColor=h;ctx.shadowBlur=12;ctx.stroke();
  }
 }else if(['guard','riposte','defend'].includes(mode)){
  ring(ctx,213,260,158,h,index*.15);ring(ctx,213,260,102,'#fae4c7',index*.19);
  ctx.strokeStyle='#fff1d4';ctx.lineWidth=4;ctx.beginPath();
  for(let i=0;i<6;i++){const a=i*T/6-PI/2;const x=213+Math.cos(a)*122,y=260+Math.sin(a)*143;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
  ctx.closePath();ctx.stroke();
 }else if(['heal','healall'].includes(mode)){
  for(let i=0;i<8;i++){let x=27+i*55;
   let g=ctx.createLinearGradient(x,45,x,485);g.addColorStop(0,'#ffffff00');g.addColorStop(.48,rgba(h,.65));g.addColorStop(1,'#ffffff00');
   line(ctx,x,60,x-23,480,g,3);
  }
  ring(ctx,211,260,136,h,index*.1);
 }else if(['bargain','area','ignite'].includes(mode)){
  ring(ctx,213,271,139,h,index*.18);
  for(let j=0;j<27;j++){let a=j*T/27+index*.15,r=80+rand(j*41+index)*170,x=209+Math.cos(a)*r,y=261+Math.sin(a)*r*.83;
   ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=j%4===0?'#fff0db':h;ctx.globalAlpha=.25+.55*rand(j*7+index);
   ctx.beginPath();ctx.moveTo(0,-12);ctx.bezierCurveTo(8,-12,14,0,0,14);ctx.bezierCurveTo(-14,0,-8,-12,0,-12);ctx.fill();ctx.restore();
  }
 }
 ctx.shadowBlur=0;
 for(let j=0;j<26;j++){let x=rand(index*41+j*17)*420,y=rand(index*61+j*23)*470;
  ctx.fillStyle=j%5===0?'#fff4e0':h;ctx.globalAlpha=.2+.55*rand(j*77+index);
  ctx.beginPath();ctx.arc(x,y,1+rand(j*21)*2.4,0,T);ctx.fill();
 }
 ctx.restore();
}
function art(card,index,images){
 if(cache.has(card.id))return cache.get(card.id);
 const im=index<5?images.cards:card.rewardArt!==undefined?images.rewards[card.rewardArt]:images.portraits[card.portrait];
 if(!ready(im))return null;
 const off=document.createElement('canvas');off.width=420;off.height=560;
 const g=off.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 const base=g.createLinearGradient(0,0,420,560);
 base.addColorStop(0,'#131e39');base.addColorStop(.36,card.hue);base.addColorStop(.75,'#25223d');base.addColorStop(1,'#080a17');
 g.fillStyle=base;g.fillRect(0,0,420,560);glow(g,225,190,310,card.hue);
 for(let i=0;i<5;i++){g.fillStyle='rgba(253,235,243,'+(.013+i*.006)+')';g.beginPath();g.moveTo(i*94-80,0);g.lineTo(i*94+42,0);g.lineTo(i*94+180,560);g.lineTo(i*94+100,560);g.fill()}
 if(index<5)g.drawImage(im,index*276,0,276,272,-18,48,456,467);
 else{
  let h=im.naturalHeight,w=im.naturalWidth,sh=h*.72,sw=Math.min(w,sh*.83);
  g.save();g.shadowColor='#05091b';g.shadowBlur=32;
  g.drawImage(im,(w-sw)*.5,h*.03,sw,sh,-5,16,430,515);g.restore();
 }
 let fog=g.createLinearGradient(0,0,0,560);fog.addColorStop(0,'#07091836');fog.addColorStop(.4,'#0b102100');fog.addColorStop(1,'#090818cb');
 g.fillStyle=fog;g.fillRect(0,0,420,560);
 spell(g,card,index);
 const vignette=g.createRadialGradient(200,250,100,210,260,390);
 vignette.addColorStop(0,'#07091000');vignette.addColorStop(1,'#050611b2');
 g.fillStyle=vignette;g.fillRect(0,0,420,560);
 cache.set(card.id,off);return off;
}
function fit(ctx,value,x,y,w,base,min,color,font){
 let size=base;ctx.font='700 '+size+'px '+font;
 while(size>min&&ctx.measureText(String(value)).width>w){size-=.5;ctx.font='700 '+size+'px '+font}
 ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(value),x,y);
}
function flourish(ctx,x,y,sx,sy,color,len){
 ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);ctx.strokeStyle=color;ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(len,0);ctx.quadraticCurveTo(6,0,4,7);ctx.quadraticCurveTo(0,8,0,len);ctx.stroke();
 ctx.beginPath();ctx.moveTo(len*.72,4);ctx.quadraticCurveTo(12,9,10,13);ctx.quadraticCurveTo(5,10,4,len*.8);ctx.stroke();
 ctx.restore();
}
function draw(ctx,card,index,x,y,w,h,large,images,options={}){
 const metal=metals[card.rarity]||metals.Common,focus=options.selected||options.hover;
 ctx.save();ctx.shadowColor=focus?rgba(card.hue,.9):'rgba(0,0,0,.8)';ctx.shadowBlur=focus?28:15;
 ctx.shadowOffsetY=focus?3:9;ctx.fillStyle='#090b19';ctx.strokeStyle=metal;ctx.lineWidth=focus?3.5:2.5;
 ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fill();ctx.stroke();ctx.restore();
 ctx.save();ctx.beginPath();ctx.roundRect(x+5,y+5,w-10,h-10,7);ctx.clip();
 let painting=art(card,index,images);
 if(painting)ctx.drawImage(painting,x+5,y+5,w-10,h-10);
 else{let g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,card.hue);g.addColorStop(1,'#080b19');ctx.fillStyle=g;ctx.fillRect(x+5,y+5,w-10,h-10)}
 let fade=ctx.createLinearGradient(0,y+h-98,0,y+h);
 fade.addColorStop(0,'#0b0b1c00');fade.addColorStop(.32,'#0b0d1bdc');fade.addColorStop(1,'#080817fc');
 ctx.fillStyle=fade;ctx.fillRect(x,y+h-100,w,100);ctx.restore();
 ctx.strokeStyle=rgba(metal,.83);ctx.lineWidth=1.25;ctx.beginPath();ctx.roundRect(x+6,y+6,w-12,h-12,6);ctx.stroke();
 ctx.strokeStyle=rgba(card.hue,.68);ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x+10,y+10,w-20,h-20,4);ctx.stroke();
 const len=large?28:21;
 flourish(ctx,x+9,y+9,1,1,metal,len);flourish(ctx,x+w-9,y+9,-1,1,metal,len);
 flourish(ctx,x+9,y+h-9,1,-1,metal,len);flourish(ctx,x+w-9,y+h-9,-1,-1,metal,len);
 const band=y+h-(large?83:68);
 let plate=ctx.createLinearGradient(x,band,x,y+h);
 plate.addColorStop(0,'#191428d4');plate.addColorStop(1,'#090b1afc');
 ctx.fillStyle=plate;ctx.fillRect(x+9,band,w-18,h+y-band-8);
 line(ctx,x+10,band,x+w-10,band,metal,1.6);
 const cx=x+(large?34:27),cy=y+(large?34:27),r=large?27:22;
 ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=9;ctx.fillStyle='#11152a';
 ctx.beginPath();for(let i=0;i<8;i++){let a=PI/8+i*T/8,px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py)}
 ctx.closePath();ctx.fill();ctx.strokeStyle='#fff0c2';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 let gem=ctx.createRadialGradient(cx-5,cy-7,0,cx,cy,r);gem.addColorStop(0,'#c4c4ff');gem.addColorStop(.5,'#644a9e');gem.addColorStop(1,'#20122e');
 ctx.fillStyle=gem;ctx.beginPath();ctx.arc(cx,cy,r-4,0,T);ctx.fill();
 fit(ctx,card.cost,cx,cy+1,r*1.5,large?24:21,17,'#fff3dc','Georgia');
 const stamp=card.rarity.toUpperCase(),rx=x+w-(large?52:43);
 ctx.fillStyle='#090b1adb';ctx.beginPath();ctx.roundRect(rx-38,y+14,Math.min(w*.55,81),23,5);ctx.fill();
 fit(ctx,stamp,rx,y+25,large?77:66,large?12:10,8.5,metal,'system-ui');
 fit(ctx,card.name,x+w*.5,band+(large?30:25),w-25,large?26:18,large?17:11.8,'#fff3e2','Georgia');
 const kind=card.kind==='healall'?'MASS HEAL':card.kind==='attackdraw'?'COMBO':card.kind.toUpperCase();
 fit(ctx,kind,x+w*.5,y+h-(large?22:18),w-25,large?13:10.5,9,metal,'system-ui');
 if(focus&&!options.reduced){ctx.save();ctx.strokeStyle=rgba(card.hue,.7);ctx.lineWidth=2;ctx.shadowColor=card.hue;ctx.shadowBlur=15;
 ctx.globalAlpha=.55+.3*Math.sin((options.now||0)*.006);ctx.beginPath();ctx.roundRect(x+3,y+3,w-6,h-6,9);ctx.stroke();ctx.restore()}
 if(options.energy!==undefined&&card.cost>options.energy&&!large){
 ctx.fillStyle='#02061273';ctx.beginPath();ctx.roundRect(x+4,y+4,w-8,h-8,7);ctx.fill();
 }
}
function aura(ctx,x,y,r,card,t=0){
 ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,x,y,r,card.hue);
 ctx.globalAlpha=.35;ring(ctx,x,y,r*.65,card.hue,t*.001);
 for(let i=0;i<16;i++){let a=i*T/16+t*.0008,d=r*(.65+rand(i+card.cost)*.25);
 ctx.fillStyle=i%5?'#b9d8ff':'#fff0b8';ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,1.3+i%3,0,T);ctx.fill()}
 ctx.restore();
}
window.MoonfallCardPolish={draw,aura,getArt:art,getStats:()=>({cachedIllustrations:cache.size,renderer:'Card Atelier'})};
})();