const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Diagnostics,sanitize}=require('../src/diagnostics.cjs'),layout=require('../src/layout.cjs'),workspace=require('../src/workspace.cjs');
test('diagnostics discard secrets and arbitrary error messages at write and export',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workspace-diag-test-'));
  try{const d=new Diagnostics(dir,{platform:'linux',arch:'x64',appVersion:'0.1.0',password:'CANARY_PASSWORD'});
    d.log('transfer.result',{status:'exact',service:'suno',chars:17,prompt:'CANARY_PROMPT',url:'https://example.test/private?token=CANARY_TOKEN',cookie:'CANARY_COOKIE',alias:'CANARY_ALIAS',stack:'CANARY_STACK'});
    d.log('arbitrary_CANARY_EVENT',{message:'CANARY_ERROR'});
    fs.appendFileSync(d.file(0),JSON.stringify({event:'page.failure',status:'error',url:'CANARY_INJECTED',at:'CANARY_DATE',session:'CANARY_SESSION'})+'\n');
    const report=JSON.stringify(d.report());assert.ok(!report.includes('CANARY'));assert.equal(d.report().events.length,2);
    const raw=fs.readFileSync(d.file(0),'utf8');assert.ok(!raw.includes('CANARY_PROMPT'));assert.equal(sanitize('unknown'),null);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('diagnostics rotate, can be paused, and can be deleted',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workspace-diag-test-'));
  try{const d=new Diagnostics(dir);for(let i=0;i<5;i++){fs.writeFileSync(d.file(0),' '.repeat(512*1024+1));d.log('app.start');}assert.equal(fs.readdirSync(dir).length,4);const before=fs.statSync(d.file(0)).size;d.enabled=false;d.log('app.stop');assert.equal(fs.statSync(d.file(0)).size,before);d.clear();assert.equal(d.report().events.length,0);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('four columns remain a row, grid creates two rows, one-to-three panels stay valid',()=>{
  const tree=layout.preset(['a','b','c','d'],'columns');assert.equal(tree.axis,'x');assert.equal(tree.b.axis,'x');assert.equal(tree.b.b.axis,'x');assert.deepEqual(layout.ids(tree),['a','b','c','d']);
  const grid=layout.preset(['a','b','c','d'],'grid');assert.equal(grid.axis,'y');assert.equal(grid.a.axis,'x');assert.equal(grid.b.axis,'x');
  for(let count=1;count<=3;count++){const list=['a','b','c'].slice(0,count);assert.deepEqual(layout.ids(layout.preset(list,'grid')),list);}
});
test('moving and resizing preserve each open panel exactly once',()=>{
  const base=layout.preset(['a','b','c','d'],'grid');for(const edge of ['center','left','right','top','bottom']){const next=layout.move(base,'a','d',edge);assert.deepEqual(layout.ids(next).sort(),['a','b','c','d']);assert.ok(layout.valid(next,['a','b','c','d']));}
  assert.equal(layout.resize(base,'',9).ratio,.85);assert.deepEqual(layout.ids(layout.remove(base,'b')).sort(),['a','c','d']);
});
test('workspace preserves private conversation paths locally but rejects credentials and auth callbacks',()=>{
  assert.equal(workspace.restorableURL('https://chatgpt.com/c/private-id'),'https://chatgpt.com/c/private-id');
  for(const url of ['javascript:alert(1)','file:///etc/passwd','https://user:pass@example.test/','https://example.test/oauth/callback','https://example.test/?access_token=secret','https://example.test/?code=secret'])assert.equal(workspace.restorableURL(url),null);
  const state=workspace.normalize({version:1,tabs:[{id:'a',service:'chatgpt',url:'https://chatgpt.com/c/private-id',alias:'my-task'}],tree:{id:'a'},clips:[{id:'x',text:'selected text'}]});assert.equal(state.tabs[0].alias,'my-task');assert.equal(state.clips[0].text,'selected text');assert.equal(state.active,'a');
});
test('malformed or repeated panel state cannot create duplicate tabs',()=>{
  const state=workspace.normalize({version:1,tabs:[{id:'a',url:'https://example.test/'},{id:'a',url:'https://example.test/'}],tree:{axis:'x',ratio:.5,a:{id:'a'},b:{id:'a'}}});assert.equal(state.tabs.length,1);assert.deepEqual(layout.ids(state.tree),['a']);
});
