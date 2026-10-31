// Original SVG vector portraits for Arcana Duel. No third-party assets or network requests.
const S='http://www.w3.org/2000/svg';
const profiles={
  ronin:{hair:'#26394e',light:'#9dbddd',coat:'#1c2537',trim:'#c2a070',skin:'#edd1c3',eye:'#88b8dc',style:0,weapon:'blade'},
  duelist:{hair:'#b5c5d2',light:'#f5f2e6',coat:'#343f57',trim:'#d5bd82',skin:'#ecd1c6',eye:'#9077c9',style:1,weapon:'blade'},
  sentinel:{hair:'#e8dce7',light:'#fffcf2',coat:'#485272',trim:'#cfc7fa',skin:'#f4d6ca',eye:'#a59ae0',style:1,weapon:'spear'},
  kitsune:{hair:'#ab577e',light:'#efb1d4',coat:'#612a43',trim:'#f0ad93',skin:'#f5d1bf',eye:'#eba25b',style:2,weapon:'wand'},
  oracle:{hair:'#afbed9',light:'#e3f4ff',coat:'#364c74',trim:'#a4cffa',skin:'#f1d8d8',eye:'#88c6ff',style:1,weapon:'wand'},
  healer:{hair:'#d5ac65',light:'#fdf1c5',coat:'#d4bc96',trim:'#fff0ad',skin:'#f3d7cb',eye:'#8caec8',style:1,weapon:'staff'},
  phantom:{hair:'#2b294c',light:'#ac9bd1',coat:'#202338',trim:'#ba97ff',skin:'#dfbbbd',eye:'#df8dd7',style:0,weapon:'blade'},
  sakura:{hair:'#e2a1bb',light:'#ffdfe8',coat:'#734158',trim:'#f0cfad',skin:'#f0cfc5',eye:'#9f76bf',style:2,weapon:'spear'},
  witch:{hair:'#803a59',light:'#d992aa',coat:'#40283d',trim:'#f2a9a2',skin:'#e7bba9',eye:'#ffc27c',style:2,weapon:'wand'},
  channeler:{hair:'#89b8d2',light:'#eeffff',coat:'#31466e',trim:'#8dd6f5',skin:'#f0d3c8',eye:'#9bdafd',style:1,weapon:'staff'},
  reaper:{hair:'#312946',light:'#9988b3',coat:'#251c38',trim:'#d0a5e7',skin:'#dfbeb7',eye:'#f4a6ba',style:0,weapon:'blade'},
  samurai:{hair:'#3a4857',light:'#b2c3cf',coat:'#2d3e4d',trim:'#d2b48b',skin:'#e7c1b7',eye:'#a6bdcc',style:0,weapon:'blade'},
  dragon:{hair:'#df7865',light:'#ffd7af',coat:'#693946',trim:'#ffca79',skin:'#f0c4ad',eye:'#ffe0ac',style:2,weapon:'spear'},
  empress:{hair:'#d2becf',light:'#f6e4ee',coat:'#50304f',trim:'#e8b1c7',skin:'#ecd1ce',eye:'#dc7ca2',style:1,weapon:'staff'},
  archmage:{hair:'#d6c8f0',light:'#ffffff',coat:'#344c65',trim:'#edcf9b',skin:'#f3d9cf',eye:'#a7c7ea',style:1,weapon:'staff'},
  blade:{hair:'#283250',light:'#92a0dd',coat:'#292840',trim:'#b7a9ef',skin:'#e0c3be',eye:'#88a6f1',style:0,weapon:'blade'},
  wisp:{hair:'#c1636b',light:'#ffb99c',coat:'#563443',trim:'#f2a774',skin:'#e9b5a9',eye:'#ffb4b0',style:2,weapon:'staff'},
  stalker:{hair:'#6a567e',light:'#bd9cc9',coat:'#272139',trim:'#bca1c1',skin:'#d1afb5',eye:'#f099b6',style:0,weapon:'blade'},
  queen:{hair:'#d9c2cc',light:'#fff2f2',coat:'#542f4c',trim:'#f5adca',skin:'#eed3cc',eye:'#ee88bc',style:1,weapon:'spear'}
};
function node(tag,attrs={},text){
  const e=document.createElementNS(S,tag);
  for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
  if(text!==undefined)e.textContent=text;
  return e;
}
function path(d,fill,stroke,sw){const attrs={d,fill};if(stroke){attrs.stroke=stroke;attrs['stroke-width']=sw||2;attrs['stroke-linejoin']='round'}return node('path',attrs)}
export function characterArt(id){
  const c=profiles[id]||profiles.ronin;
  const svg=node('svg',{viewBox:'0 0 240 330',class:'character-art',role:'img','aria-label':'Original illustrated fantasy character portrait'});
  const defs=node('defs');
  const uid='char'+String(++characterArt.nextId);
  for(const [name,one,two] of [['hair',c.light,c.hair],['cloth',c.trim,c.coat]]){
    const g=node('linearGradient',{id:uid+name,x1:'20%',x2:'80%',y1:'0%',y2:'100%'});
    g.append(node('stop',{offset:'0%', 'stop-color':one}),node('stop',{offset:'100%','stop-color':two}));defs.append(g);
  }
  const aura=node('radialGradient',{id:uid+'aura'});
  aura.append(node('stop',{offset:'0%','stop-color':c.light,'stop-opacity':'.43'}),node('stop',{offset:'100%','stop-color':c.light,'stop-opacity':'0'}));defs.append(aura);
  svg.appendChild(defs);
  svg.appendChild(node('ellipse',{cx:120,cy:154,rx:102,ry:124,fill:'url(#'+uid+'aura)'}));
  for(let i=0;i<13;i++){const angle=i*2.4;const x=120+Math.cos(angle)*100,y=125+Math.sin(angle)*110;svg.appendChild(node('circle',{cx:x.toFixed(1),cy:y.toFixed(1),r:i%3===0?2.1:1,fill:c.trim,opacity:.65}))}
  svg.appendChild(node('circle',{cx:120,cy:139,r:86,fill:'none',stroke:c.trim,'stroke-opacity':'.45','stroke-width':1.5,'stroke-dasharray':'3 8'}));
  // Sweeping back hair and a readable outfit silhouette.
  svg.appendChild(path('M67 123 Q55 48 120 45 Q185 46 173 131 L195 290 Q163 319 142 286 L113 280 L81 316 Q49 290 50 251 Z','url(#'+uid+'hair)'));
  svg.appendChild(path('M88 220 Q52 207 21 293 L-3 337 L246 337 L222 286 Q196 225 156 218 Q119 251 88 220','url(#'+uid+'cloth)',c.trim,1));
  svg.appendChild(path('M94 226 L121 269 L146 224 L134 214 L108 214 Z',c.skin));
  svg.appendChild(path('M104 233 L120 284 L136 233 L149 230 L176 330 L65 330 L89 228 Z',c.coat,c.trim,2));
  svg.appendChild(path('M121 258 L114 330 L130 330 Z',c.trim));
  svg.appendChild(path('M78 232 Q60 246 46 294 L60 311 L91 259 M163 229 Q183 246 195 303 L182 320 L149 255','none',c.trim,2));
  // Face, ears, eyebrows and expressive anime eyes.
  svg.appendChild(path('M87 116 Q94 96 120 94 Q151 95 157 120 L155 174 Q143 202 120 212 Q96 200 85 169 Z',c.skin,'#c8a4a5',1));
  svg.appendChild(path('M85 155 Q72 150 81 169 L89 173 M156 155 Q170 151 160 171 L154 174','none','#dcb3a8',3));
  for(const x of [96,133]){
    svg.appendChild(path('M'+(x-12)+' 153 Q'+x+' 145 '+(x+13)+' 153 Q'+x+' 164 '+(x-12)+' 153','#f9edeb','#2c283c',2.5));
    svg.appendChild(node('ellipse',{cx:x,cy:155,rx:5,ry:8,fill:c.eye}));
    svg.appendChild(node('ellipse',{cx:x,cy:156,rx:2.3,ry:6,fill:'#29253b'}));
    svg.appendChild(node('circle',{cx:x-1.8,cy:151,r:1.8,fill:'#ffffff'}));
    svg.appendChild(path('M'+(x-12)+' 143 Q'+x+' 140 '+(x+11)+' 145','none',c.hair,2));
  }
  svg.appendChild(path('M122 165 L119 180 L124 181','none','#bc9293',1.3));
  svg.appendChild(path('M112 189 Q121 194 129 189','none','#af7686',1.5));
  // Forelock, stylized hair strands, accessories.
  svg.appendChild(path(c.style===0?
    'M76 126 Q72 66 120 59 Q165 56 169 114 Q139 101 124 81 Q112 109 90 119 L84 169 Q67 156 76 126':
    c.style===1?
    'M71 131 Q69 58 128 57 Q170 59 176 121 Q158 112 143 89 Q130 126 109 120 Q93 125 74 146 Z':
    'M76 128 Q61 68 116 57 Q171 55 177 121 Q144 85 128 104 Q100 114 75 150 Z','url(#'+uid+'hair)',c.hair,2));
  svg.appendChild(path('M81 120 Q74 175 61 246 Q76 252 88 230 L94 132 M158 120 Q164 179 179 249 Q160 249 153 226 L147 131','url(#'+uid+'hair)'));
  svg.appendChild(path('M99 83 Q121 66 149 85 M88 115 Q99 101 114 99','none',c.light,3));
  svg.appendChild(node('circle',{cx:164,cy:108,r:7,fill:c.trim,stroke:'#f8e9c2','stroke-width':2}));
  svg.appendChild(path('M164 94 L167 105 L178 110 L167 113 L164 125 L161 113 L151 110 L161 105 Z','#fff1d1'));
  if(c.weapon==='blade'){
    svg.appendChild(path('M186 285 L214 65 L225 42 L222 88 L202 288 Z','#dce7ed','#a5aab6',2));
    svg.appendChild(path('M176 253 L209 262','none',c.trim,8));
  }else if(c.weapon==='staff'||c.weapon==='spear'){
    svg.appendChild(path('M188 320 L204 72','none',c.trim,7));
    svg.appendChild(node('circle',{cx:204,cy:65,r:20,fill:'none',stroke:c.trim,'stroke-width':4}));
    svg.appendChild(path('M204 35 L211 65 L204 93 L197 65 Z','#eaf4fb',c.trim,2));
  }else{
    svg.appendChild(node('circle',{cx:198,cy:100,r:26,fill:'none',stroke:c.trim,'stroke-width':3}));
    svg.appendChild(node('circle',{cx:198,cy:100,r:12,fill:c.light,opacity:.82}));
  }
  return svg;
}
characterArt.nextId=0;
