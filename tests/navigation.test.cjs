const test=require('node:test'),assert=require('node:assert/strict');
const workspace=require('../src/workspace.cjs'),navigation=require('../src/navigation.cjs'),layout=require('../src/layout.cjs');
function sample(){return {...workspace.empty(),tabs:['a','b','c','d','e'].map(id=>({id,service:'web',url:'https://example.test/'+id,alias:id})),active:'a'};}
test('ordinary tabs open alone and never replace a configured multiview',()=>{
  const s=sample();assert.equal(navigation.configure(s,['a','b','c','d'],'grid'),true);
  s.tree=layout.resize(s.tree,'',.63);const original=JSON.stringify(s.tree);
  navigation.activate(s,'e');assert.deepEqual(navigation.visible(s),['e']);assert.equal(s.presentation,'single');assert.equal(JSON.stringify(s.tree),original);
  navigation.activate(s,'b');assert.equal(s.active,'b');assert.equal(s.presentation,'multi');assert.deepEqual(navigation.visible(s),['a','b','c','d']);assert.equal(JSON.stringify(s.tree),original);
});
test('focusing a maximized panel keeps it maximized, explicit member selection returns to multiview',()=>{
  const s=sample();navigation.configure(s,['a','b'],'columns');s.presentation='single';
  navigation.activate(s,'b',{focusOnly:true});assert.deepEqual(navigation.visible(s),['b']);
  navigation.activate(s,'b');assert.deepEqual(navigation.visible(s),['a','b']);
});
test('multiview rejects a fifth member, duplicates, and unknown tabs without changing state',()=>{
  const s=sample();navigation.configure(s,['a','b'],'grid');const old=JSON.stringify(s);
  for(const ids of [['a','b','c','d','e'],['a','a'],['missing']]){assert.equal(navigation.configure(s,ids,'grid'),false);assert.equal(JSON.stringify(s),old);}
  assert.equal(navigation.configure(s,[],'grid'),true);assert.equal(s.active,'a');assert.equal(s.tree,null);assert.deepEqual(navigation.visible(s),['a']);
});
test('closing unrelated tabs preserves the multiview; closing a member never auto-enrolls a tab',()=>{
  const s=sample();navigation.configure(s,['a','b'],'grid');navigation.activate(s,'e');navigation.remove(s,'c');assert.deepEqual(navigation.visible(s),['e']);assert.deepEqual(navigation.members(s),['a','b']);
  navigation.activate(s,'a');navigation.remove(s,'a');assert.equal(s.active,'b');assert.deepEqual(navigation.members(s),['b']);
  navigation.remove(s,'b');assert.equal(s.presentation,'single');assert.equal(s.tree,null);
});
test('restart preserves a standalone tab alongside its saved multiview and divider ratios',()=>{
  const s=sample();navigation.configure(s,['a','b','c','d'],'columns');s.tree=layout.resize(s.tree,'',.41);navigation.activate(s,'e');
  const restored=workspace.normalize(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);
  navigation.activate(restored,'a');assert.equal(restored.tree.ratio,.41);
});
test('old workspace versions migrate without losing tabs, clips or panel configuration',()=>{
  const s=sample();navigation.configure(s,['a','b'],'columns');s.version=1;delete s.presentation;
  const r=workspace.normalize(s);assert.equal(r.version,1);assert.deepEqual(r.tabs,s.tabs);assert.equal(r.presentation,'multi');assert.deepEqual(r.tree,s.tree);
  s.mode='single';assert.equal(workspace.normalize(s).presentation,'single');
});
test('the 30-tab limit remains enforced on restored workspaces',()=>{
  const s=sample();s.tabs=Array.from({length:35},(_,i)=>({id:'t'+i,url:'https://example.test/'+i,service:'web',alias:'t'+i}));
  assert.equal(workspace.normalize(s).tabs.length,navigation.MAX_TABS);assert.equal(navigation.MAX_TABS,30);
});
