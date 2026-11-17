// Offline fixture test, never attach this runner to an authenticated browser.
process.argv.push('--fixtures');
const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});const checks=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function check(name,ok){checks.push({name,passed:!!ok});assert.ok(ok,name);}
function screenshot(name){execFileSync('python',[path.join(__dirname,'native-action.py'),'screenshot',path.join(out,name+'.png')]);}
async function settle(c){for(let i=0;i<60;i++){if([...c.views.values()].every(t=>!t.view.webContents.isLoading())){await pause(200);return;}await pause(100);}throw new Error('fixture-load-timeout');}
(async()=>{
  const c=await require('../src/main.cjs').ready;
  if(process.argv.includes('--restore-check')){
    await settle(c);const s=c.snapshot();check('restart-restores-five-tabs',s.tabs.length===5);check('restart-restores-local-alias',s.tabs.some(t=>t.alias==='fixture-alias'));check('restart-restores-selected-material',s.clips.length===1);check('restart-does-not-pretend-to-restore-fields',s.tabs.every(t=>t.registered.length===0));check('restart-keeps-standalone-presentation',s.presentation==='single'&&!require('../src/layout.cjs').ids(s.tree).includes(s.active));check('restart-keeps-four-members',require('../src/layout.cjs').ids(s.tree).length===4);
    fs.writeFileSync(path.join(out,'restore-results.json'),JSON.stringify(checks,null,2));app.quit();return;
  }
  for(const service of ['chatgpt','suno','canva','claude'])await c.action('add',{service});await settle(c);
  let s=c.snapshot();const [source,target,canva]=s.tabs;
  check('four-webviews-created',c.views.size===4);
  check('new-tabs-open-alone',c.snapshot().presentation==='single'&&c.snapshot().tree===null);
  await c.win.webContents.executeJavaScript('document.querySelector("#multiview").click()');await pause(150);
  await c.win.webContents.executeJavaScript(`document.querySelectorAll('.tab-picker input:not(:checked)').forEach(e=>e.click());[...document.querySelectorAll('#dialog-body button')].find(e=>e.textContent==='적용').click()`);await pause(250);check('multiview-picker-applies-four-members',require('../src/layout.cjs').ids(c.snapshot().tree).length===4);screenshot('01-grid');
  const rects=await c.win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.web-slot')).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})`);
  check('grid-is-two-by-two',rects.length===4&&rects[0].y===rects[1].y&&rects[2].y>rects[0].y&&rects[2].y===rects[3].y);
  await c.action('layout',{mode:'columns'});await pause(200);
  const columns=await c.win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.web-slot')).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y}})`);
  check('columns-are-left-to-right',columns.every(r=>r.y===columns[0].y)&&columns.every((r,i)=>i===0||r.x>columns[i-1].x));screenshot('02-columns');
  const savedTree=JSON.stringify(c.snapshot().tree);const fifth=await c.action('add',{service:'web',url:'https://example.test/fifth'});await settle(c);
  check('fifth-tab-is-full-content-area',await c.win.webContents.executeJavaScript(`document.querySelectorAll('.pane').length===1&&getComputedStyle(document.querySelector('.pane-bar')).display==='none'`));
  check('fifth-tab-leaves-multiview-intact',JSON.stringify(c.snapshot().tree)===savedTree);screenshot('05-standalone');
  await c.win.webContents.executeJavaScript('document.querySelector("#multiview").click()');await pause(150);check('multiview-picker-disables-fifth-member',await c.win.webContents.executeJavaScript(`document.querySelector('.tab-picker input:not(:checked)').disabled`));await c.win.webContents.executeJavaScript('closeDialog()');await pause(100);
  await c.action('activate',{id:source.id});await pause(200);check('member-click-restores-multiview',await c.win.webContents.executeJavaScript(`document.querySelectorAll('.pane').length===4`));
  const twc=c.views.get(target.id).view.webContents;
  const native=(...args)=>execFileSync('python',[path.join(__dirname,'native-action.py'),...args.map(String)]);
  async function context(view,selector){
    const p=await view.webContents.executeJavaScript(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();const r=e.getBoundingClientRect();return {x:r.x+25,y:r.y+28}})()`);
    const origin=c.win.getContentBounds(),b=view.getBounds();c.win.focus();view.webContents.focus();native('click',Math.round(origin.x+b.x+p.x),Math.round(origin.y+b.y+p.y),3);await pause(150);
  }
  async function firstSubmenu(){for(const key of ['Down','Right','Return']){native('key',key);await pause(180);}}
  await twc.executeJavaScript('document.querySelector("#prompt").focus()');
  await context(c.views.get(target.id).view,'#prompt');await firstSubmenu();
  check('native-menu-registers-prompt',c.views.get(target.id).fields.has('prompt'));
  const swc=c.views.get(source.id).view.webContents;
  const chosen=await swc.executeJavaScript(`(()=>{const e=document.querySelector('#sample'),r=document.createRange();r.selectNodeContents(e);const s=window.getSelection();s.removeAllRanges();s.addRange(r);return e.textContent})()`);
  await context(c.views.get(source.id).view,'#sample');screenshot('04-native-menu');await firstSubmenu();await pause(600);
  check('native-menu-transfers-selection',await twc.executeJavaScript(`document.querySelector('#prompt').value===${JSON.stringify(chosen)}`));
  await twc.executeJavaScript('document.querySelector("#lyrics").focus()');await c.register(target.id,'lyrics',twc.mainFrame);
  const text='CANARY_PRIVATE_PROMPT\n한글 🎵\n마지막 줄';await c.transfer(text,target.id,'lyrics');
  check('destination-exact',await twc.executeJavaScript(`document.querySelector('#lyrics').value===${JSON.stringify(text)}`));
  check('transfer-activates-member',c.snapshot().active===target.id&&c.snapshot().presentation==='multi');
  await c.transfer('do not replace',target.id,'lyrics');check('existing-input-preserved',await twc.executeJavaScript(`document.querySelector('#lyrics').value===${JSON.stringify(text)}`));
  const cw=c.views.get(canva.id).view.webContents;check('other-target-still-empty',await cw.executeJavaScript('document.querySelector("#lyrics").value===""'));
  // Auxiliary check of Android's shared DOM insertion code in desktop Chromium.
  // This is deliberately not counted as an Android runtime or touch-menu test.
  const bridge=require('../src/input-bridge.js'),run=(name,args)=>cw.executeJavaScriptInIsolatedWorld(1873,[{code:bridge.script(name,args)}]);
  await cw.executeJavaScript('document.querySelector("#prompt").focus()');check('shared-dom-register',await run('register',{field:'prompt'})==='ok');
  const mobileText='Mobile bridge test\n두 번째 줄';check('shared-dom-insert',await run('insert',{field:'prompt',text:mobileText})==='ok');check('shared-dom-exact',(await run('inspect',{field:'prompt',text:mobileText})).status==='exact');check('shared-dom-preserves-existing-text',await run('insert',{field:'prompt',text:'do not overwrite'})==='occupied');
  // Rename through the actual local renderer UI and its validated IPC bridge.
  await c.win.webContents.executeJavaScript(`window.workspace.action('rename',{id:${JSON.stringify(source.id)},name:'fixture-alias'})`);
  c.clip(text);await c.action('move',{from:source.id,to:canva.id,edge:'right'});await pause(200);
  check('moving-keeps-existing-webcontents',c.views.get(target.id).view.webContents===twc);
  check('moving-keeps-input',await twc.executeJavaScript(`document.querySelector('#lyrics').value===${JSON.stringify(text)}`));
  const outside=c.views.get(fifth).view.webContents;await c.action('activate',{id:fifth});await outside.executeJavaScript('document.querySelector("#prompt").focus()');await c.register(fifth,'prompt',outside.mainFrame);await c.action('activate',{id:source.id});const beforeTransferTree=JSON.stringify(c.snapshot().tree);
  await c.transfer('Standalone destination test',fifth,'prompt');check('transfer-activates-standalone-destination',c.snapshot().active===fifth&&c.snapshot().presentation==='single');check('standalone-transfer-exact',await outside.executeJavaScript(`document.querySelector('#prompt').value==='Standalone destination test'`));check('transfer-preserves-multiview',JSON.stringify(c.snapshot().tree)===beforeTransferTree);
  check('active-tab-is-highlighted',await c.win.webContents.executeJavaScript(`document.querySelectorAll('.tab.active').length===1&&document.querySelector('.tab.active').getAttribute('aria-selected')==='true'`));screenshot('06-transfer-focus');
  const extra=[];for(let i=0;i<25;i++)extra.push(await c.action('add',{service:'web',url:'https://example.test/limit/'+i}));await settle(c);check('thirty-tabs-allowed',c.snapshot().tabs.length===30);check('thirty-first-tab-rejected',await c.action('add',{service:'web',url:'https://example.test/overflow'})===false);check('last-active-tab-scrolls-into-view',await c.win.webContents.executeJavaScript(`(()=>{const a=document.querySelector('.tab.active').getBoundingClientRect(),b=document.querySelector('#tabs').getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1})()`));for(const id of extra)await c.action('close',{id});await c.action('activate',{id:fifth});await pause(150);
  const report=c.diag.report();check('report-has-transfer-outcomes',report.events.some(e=>e.event==='transfer.result'&&e.status==='exact')&&report.events.some(e=>e.status==='occupied'));
  check('report-excludes-content-and-alias',!JSON.stringify(report).includes('CANARY')&&!JSON.stringify(report).includes('fixture-alias')&&!JSON.stringify(report).includes('https://'));
  // Show the real report UI; remove fixture-only secret marker from screenshots by hiding views.
  await c.win.webContents.executeJavaScript('diagnosticsDialog()');await pause(250);screenshot('03-diagnostics');
  fs.writeFileSync(path.join(out,'desktop-results.json'),JSON.stringify({scope:'Linux offline fixtures only; real authenticated services untested',electron:process.versions.electron,chromium:process.versions.chrome,checks},null,2));
  fs.writeFileSync(path.join(out,'diagnostics-example.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:checks.length,failed:0}));app.quit();
})().catch(error=>{fs.writeFileSync(path.join(out,'desktop-failure.json'),JSON.stringify({checks,error:error.message},null,2));console.error('Fixture smoke failure:',error.message);try{screenshot('failure');}catch{}app.exit(1);});
