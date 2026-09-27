const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/photo-engine.js'),'utf8'),ctx);const P=ctx.ArborPhoto,w=112,h=84,data=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,inside=((x-52)/27)**2+((y-41)/30)**2<1;data[i]=inside?x*2:238;data[i+1]=inside?y*2:231;data[i+2]=inside?30:215;data[i+3]=x<4?0:255;}
const process=p=>P.process(data,w,h,{...P.defaults,...p});
assert.deepEqual(Array.from(process({amount:0})),Array.from(data),'Zero strength preserves RGBA exactly');
const base=process({amount:100});assert.equal(base.length,data.length);assert.deepEqual(Array.from(base),Array.from(process({amount:100})),'Same seed is reproducible');
for(const [name,p]of Object.entries(P.presets)){const out=process(p);assert.equal(out.length,w*h*4);assert(out.some((v,i)=>v!==data[i]),name+' changes input');}
for(const key of ['threshold','contrast','edges','detail','softness','tones','color','bend','wavelength','stretch','zigzag','flow','branching','length','forks','porosity','poreSize','grain','ragged','bark','fibers','dust']){const a=process({[key]:0}),b=process({[key]:100});assert(a.some((v,i)=>v!==b[i]),key+' changes pixels');}
const lowRelief=process({bark:100,relief:0}),highRelief=process({bark:100,relief:100});assert(lowRelief.some((v,i)=>v!==highRelief[i]),'Relief affects bark');
const transparent=process({amount:100,transparent:true});assert(transparent.some((v,i)=>i%4===3&&v<255),'Transparent output contains cutouts');
const dark=process({source:'dark'}),light=process({source:'light'});assert(dark.some((v,i)=>v!==light[i]),'Light and dark selection differ');
for(const source of ['dark','light','edges','tones'])assert.equal(process({source,branching:100,bend:100,flow:100}).length,data.length);
console.log('PASS photo: exact zero, deterministic output, five presets, all 24 controls, alpha and source modes');
