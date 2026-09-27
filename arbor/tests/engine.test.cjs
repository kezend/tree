const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const opentype = require(path.join(root, 'dist/assets/opentype.min.js'));
const source = fs.readFileSync(path.join(root, 'dist/assets/cormorant-italic.ttf'));
const font = opentype.parse(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'dist/engine.js'),'utf8'),context);
const E = context.window.ArborEngine;
const base = E.buildGlyph(font, 'R', {...E.defaults,growth:0,bark:100,erosion:100}, 42);
assert.equal(base.body,font.getPath('R',0,0,300).toPathData(3),'Zero growth preserves the exact source outline');
assert.equal(base.branches.length,0);
assert.equal(base.pores,'');
const presets = {};
for(const id of ['wood','lichen','liquid','dust','hybrid']) {
  const preset = E.presets.find(p=>p.id===id);
  const p = {...E.defaults,...preset.values};
  const a = E.buildGlyph(font,'R',p,2741);
  const b = E.buildGlyph(font,'R',p,2741);
  const svg=E.shapeMarkup(a,'#e8e8df','letter');
  assert.equal(svg,E.shapeMarkup(b,'#e8e8df','letter'),'Deterministic '+id);
  assert(!/NaN|Infinity|undefined/.test(svg),'Finite SVG '+id);
  assert(a.channels.some(c=>c.root),'Font-derived medial strokes '+id);
  presets[id]=a;
}
assert(presets.wood.fibers.length>0 && presets.wood.cracks.length>0);
assert(E.shapeMarkup(presets.wood,'#ffffff','wood').includes('feDiffuseLighting'));
assert(presets.lichen.pores.length>1000);
assert.equal(presets.liquid.pores,'');
assert.equal(presets.liquid.fibers,'');
assert(presets.dust.dust.length>0);
assert(presets.hybrid.pores.length>0 && presets.hybrid.fibers.length>0);
const empty=E.buildGlyph(font,' ',E.defaults,42);
assert.equal(empty.body,'');
assert.equal(empty.branches.length,0);
for(const text of ['ЛЕС','Aa&','О','Ё','Я']) {
  for(const ch of text){
    const a=E.buildGlyph(font,ch,{...E.defaults,growth:100,rough:100,bend:100,twist:100,density:100,erosion:100},19);
    assert(!/NaN|Infinity|undefined/.test(E.shapeMarkup(a,'#000000','extreme')),'Extremes '+ch);
  }
}
const state={text:'ЛЕС',params:{...E.defaults},seed:12,letters:{},width:1600,height:1000};
const first=E.layout(font,state);
const changed=E.layout(font,{...state,letters:{1:{seed:900,params:{bark:100,erosion:100},x:19,rotation:21}}});
assert.equal(E.shapeMarkup(first.items[0].shape,'#ffffff','a'),E.shapeMarkup(changed.items[0].shape,'#ffffff','a'));
assert.notEqual(E.shapeMarkup(first.items[1].shape,'#ffffff','b'),E.shapeMarkup(changed.items[1].shape,'#ffffff','b'));
assert.equal(changed.items[1].x-first.items[1].x,19);
assert.equal(changed.items[1].rotation-first.items[1].rotation,21);
assert.equal(E.shapeMarkup(first.items[2].shape,'#ffffff','c'),E.shapeMarkup(changed.items[2].shape,'#ffffff','c'));
console.log('PASS: exact baseline, deterministic materials, mixed textures, Cyrillic, extremes and isolated per-letter edits.');
const clean={...E.defaults,erosion:0,grain:0,crumble:0,fuzz:0,bark:0,fibers:0,cracks:0};
const cleanShape=E.buildGlyph(font,'R',clean,42);
for(const key of ['wave','zigzag','waist','perspective']) {
  const altered=E.buildGlyph(font,'R',{...clean,[key]:80},42);
  assert.notEqual(altered.body,cleanShape.body,'Geometry changes for '+key);
}
for(const key of ['split','breaks']) {
  const altered=E.buildGlyph(font,'R',{...clean,[key]:100},42);
  assert(altered.pores.length>0,'Structural cutouts for '+key);
}
for(const key of ['drops','spines']) {
  const altered=E.buildGlyph(font,'R',{...clean,[key]:100},42);
  assert(altered.branches.length>cleanShape.branches.length,'Added shapes for '+key);
}
const linked=E.layout(font,{...state,params:{...clean,links:80}});
assert(linked.connections.includes('<path'));
const linkedOther=E.layout(font,{...state,params:{...clean,links:80,tension:-75}});
assert.notEqual(linked.connections,linkedOther.connections);
const pin={x:70,y:-90,dx:70,dy:-40,radius:130};
const manual=E.buildGlyph(font,'R',{...E.defaults,_pins:[pin]},42);
assert.notEqual(manual.body,E.buildGlyph(font,'R',E.defaults,42).body);
assert(!/NaN|Infinity|undefined/.test(E.shapeMarkup(manual,'#ffffff','manual')));
assert.equal((manual.pores.match(/M/g)||[]).length,(E.buildGlyph(font,'R',E.defaults,42).pores.match(/M/g)||[]).length,'Manual edits preserve all texture components');
const zeroManual=E.buildGlyph(font,'R',{...E.defaults,growth:0,_pins:[pin]},42);
assert.notEqual(zeroManual.body,base.body,'Manual editing also works at zero growth');
const oldLayout=E.layout(font,state);
const pinnedLayout=E.layout(font,{...state,letters:{1:{pins:[pin]}}});
assert.equal(oldLayout.items[0].shape.body,pinnedLayout.items[0].shape.body);
assert.notEqual(oldLayout.items[1].shape.body,pinnedLayout.items[1].shape.body);
assert.equal(oldLayout.items[2].shape.body,pinnedLayout.items[2].shape.body);
console.log('PASS: macro geometry, cuts, drops, spines, connections, manual deformation and texture preservation.');
