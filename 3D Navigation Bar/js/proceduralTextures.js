/*
 * Space surface art — deterministic, self-contained equirectangular textures.
 * Each map is generated once on the client and wrapped onto its corresponding sphere.
 * This is an artistic approximation of planetary geology, not satellite imagery.
 * No remote assets, API requests, or license-sensitive photographs required.
 */
(function () {
    'use strict';
    const cache = new Map();
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const mix = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    const palettes = {
        Mercury: {base: [110, 105, 100], spread: 115, craters: 115, seed: 11},
        Moon:    {base: [140, 139, 135], spread: 100, craters: 140, seed: 17},
        Mars:    {base: [164, 82, 47], spread: 117, craters: 48, seed: 23}
    };
    // Fast deterministic integer hashing keeps the maps identical across reloads.
    function hash(x, y, seed) {
        let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }
    function noise(u, v, frequency, seed) {
        const x = u * frequency, y = v * frequency * .5;
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = smooth(x - ix), fy = smooth(y - iy);
        const a = (i, j) => hash((i % frequency + frequency) % frequency, j, seed);
        return mix(mix(a(ix,iy),a(ix+1,iy),fx),mix(a(ix,iy+1),a(ix+1,iy+1),fx),fy);
    }
    function fractal(u, v, seed, base = 4) {
        return noise(u,v,base,seed)*.43 +
               noise(u,v,base*2,seed+1)*.27 +
               noise(u,v,base*4,seed+2)*.18 +
               noise(u,v,base*8,seed+3)*.12;
    }
    const rgb = (data, i, r, g, b, alpha = 255) => {
        data[i] = clamp(r, 0, 255);
        data[i+1] = clamp(g, 0, 255);
        data[i+2] = clamp(b, 0, 255);
        data[i+3] = clamp(alpha, 0, 255);
    };
    function craters(ctx, width, height, count, seed) {
        for (let k = 0; k < count; k++) {
            const u = hash(k,13,seed), v = hash(k,43,seed);
            const radius = (1 + Math.pow(hash(k,74,seed),3)*14) * width/1024;
            const x=u*width, y=v*height, ry=radius * (.55 + .45*Math.sin(v*Math.PI));
            for (const wrap of [-width,0,width]) {
                const cx=x+wrap;
                const gradient=ctx.createRadialGradient(cx-radius*.2,y-ry*.2,1,cx,y,radius*1.35);
                gradient.addColorStop(0,'rgba(7,9,11,.37)');
                gradient.addColorStop(.62,'rgba(14,16,19,.21)');
                gradient.addColorStop(.84,'rgba(245,245,244,.28)');
                gradient.addColorStop(1,'rgba(255,255,255,0)');
                ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(cx,y,radius*1.35,ry*1.35,0,0,Math.PI*2);ctx.fill();
            }
        }
    }
    function generate(name, THREE) {
        if (cache.has(name)) return cache.get(name);
        const gas = ['Jupiter','Saturn','Uranus','Neptune'].includes(name);
        const width = mobile ? 512 : (gas || name==='Earth' ? 1024 : 768);
        const height = width/2;
        const canvas = document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        const pixels=ctx.createImageData(width,height);
        const data=pixels.data;
        const rock=palettes[name];
        let bumpPixels=null;
        const needsBump=!!rock || name==='Earth';
        if (needsBump) bumpPixels=new Uint8ClampedArray(data.length);
        const seed={Sun:3,Venus:5,Earth:7,Jupiter:31,Saturn:37,Uranus:41,Neptune:47,Clouds:53}[name]||1;
        for(let y=0;y<height;y++){
            const v=y/height, latitude=(v-.5)*Math.PI;
            const pole=Math.abs(Math.sin(latitude));
            for(let x=0;x<width;x++){
                const u=x/width, i=(y*width+x)*4;
                const n=fractal(u,v,seed,5), n2=fractal(u,v,seed+17,13);
                let r,g,b,relief=n;
                if(rock){
                    const n3=fractal(u,v,rock.seed,4);
                    const detail=fractal(u,v,rock.seed+50,22);
                    const shift=(n3-.5)*rock.spread+(detail-.5)*34;
                    r=rock.base[0]+shift;g=rock.base[1]+shift*.95;b=rock.base[2]+shift*.83;
                    if(name==='Mars'){
                        const dust=clamp((n3-.39)*3);
                        r+=dust*35;g-=dust*9;b-=dust*7;
                        if(pole>.94){const ice=clamp((pole-.94)*26);r=mix(r,225,ice);g=mix(g,217,ice);b=mix(b,203,ice);}
                    }
                    relief=n3*.65+detail*.35;
                } else if(name==='Earth'){
                    const shape=fractal(u,v,7,3)*.7+fractal(u,v,28,7)*.3;
                    const land=shape>.50+(pole>.83?.05:0);
                    const depth=clamp((.5-shape)*4);
                    if(!land){
                        r=mix(13,4,depth);g=mix(102,35,depth);b=mix(144,84,depth);
                        const coastal=clamp((shape-.44)*17);r+=coastal*17;g+=coastal*42;b+=coastal*12;
                    } else {
                        const elevation=clamp((shape-.49)*6);
                        const green=fractal(u,v,63,7);
                        const desert=clamp((.54-green)*5 + (Math.abs(latitude)<.4?.22:0));
                        r=mix(31,170,desert)+elevation*45;
                        g=mix(108,139,desert)+elevation*24;
                        b=mix(52,83,desert)+elevation*11;
                        const mountains=clamp((elevation-.54)*2);
                        r=mix(r,198,mountains);g=mix(g,194,mountains);b=mix(b,184,mountains);
                    }
                    if(pole>.87){const ice=clamp((pole-.87)*14);r=mix(r,236,ice);g=mix(g,240,ice);b=mix(b,245,ice);}
                    relief=land?shape:0.49;
                } else if(name==='Venus'){
                    const swirls=Math.sin((v+n*.09)*Math.PI*24 + n2*3);
                    r=210+(n-.5)*45+swirls*12;g=172+(n-.5)*60+swirls*13;b=105+(n-.5)*55+swirls*12;
                } else if(name==='Sun'){
                    const cells=fractal(u,v,3,32), granulation=fractal(u,v,11,64);
                    const turbulence= Math.sin(u*110+n*12)*Math.cos(v*75+n2*12);
                    r=240+cells*24;g=126+granulation*108+turbulence*16;b=23+granulation*45+turbulence*8;
                } else if(gas){
                    const flow=(n-.5)*.033 + (n2-.5)*.012;
                    const bands=Math.sin((v+flow)*Math.PI*(name==='Jupiter'?34:name==='Saturn'?42:20));
                    const thin=Math.sin((v+flow)*Math.PI*110)*.18;
                    let t=bands*.5+thin;
                    if(name==='Jupiter'){
                        const rSpot=Math.sqrt(Math.pow(((u-.70+.5)%1-.5)*3.8,2)+Math.pow((v-.59)*9,2));
                        const spot=clamp((.19-rSpot)*15);
                        r=194+t*52+spot*43;g=150+t*46-spot*24;b=114+t*37-spot*38;
                    }else if(name==='Saturn'){
                        r=200+t*24;g=184+t*28;b=148+t*35;
                    }else if(name==='Uranus'){
                        r=134+t*10;g=204+t*13;b=211+t*12;
                    }else{
                        const darkSpot=clamp((.16-Math.hypot(((u-.34+.5)%1-.5)*3.6,(v-.46)*7))*11);
                        r=33+t*18-darkSpot*18;g=88+t*31-darkSpot*22;b=192+t*35-darkSpot*20;
                    }
                    const polarShade=clamp((pole-.78)*.9);
                    r*=1-polarShade*.18;g*=1-polarShade*.18;b*=1-polarShade*.18;
                }else if(name==='Clouds'){
                    const cloud=fractal(u,v,53,4)*.65+fractal(u,v,71,17)*.35;
                    const alpha=clamp((cloud-.48)*8)*200;
                    rgb(data,i,240,247,255,alpha);
                    continue;
                }else{r=90;g=90;b=90;}
                rgb(data,i,r,g,b);
                if(bumpPixels){
                    const value=clamp(relief*255,0,255);
                    rgb(bumpPixels,i,value,value,value);
                }
            }
        }
        ctx.putImageData(pixels,0,0);
        if(rock) craters(ctx,width,height,rock.craters,rock.seed);
        const map=new THREE.CanvasTexture(canvas);
        map.encoding=THREE.sRGBEncoding;
        map.anisotropy=mobile ? 4 : 8;
        let bumpMap=null;
        if(bumpPixels){
            const bumpCanvas=document.createElement('canvas');
            bumpCanvas.width=width;bumpCanvas.height=height;
            const bx=bumpCanvas.getContext('2d');
            const image=bx.createImageData(width,height);
            image.data.set(bumpPixels);
            bx.putImageData(image,0,0);
            bumpMap=new THREE.CanvasTexture(bumpCanvas);
        }
        const result={map,bumpMap};
        cache.set(name,result);
        return result;
    }
    window.generateSpaceTexture=generate;
})();