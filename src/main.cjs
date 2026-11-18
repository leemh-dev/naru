const {app,BrowserWindow,WebContentsView,Menu,ipcMain,session,clipboard,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
const workspace=require('./workspace.cjs'),layout=require('./layout.cjs'),{Diagnostics}=require('./diagnostics.cjs');
const navigation=require('./navigation.cjs'),input=require('./input-bridge.js');
const manifest=require('../package.json');
const fixtureMode=process.argv.includes('--fixtures'),WORLD=1873,views=new Map();
// Keep the initial preview's local workspace and normal browser session in place
// when the product's display name changes. No credential/session copying occurs.
app.setPath('userData',path.join(app.getPath('appData'),manifest.userDataDirectory));
if(process.env.WORKSPACE_TEST_PROFILE&&fixtureMode)app.setPath('userData',process.env.WORKSPACE_TEST_PROFILE);
const profile=app.getPath('userData'),stateFile=path.join(profile,fixtureMode?'fixture-workspace.json':'workspace.json');
let state=workspace.load(stateFile),win,diag,modal=false,busy=false,nextNumber=0,lastReport=null,persistTimer,revision=0,boundsRevision=-1;
const partition=fixtureMode?'fixture-session':'persist:workspace';
const sample='[Verse]\n오늘의 작은 시작 🎵\n[Style] 잔잔한 피아노, 80 BPM';
const fixtureURL=name=>'data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta charset="utf-8"><style>body{font:18px/1.7 system-ui;padding:24px;background:#fff;color:#203b35}pre{white-space:pre-wrap;background:#f1f5f2;padding:16px}textarea{width:90%;height:150px;font:inherit}label{display:block;margin-top:15px}</style><h2>'+name+' — 합성 시험 화면</h2><p>실제 AI 서비스가 아닙니다. 생성·전송 기능 없음.</p><pre id="sample">'+sample+'</pre><label>프롬프트<textarea id="prompt"></textarea></label><label>가사<textarea id="lyrics"></textarea></label><label>스타일<textarea id="style"></textarea></label>');
function notice(message){if(win&&!win.isDestroyed())win.webContents.send('notice',message);}
function persist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>{try{workspace.save(stateFile,state);}catch{diag?.log('app.error',{reason:'storage'});notice('작업 목록을 저장하지 못했습니다. 진단 로그를 확인하세요.');}},150);}
function snapshot(){return {...state,revision,clips:state.clips.map(c=>({id:c.id,preview:c.text.slice(0,100),chars:c.text.length})),services:workspace.SERVICES,categories:workspace.CATEGORIES,fixtureMode,diagnosticError:diag?.storageError||false,tabs:state.tabs.map(t=>({...t,registered:[...(views.get(t.id)?.fields||[])],loading:views.get(t.id)?.loading||false}))};}
function push(){revision++;if(win&&!win.isDestroyed())win.webContents.send('state',snapshot());persist();}
function listed(id){return state.tabs.find(t=>t.id===id);}
function visible(){return navigation.visible(state);}
function reveal(id){
  if(!navigation.activate(state,id))return;
  push();
}
async function focusDisplayed(id){
  const deadline=Date.now()+2000;
  while(Date.now()<deadline){
    const t=views.get(id);
    if(!t||state.active!==id||modal)return false;
    if(boundsRevision===revision&&t.displayed){win.focus();t.view.webContents.focus();return true;}
    await new Promise(resolve=>setTimeout(resolve,16));
  }
  return false;
}
function logFor(event,id,extra={}){const t=views.get(id);diag.log(event,{tab:t?.number,service:fixtureMode?'fixture':listed(id)?.service,...extra});}
function loginPage(wc){try{return /\/(?:auth|oauth|authorize|callback|login|log-in|signin|sign-in|signup|sign-up|register)(?:\/|$)/i.test(new URL(wc.getURL()).pathname);}catch{return true;}}
async function register(id,field,frame){
  const t=views.get(id);if(!t)return;
  const wc=t.view.webContents;let status='ok';
  if(loginPage(wc))status='login';else if(frame!==wc.mainFrame)status='iframe';
  else try{status=await wc.executeJavaScriptInIsolatedWorld(WORLD,[{code:input.script('register',{field})}]);}catch{status='error';}
  if(status==='ok')t.fields.add(field);else t.fields.delete(field);
  logFor('field.register',id,{field,status});push();
  notice(status==='ok'?'받을 입력칸을 지정했습니다. 원문을 선택하고 우클릭해 보내세요.':status==='login'?'로그인 후 입력칸을 지정하세요.':status==='iframe'?'별도 프레임 안의 입력칸은 이 시험판에서 지원하지 않습니다.':'텍스트 입력칸을 클릭한 뒤 다시 지정하세요.');
}
async function transfer(text,id,field){
  const t=views.get(id);if(!t||!t.fields.has(field)||busy)return;
  if(text.length>50000){notice('한 번에 5만 자까지 전달할 수 있습니다.');logFor('transfer.result',id,{status:'too-long'});return;}
  busy=true;const start=Date.now();let result={status:'error'};
  try{
    const wc=t.view.webContents;
    if(loginPage(wc)){result={status:'login'};return;}
    modal=false;reveal(id);if(!await focusDisplayed(id)){result={status:'focus-failed'};return;}
    const ready=await wc.executeJavaScriptInIsolatedWorld(WORLD,[{code:input.script('ready',{field})}]);
    if(ready!=='ok'){result={status:ready};if(ready==='gone'){t.fields.delete(field);push();}return;}
    await wc.insertText(text);await new Promise(r=>setTimeout(r,350));
    result=await wc.executeJavaScriptInIsolatedWorld(WORLD,[{code:input.script('inspect',{field,text})}]);
  }catch{result={status:'error'};}
  finally{
    busy=false;logFor('transfer.result',id,{field,...result,chars:text.length,elapsedMs:Date.now()-start});
    const messages={exact:'입력 완료 · 원문과 줄바꿈이 일치합니다. 전송·생성은 누르지 않았습니다.',changed:'입력 결과가 원문과 다릅니다. 줄바꿈·글자 제한을 확인하세요.',occupied:'기존 입력을 보호해 전달을 멈췄습니다. 빈 입력칸을 지정하세요.',login:'로그인 후 입력칸을 다시 지정하세요.',gone:'입력칸이 바뀌었습니다. 다시 지정하세요.'};notice(messages[result.status]||'입력하지 못했습니다. 진단 보고서에 결과를 기록했습니다.');
  }
  return result;
}
function clip(text){if(!text||text.length>50000)return;state.clips.unshift({id:randomUUID(),text});state.clips=state.clips.slice(0,50);diag.log('clip.saved',{chars:text.length,count:state.clips.length});push();notice('선택한 글을 이 PC에 보관했습니다. 메뉴의 보관한 글에서 다시 쓸 수 있습니다.');}
function destinations(text){return state.tabs.flatMap(tab=>[...(views.get(tab.id)?.fields||[])].map(field=>({label:`${tab.alias} · ${{prompt:'프롬프트',lyrics:'가사',style:'스타일'}[field]}`,enabled:!!text&&!busy,click:()=>void transfer(text,tab.id,field)})));}
function bind(id,view){
  const wc=view.webContents,t=views.get(id);
  wc.on('focus',()=>{if(t.displayed&&!modal&&state.active!==id&&visible().includes(id)){navigation.activate(state,id,{focusOnly:true});push();}});
  wc.setWindowOpenHandler(({url})=>workspace.safeURL(url)&&url.startsWith('https://')?{action:'allow',overrideBrowserWindowOptions:{webPreferences:{partition,nodeIntegration:false,contextIsolation:true,sandbox:true}}}:{action:'deny'});
  wc.on('will-navigate',(e,url)=>{if(!workspace.safeURL(url))e.preventDefault();});
  wc.on('did-start-navigation',(_e,_url,_inPlace,main)=>{if(main){t.fields.clear();push();}});
  const updateURL=(_event,url)=>{if(fixtureMode)return;const tab=listed(id),valid=workspace.restorableURL(url);if(tab&&valid){tab.url=valid;persist();}};
  wc.on('did-navigate',updateURL);wc.on('did-navigate-in-page',(_e,url,main)=>{if(main)updateURL(_e,url);});
  wc.on('did-start-loading',()=>{t.loading=true;t.failed=false;t.started=Date.now();push();});
  wc.on('did-stop-loading',()=>{t.loading=false;logFor('page.load',id,{elapsedMs:Date.now()-(t.started||Date.now()),status:t.failed?'error':'ok'});push();});
  wc.on('did-fail-load',(_e,code,_description,_url,main)=>{if(main&&code!==-3){t.failed=true;logFor('page.failure',id,{status:'error',reason:'network',errorCode:code});notice('페이지를 열지 못했습니다. 메뉴에서 새로고침하거나 진단 보고서를 확인하세요.');}});
  wc.on('render-process-gone',(_e,details)=>{logFor('page.crash',id,{reason:'renderer',exitCode:details.exitCode});t.fields.clear();push();});
  wc.on('context-menu',(event,p)=>{
    event.preventDefault();const text=p.selectionText||'';const dest=destinations(text);
    const entries=[{label:'받을 입력칸 지정',enabled:p.isEditable,submenu:['prompt','lyrics','style'].map(field=>({label:{prompt:'프롬프트',lyrics:'가사',style:'스타일'}[field],click:()=>void register(id,field,p.frame)}))},
      {label:'다른 작업에 넣기',enabled:!!text&&dest.length>0,submenu:dest.length?dest:[{label:'먼저 받을 칸을 지정하세요',enabled:false}]},
      {label:'복사하고 보관',enabled:!!text,click:()=>{clipboard.writeText(text);clip(text);}},{type:'separator'},{role:'copy'},{role:'paste'},{role:'selectAll'}];
    Menu.buildFromTemplate(entries).popup({window:win});
  });
}
function create(tab){
  const view=new WebContentsView({webPreferences:{partition,nodeIntegration:false,contextIsolation:true,sandbox:true}});
  views.set(tab.id,{view,fields:new Set(),number:++nextNumber,loading:false});win.contentView.addChildView(view);view.setVisible(false);bind(tab.id,view);
  void view.webContents.loadURL(fixtureMode?fixtureURL(workspace.SERVICES[tab.service].name):tab.url).catch(()=>{});logFor('tab.open',tab.id);
}
function add(service,url){
  if(state.tabs.length>=navigation.MAX_TABS){notice('탭은 최대 30개까지 열 수 있습니다. 사용하지 않는 탭을 닫아 주세요.');return false;}
  const info=workspace.SERVICES[service]||workspace.SERVICES.web,valid=workspace.safeURL(url||info.url);if(!valid)throw new Error('url');
  const tab={id:randomUUID(),service:workspace.SERVICES[service]?service:'web',url:workspace.restorableURL(valid)||new URL(valid).origin+'/',alias:info.name};state.tabs.push(tab);create(tab);if(tab.url!==valid)void views.get(tab.id).view.webContents.loadURL(valid).catch(()=>{});reveal(tab.id);return tab.id;
}
function close(id){
  if(!listed(id))return;logFor('tab.close',id);const t=views.get(id);win.contentView.removeChildView(t.view);t.view.webContents.close();views.delete(id);navigation.remove(state,id);push();
}
function bounds(payload){
  if(!payload||payload.revision!==revision||!Array.isArray(payload.boxes))return;const data=payload.boxes,enabled=new Set(visible());const [width,height]=win.getContentSize();
  for(const [id,t] of views){const box=data.find(b=>b.id===id);const ok=!modal&&enabled.has(id)&&box&&['x','y','width','height'].every(k=>Number.isFinite(box[k]));t.displayed=!!ok;if(!ok){t.view.setVisible(false);continue;}
    const x=Math.max(0,Math.round(box.x)),y=Math.max(48,Math.round(box.y));
    t.view.setBounds({x,y,width:Math.max(0,Math.min(width-x,Math.round(box.width))),height:Math.max(0,Math.min(height-y,Math.round(box.height)))});t.view.setVisible(true);
  }
  boundsRevision=revision;
}
async function action(type,data={}){
  try{
    switch(type){
      case 'get':return snapshot();
      case 'modal':modal=!!data.open;for(const t of views.values())if(modal){t.view.setVisible(false);t.displayed=false;}return true;
      case 'add':return add(data.service,data.url);
      case 'activate':reveal(data.id);await focusDisplayed(data.id);break;
      case 'close':close(data.id);break;
      case 'rename':{const t=listed(data.id);if(t&&typeof data.name==='string')t.alias=data.name.trim().slice(0,60)||workspace.SERVICES[t.service].name;push();break;}
      case 'workspace-name':if(typeof data.name==='string')state.name=data.name.trim().slice(0,60)||'기본 워크스페이스';push();break;
      case 'navigate':{const t=views.get(data.id),url=workspace.safeURL(data.url);if(t&&url){await t.view.webContents.loadURL(url);reveal(data.id);}break;}
      case 'reload':views.get(state.active)?.view.webContents.reload();break;
      case 'back':{const nav=views.get(state.active)?.view.webContents.navigationHistory;if(nav?.canGoBack())nav.goBack();break;}
      case 'multiview':if(!navigation.configure(state,data.ids,data.mode))return false;diag.log('layout.change',{layout:data.mode,count:visible().length});push();break;
      case 'layout':if(data.mode==='single'){state.presentation='single';push();}else if(['grid','columns'].includes(data.mode)&&state.tree){state.mode=data.mode;state.tree=layout.preset(layout.ids(state.tree),data.mode);state.presentation='multi';if(!layout.ids(state.tree).includes(state.active))state.active=layout.ids(state.tree)[0];diag.log('layout.change',{layout:data.mode,count:visible().length});push();}break;
      case 'move':state.tree=layout.move(state.tree,data.from,data.to,data.edge);state.mode='custom';state.presentation='multi';diag.log('layout.change',{layout:'custom',count:visible().length});push();break;
      case 'resize':if(typeof data.path==='string'&&Number.isFinite(data.ratio)){state.tree=layout.resize(state.tree,data.path,data.ratio);state.mode='custom';push();}break;
      case 'clip-copy':{const c=state.clips.find(c=>c.id===data.id);if(c)clipboard.writeText(c.text);break;}
      case 'clip-send':{const c=state.clips.find(c=>c.id===data.id);if(c)await transfer(c.text,data.target,data.field);break;}
      case 'clip-delete':state.clips=state.clips.filter(c=>c.id!==data.id);push();break;
      case 'report':lastReport=diag.report();return lastReport;
      case 'report-export':{
        if(!lastReport)lastReport=diag.report();const out=await dialog.showSaveDialog(win,{title:'진단 보고서 저장',defaultPath:'workspace-diagnostics.json',filters:[{name:'JSON',extensions:['json']}]});
        if(!out.canceled&&out.filePath){fs.writeFileSync(out.filePath,JSON.stringify(lastReport,null,2),{mode:0o600});diag.log('report.export',{status:'ok'});notice('진단 보고서를 저장했습니다. 자동으로 업로드하지 않습니다.');return true;}return false;
      }
      case 'diagnostics-toggle':state.diagnostics=!!data.enabled;diag.enabled=state.diagnostics;diag.log('diagnostics.changed',{status:state.diagnostics?'ok':'blocked'});push();break;
      case 'diagnostics-clear':diag.clear();lastReport=null;return true;
      default:return null;
    }
    return true;
  }catch{diag.log('app.error',{reason:'input'});notice('요청을 처리하지 못했습니다. 주소와 현재 화면을 확인하세요.');return false;}
}
async function boot(){
  await app.whenReady();
  diag=new Diagnostics(path.join(profile,fixtureMode?'fixture-diagnostics':'diagnostics'),{appVersion:manifest.version,electron:process.versions.electron,chromium:process.versions.chrome,platform:process.platform,arch:process.arch,osRelease:os.release()});diag.enabled=state.diagnostics;diag.log('app.start');
  const sess=session.fromPartition(partition);sess.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;if(proxy)await sess.setProxy({proxyRules:proxy});
  win=new BrowserWindow({width:1440,height:980,minWidth:1000,minHeight:650,backgroundColor:'#f3f5f2',title:app.getName(),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});win.setMenu(null);
  ipcMain.handle('action',(e,p)=>e.sender===win.webContents&&p&&typeof p.type==='string'?action(p.type,p.data):null);
  ipcMain.on('bounds',(e,data)=>{if(e.sender===win.webContents)bounds(data);});
  await win.loadFile(path.join(__dirname,'index.html'));
  for(const tab of state.tabs)create(tab);diag.log('workspace.restore',{count:state.tabs.length});push();
  app.on('child-process-gone',(_event,details)=>diag.log('app.error',{reason:'process',exitCode:details.exitCode}));
  win.webContents.on('render-process-gone',(_event,details)=>diag.log('app.error',{reason:'renderer',exitCode:details.exitCode}));
  return {win,views,action,register,transfer,clip,snapshot,diag,profile,fixtureMode};
}
const ready=boot();ready.catch(()=>{dialog.showErrorBox('시작 오류','앱을 시작하지 못했습니다.');app.quit();});
app.on('before-quit',()=>{clearTimeout(persistTimer);try{workspace.save(stateFile,state);}catch{}diag?.log('app.stop');});
app.on('window-all-closed',()=>app.quit());
process.on('uncaughtExceptionMonitor',()=>diag?.log('app.error',{reason:'process'}));
module.exports={ready};
