const api=window.workspace,$=s=>document.querySelector(s);let state,toastTimer,drag=null,resize=null,suppressClick=false,lastActive=null;
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,className)=>{const n=el('button',className,text);n.addEventListener('click',fn);return n;};
function updateTop(){const top=48+$('#pending-bar').offsetHeight+$('#toast').offsetHeight;$('#panels').style.top=top+'px';$('#empty').style.top=top+'px';requestAnimationFrame(sendBounds);}
function flash(text){const n=$('#toast');n.textContent=text;n.style.display='block';clearTimeout(toastTimer);updateTop();toastTimer=setTimeout(()=>{n.style.display='none';updateTop();},6500);}
function sendBounds(){if(!state)return;api.bounds({revision:state.revision,boxes:[...document.querySelectorAll('.web-slot')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.id,x:r.x,y:r.y,width:r.width,height:r.height};})});}
const obs=new ResizeObserver(sendBounds);obs.observe($('#panels'));
async function openDialog(title){await api.action('modal',{open:true});$('#dialog').classList.remove('service-dialog');const body=$('#dialog-body');body.replaceChildren(el('h2','',title));if(!$('#dialog').open)$('#dialog').showModal();return body;}
async function closeDialog(){$('#dialog').close();await api.action('modal',{open:false});requestAnimationFrame(sendBounds);}
$('#dialog-close').onclick=closeDialog;$('#dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
function icon(service){const info=state.services[service]||state.services.web;const n=el('span','icon category-'+(info.categories?.[0]||'web')+' '+service,info.icon||'↗');if(info.favicon){const img=el('img','service-favicon');img.src=info.favicon;img.alt='';img.onerror=()=>img.remove();n.prepend(img);}n.title=info.name;n.setAttribute('aria-hidden','true');return n;}
function glyph(name){const paths={plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',single:'M4 4h16v16H4z',grid:'M4 4h16v16H4zM4 12h16M12 4v16',more:'M5 12h.01M12 12h.01M19 12h.01',expand:'M14 4h6v6M20 4l-8 8M10 20H4v-6',grip:'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01'};const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.classList.add('glyph');n.setAttribute('aria-hidden','true');const p=document.createElementNS(n.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.more);n.append(p);return n;}
function iconButton(name,label,fn){const n=button('',fn,'icon-button');n.append(glyph(name));n.title=label;n.setAttribute('aria-label',label);return n;}
function ids(t){return !t?[]:t.id?[t.id]:[...ids(t.a),...ids(t.b)];}
function render(next){
  state=next;$('#pending-bar').classList.toggle('hidden',!state.pending?.target);updateTop();if(drag||resize)return;const bar=$('#tabs'),scroll=bar.scrollLeft;bar.replaceChildren();const shown=state.presentation==='single'?[state.active]:ids(state.tree);document.body.dataset.presentation=state.presentation;
  for(const t of state.tabs){const n=el('div','tab'+(t.id===state.active?' active':'')+(shown.includes(t.id)?' visible':'')+(ids(state.tree).includes(t.id)?' member':''));n.dataset.id=t.id;n.title=t.alias;n.append(icon(t.service),el('span','tab-name',t.alias));n.setAttribute('role','tab');n.setAttribute('tabindex','0');n.setAttribute('aria-selected',t.id===state.active);
    n.addEventListener('click',()=>{if(!suppressClick)api.action('activate',{id:t.id});});n.addEventListener('keydown',e=>{if(e.key==='Enter')api.action('activate',{id:t.id});});n.addEventListener('dblclick',()=>rename(t));n.addEventListener('contextmenu',e=>{e.preventDefault();tabOptions(t);});
    const close=button('',e=>{e.stopPropagation();api.action('close',{id:t.id});},'tab-close');close.append(glyph('close'));close.setAttribute('aria-label',t.alias+' 닫기');n.append(close);bar.append(n);
  }bar.scrollLeft=scroll;
  if(lastActive!==state.active){bar.querySelector('.tab.active')?.scrollIntoView({block:'nearest',inline:'nearest'});lastActive=state.active;}
  $('#single').classList.toggle('active',state.presentation==='single');$('#single').setAttribute('aria-pressed',state.presentation==='single');$('#multiview').classList.toggle('active',state.presentation==='multi');$('#multiview').setAttribute('aria-pressed',state.presentation==='multi');$('#multiview').replaceChildren(glyph('grid'),el('span','label','멀티뷰'));if(ids(state.tree).length)$('#multiview').append(el('span','count',String(ids(state.tree).length)));$('#add').title=`작업 추가 · ${state.tabs.length}/30`;
  $('#empty').classList.toggle('hidden',state.tabs.length>0);$('#panels').replaceChildren();
  const tree=state.presentation==='single'&&state.active?{id:state.active}:state.tree;if(tree)$('#panels').append(renderNode(tree));
  requestAnimationFrame(sendBounds);
}
function renderNode(tree,route=''){
  if(tree.id){
    const t=state.tabs.find(t=>t.id===tree.id);if(!t)return el('div');
    const pane=el('section','pane'+(t.id===state.active?' focused':''));pane.dataset.id=t.id;
    const bar=el('div','pane-bar'),handle=el('button','handle');handle.append(glyph('grip'));handle.title='드래그해서 위치 교환·가장자리 분할';handle.setAttribute('aria-label',t.alias+' 패널 이동');
    handle.onpointerdown=async e=>{if(e.button!==0)return;e.preventDefault();drag={from:t.id};await api.action('modal',{open:true});};
    const title=el('span','pane-title',t.alias+(t.loading?' · 로딩':''));title.onclick=()=>api.action('activate',{id:t.id});
    bar.append(handle,title,iconButton('expand','이 패널 크게 보기',async()=>{await api.action('activate',{id:t.id});api.action('layout',{mode:'single'});}),iconButton('more','탭 설정',()=>tabOptions(t)));
    const slot=el('div','web-slot');slot.dataset.id=t.id;pane.append(bar,slot,el('div','drop-text','여기에 놓기'));return pane;
  }
  const n=el('div','split '+tree.axis),a=el('div','branch'),b=el('div','branch'),d=el('div','divider');a.style.flex=tree.ratio+' 1 0';b.style.flex=(1-tree.ratio)+' 1 0';a.append(renderNode(tree.a,route+'a'));b.append(renderNode(tree.b,route+'b'));
  d.onpointerdown=async e=>{if(e.button!==0)return;e.preventDefault();resize={path:route,axis:tree.axis,rect:n.getBoundingClientRect(),a,b,ratio:tree.ratio};await api.action('modal',{open:true});};n.append(a,d,b);return n;
}
function dropAt(e){const pane=document.elementFromPoint(e.clientX,e.clientY)?.closest('.pane');if(!pane)return null;const r=pane.getBoundingClientRect(),x=(e.clientX-r.x)/r.width,y=(e.clientY-r.y)/r.height;return {to:pane.dataset.id,edge:x<.22?'left':x>.78?'right':y<.22?'top':y>.78?'bottom':'center',pane};}
document.addEventListener('pointermove',e=>{
  if(resize){const r=resize.rect;resize.ratio=Math.max(.15,Math.min(.85,resize.axis==='x'?(e.clientX-r.x)/r.width:(e.clientY-r.y)/r.height));resize.a.style.flex=resize.ratio+' 1 0';resize.b.style.flex=(1-resize.ratio)+' 1 0';}
  if(drag){document.querySelectorAll('.pane.drop').forEach(p=>p.classList.remove('drop'));const d=dropAt(e);if(d&&d.to!==drag.from){d.pane.classList.add('drop');d.pane.querySelector('.drop-text').textContent={center:'위치 교환',left:'왼쪽에 배치',right:'오른쪽에 배치',top:'위에 배치',bottom:'아래에 배치'}[d.edge];}}
});
document.addEventListener('pointerup',async e=>{
  if(resize){const {path,ratio}=resize;resize=null;await api.action('resize',{path,ratio});await api.action('modal',{open:false});sendBounds();}
  if(drag){const d=dropAt(e),from=drag.from;drag=null;document.querySelectorAll('.pane.drop').forEach(p=>p.classList.remove('drop'));if(d)await api.action('move',{from,to:d.to,edge:d.edge});await api.action('modal',{open:false});sendBounds();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(drag||resize)){drag=null;resize=null;api.action('modal',{open:false});render(state);}});
$('#tabs').addEventListener('wheel',e=>{e.preventDefault();$('#tabs').scrollLeft+=e.deltaY||e.deltaX;},{passive:false});
$('#tabs').addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.tab-close'))return;const start=e.clientX,initial=$('#tabs').scrollLeft;let moved=false;
  const move=ev=>{if(Math.abs(ev.clientX-start)>6)moved=true;if(moved){suppressClick=true;$('#tabs').classList.add('dragging');$('#tabs').scrollLeft=initial-(ev.clientX-start);}};
  const up=()=>{document.removeEventListener('pointermove',move);$('#tabs').classList.remove('dragging');setTimeout(()=>suppressClick=false,0);};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
});
async function addDialog(){
  const body=await openDialog('작업 추가');$('#dialog').classList.add('service-dialog');
  body.append(el('p','',state.fixtureMode?'합성 화면 시험 모드 · 실제 서비스에 접속하지 않습니다.':'어떤 작업을 시작할까요? 서비스를 골라 원본 웹 화면을 여세요.'));
  body.append(el('p','meta',`${state.tabs.length}/30개 탭 · 같은 서비스를 여러 번 열 수 있습니다.`));
  if(state.tabs.length>=30){body.append(el('p','','탭이 30개입니다. 사용하지 않는 탭을 닫은 뒤 추가하세요.'));return;}
  const services=Object.entries(state.services).filter(([id])=>id!=='web');
  const categories=state.categories,selected=new Set();
  const search=el('input');search.id='service-search';search.type='search';search.placeholder='서비스 검색 · ChatGPT, 수노, 미드저니…';search.setAttribute('aria-label','AI 서비스 검색');
  const filters=el('div','service-categories');filters.setAttribute('role','group');filters.setAttribute('aria-label','서비스 분류');
  const count=el('p','meta service-result-count');count.setAttribute('role','status');
  const results=el('div','catalog-results');results.setAttribute('aria-label','서비스 바로가기');
  const categoryName=id=>categories.find(c=>c.id===id)?.name||'';
  function draw(){
    const terms=search.value.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches=services.filter(([id,s])=>{
      const text=[id,s.name,s.description,s.keywords,...s.categories.map(categoryName)].join(' ').normalize('NFKC').toLocaleLowerCase();
      return (!selected.size||s.categories.some(c=>selected.has(c)))&&terms.every(term=>text.includes(term));
    });
    count.textContent=`${matches.length}개 서비스${terms.length?' · 검색 결과':''}`;
    for(const b of filters.children){const on=b.dataset.category==='all'?!selected.size:selected.has(b.dataset.category);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);}
    results.replaceChildren();results.scrollTop=0;
    if(!matches.length){results.append(el('p','service-no-results','검색 결과가 없습니다. 다른 이름을 검색하거나 아래에서 웹 주소를 직접 여세요.'));return;}
    for(const category of categories){
      const entries=matches.filter(([,s])=>s.categories[0]===category.id);
      if(!entries.length)continue;
      const section=el('section','service-section');section.append(el('h3','',category.name));
      const grid=el('div','service-grid');
      for(const [id,s]of entries){
        const b=button('',async()=>{b.disabled=true;try{if(await api.action('add',{service:id}))await closeDialog();}finally{b.disabled=false;}});
        b.dataset.service=id;b.title=s.name+' · '+s.description;b.setAttribute('aria-label',s.name+' 열기');
        const label=el('span','service-copy');label.append(el('span','service-name',s.name),el('span','service-description',s.description));
        b.append(icon(id),label);grid.append(b);
      }
      section.append(grid);results.append(section);
    }
  }
  for(const category of [{id:'all',name:'All'},...categories]){
    const b=button(category.name,()=>{if(category.id==='all')selected.clear();else if(selected.has(category.id))selected.delete(category.id);else selected.add(category.id);draw();});b.dataset.category=category.id;filters.append(b);
  }
  // Search respects multiple selected categories (union); All removes the filter.
  search.addEventListener('input',draw);
  filters.addEventListener('wheel',e=>{filters.scrollLeft+=e.deltaY;e.preventDefault();},{passive:false});
  filters.addEventListener('pointerdown',e=>{const x=e.clientX,left=filters.scrollLeft;let moved=false;const move=v=>{if(Math.abs(v.clientX-x)>8)moved=true;if(moved)filters.scrollLeft=left+x-v.clientX;};const up=()=>{document.removeEventListener('pointermove',move);if(moved){const stop=v=>{v.preventDefault();v.stopPropagation();};filters.addEventListener('click',stop,{capture:true,once:true});setTimeout(()=>filters.removeEventListener('click',stop,true),0);}};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});});
  const google=button('브라우저 · Google',async()=>{if(await api.action('add',{service:'web',url:'https://www.google.com/'}))await closeDialog();},'google-shortcut');google.id='google-shortcut';const googleIcon=el('img','service-favicon');googleIcon.src='assets/services/google.png';googleIcon.alt='';googleIcon.onerror=()=>googleIcon.remove();google.prepend(googleIcon);
  const form=el('form','service-url-form'),input=el('input');input.id='service-url';input.type='url';input.required=true;input.placeholder='https://… 웹 주소 또는 비공개 대화 주소';input.setAttribute('aria-label','직접 열 웹 주소');
  const submit=el('button','primary','웹 주소로 열기');submit.type='submit';form.append(input,submit);
  form.addEventListener('submit',async e=>{e.preventDefault();if(await api.action('add',{service:'web',url:input.value}))await closeDialog();});
  body.append(search,filters,google,count,results,form);draw();search.focus();
}
async function multiviewDialog(){
  const body=await openDialog('함께 볼 작업');body.append(el('p','','최대 4개 탭을 고르세요. 선택하지 않은 탭은 한 화면으로 열리며, 멀티뷰 구성은 그대로 유지됩니다.'));
  if(!state.tabs.length){body.append(button('먼저 작업 추가',addDialog,'primary'));return;}
  const selected=new Set(ids(state.tree));if(!selected.size&&state.active)selected.add(state.active);let mode=state.mode==='columns'?'columns':'grid';
  const segment=el('div','segmented');for(const [value,label]of [['grid','가로 · 2×2'],['columns','세로 · 좌우 4열']]){const b=button(label,()=>{mode=value;for(const x of segment.children){x.classList.toggle('selected',x.dataset.value===mode);x.setAttribute('aria-pressed',x.dataset.value===mode);}});b.dataset.value=value;b.classList.toggle('selected',value===mode);b.setAttribute('aria-pressed',value===mode);segment.append(b);}body.append(segment);
  const count=el('p','meta'),list=el('div','tab-picker');const refresh=()=>{count.textContent=`${selected.size}/4개 선택`;for(const box of list.querySelectorAll('input'))box.disabled=!box.checked&&selected.size>=4;};
  for(const tab of state.tabs){const label=el('label','tab-choice'),box=el('input');box.type='checkbox';box.value=tab.id;box.checked=selected.has(tab.id);box.onchange=()=>{if(box.checked)selected.add(tab.id);else selected.delete(tab.id);refresh();};label.append(box,icon(tab.service),el('span','',tab.alias));list.append(label);}body.append(count,list);refresh();
  const actions=el('div','actions');actions.append(button('적용',async()=>{if(await api.action('multiview',{ids:[...selected],mode}))closeDialog();},'primary'),button('멀티뷰 구성 해제',async()=>{await api.action('multiview',{ids:[],mode});closeDialog();}));body.append(actions);
}
async function rename(t){const body=await openDialog('탭 별칭 바꾸기');body.append(el('p','','원본 서비스의 대화 제목은 바꾸지 않습니다.'));const input=el('input');input.value=t.alias;input.maxLength=60;body.append(input,button('저장',async()=>{await api.action('rename',{id:t.id,name:input.value});closeDialog();},'primary'));input.focus();input.select();}
async function tabOptions(t){const body=await openDialog(t.alias);const input=el('input');input.type='url';input.value=t.url;body.append(el('p','','이 주소는 로컬 작업 복원에 사용되며 진단 로그에는 포함되지 않습니다.'),input);const buttons=el('div','actions');buttons.append(button('이 주소 열기',async()=>{closeDialog();await api.action('navigate',{id:t.id,url:input.value});}),button('별칭 바꾸기',()=>rename(t)),button('이 탭 닫기',async()=>{await api.action('close',{id:t.id});closeDialog();}));body.append(buttons);const other=state.tabs.filter(x=>x.id!==t.id&&ids(state.tree).includes(x.id));if(other.length){const select=el('select');for(const x of other){const opt=el('option','',x.alias);opt.value=x.id;select.append(opt);}body.append(el('p','','드래그 대신 다른 패널과 위치를 교환할 수도 있습니다.'),select,button('위치 교환',async()=>{await api.action('move',{from:t.id,to:select.value,edge:'center'});closeDialog();}));}}
async function menu(){const body=await openDialog('Plynt');body.append(el('p','','작업은 이 기기에 저장됩니다. 같은 서비스의 탭은 로그인 상태를 공유합니다.'));const actions=el('div','actions');actions.append(button('워크스페이스',workspacesDialog),button('글 보내기',sendDialog),button('보관한 글',clipsDialog),button('진단 보고서',diagnosticsDialog),button('새로고침',()=>{api.action('reload');closeDialog();}),button('뒤로',()=>{api.action('back');closeDialog();}),button('로그인 정보 지우기',clearSessionsDialog));body.append(actions);}
async function clearSessionsDialog(){const body=await openDialog('사이트 로그인 정보 지우기');body.append(el('p','','모든 서비스의 로그인 쿠키와 웹 저장소를 지웁니다. 탭과 워크스페이스는 유지됩니다. 다음 접속 시 다시 로그인해야 합니다.'),button('로그인 정보 지우기',async()=>{await api.action('session-clear',{confirm:true});closeDialog();}));}
async function workspacesDialog(){const body=await openDialog('워크스페이스');const fresh=await api.action('get');body.append(el('p','',fresh.storageBlocked?'저장 파일 오류 · 기존 파일은 보존되어 있습니다.':'이 기기에 자동 저장 · '+(fresh.lastSaved?new Date(fresh.lastSaved).toLocaleTimeString():'저장 대기')));const name=el('input');name.value=state.name;name.maxLength=60;name.setAttribute('aria-label','워크스페이스 이름');body.append(name);const actions=el('div','actions');actions.append(button('현재 작업 저장',async()=>{await api.action('workspace-name',{name:name.value});if(await api.action('workspace-save'))flash('워크스페이스를 저장했습니다.');workspacesDialog();}),button('다른 이름으로 저장',async()=>{if(await api.action('workspace-create',{name:name.value,copy:true}))closeDialog();}),button('새 빈 워크스페이스',async()=>{if(await api.action('workspace-create',{name:name.value,copy:false}))closeDialog();}));body.append(actions);for(const w of fresh.workspaces){const b=button(`${w.id===fresh.workspaceId?'● ':''}${w.name} · ${w.count}개 탭`,async()=>{if(await api.action('workspace-switch',{id:w.id}))closeDialog();},'workspace-choice');b.dataset.workspace=w.id;body.append(b);}body.append(el('p','meta','입력 중인 글·스크롤 위치는 서비스에 따라 복원되지 않을 수 있습니다.'))}
async function sendDialog(){
 const body=await openDialog('글 보내기');const material=await api.action('send-get');
 body.append(button('복사한 글 가져오기',async()=>{if(await api.action('send-clipboard'))sendDialog();},'primary'),button('ChatGPT 답변 가져오기 · 시험',answersDialog));
 if(!material){body.append(el('p','','답변의 복사 버튼을 누른 뒤 ‘복사한 글 가져오기’를 선택하세요. 선택한 글과 보관한 글도 전달할 수 있습니다.'));return;}
 const preview=el('pre','transfer-preview',material.text);body.append(preview,el('p','meta',`${material.text.length}자 · 입력 확인에서 멈춥니다.`));
 const fresh=await api.action('get');
 const choose=async(id,field)=>{await closeDialog();await api.action('send-target',{id,field});};
 if(fresh.recent?.length){body.append(el('h3','','최근 목적지'));for(const r of fresh.recent){const tab=fresh.tabs.find(t=>t.id===r.id);if(tab)body.append(button(tab.alias+' · '+{prompt:'프롬프트',lyrics:'가사',style:'스타일'}[r.field],()=>choose(r.id,r.field),'destination'));}}
 body.append(el('h3','','열린 탭'));for(const t of fresh.tabs.filter(t=>t.id!==material.source)){const row=el('div','destination-row');row.append(button(t.alias+(t.registered.length?'':' · 입력칸 선택 필요'),()=>choose(t.id),'destination'));for(const field of t.registered)row.append(button({prompt:'프롬프트',lyrics:'가사',style:'스타일'}[field],()=>choose(t.id,field)));body.append(row);}
 if(!fresh.tabs.some(t=>t.id!==material.source))body.append(el('p','','다른 탭을 먼저 열어 주세요. 글은 대상 선택까지 유지됩니다.'),button('탭 추가',addDialog));
 body.append(button('보관함에 저장',()=>api.action('send-save')),button('전달 취소',async()=>{await api.action('send-cancel');closeDialog();}));
}
async function answersDialog(){const body=await openDialog('ChatGPT 답변 가져오기 · 시험');body.append(el('p','','현재 페이지에 불러온 답변을 읽습니다. 가져온 내용을 확인한 뒤 대상을 선택하세요.'));const answers=await api.action('send-answers');if(!answers.length)body.append(el('p','','읽을 수 있는 답변이 없습니다. ChatGPT 화면을 확인하거나 답변의 복사 버튼을 이용해 주세요.'));for(const a of answers)body.append(button(a.preview,async()=>{if(await api.action('send-answer',{index:a.index}))sendDialog();},'destination'));}
async function clipsDialog(){const body=await openDialog('보관한 글');body.append(el('p','','최대 50개를 이 기기에 보관합니다.'));if(!state.clips.length)body.append(el('p','','아직 보관한 글이 없습니다.'));for(const c of state.clips){const card=el('div','clip');card.append(el('p','',c.preview+(c.chars>100?'…':'')));const actions=el('div','actions');actions.append(button('보내기',async()=>{if(await api.action('clip-stage',{id:c.id}))sendDialog();}),button('복사',()=>api.action('clip-copy',{id:c.id})),button('삭제',async()=>{await api.action('clip-delete',{id:c.id});clipsDialog();}));card.append(actions);body.append(card);}}
async function diagnosticsDialog(){const body=await openDialog('진단 보고서');body.append(el('p','','이 PC에서만 수집합니다. 대화·프롬프트 원문, 페이지 주소, 별칭, 쿠키, 비밀번호, 화면 캡처는 포함하지 않습니다. 내보내기도 자동 업로드하지 않습니다.'));const report=await api.action('report');body.append(el('p','meta',`기록 ${report.events.length}개 · ${state.diagnostics?'수집 중':'수집 꺼짐'}${report.storageError?' · 저장 오류 있음':''}`));const pre=el('pre','diagnostics-preview',JSON.stringify(report,null,2));body.append(pre);const actions=el('div','actions');actions.append(button('이 내용으로 파일 저장',()=>api.action('report-export'),'primary'),button(state.diagnostics?'수집 끄기':'수집 켜기',async()=>{await api.action('diagnostics-toggle',{enabled:!state.diagnostics});diagnosticsDialog();}),button('기록 지우기',async()=>{await api.action('diagnostics-clear');diagnosticsDialog();}));body.append(actions);}
$('#add').onclick=addDialog;$('#empty-add').onclick=addDialog;$('#more').onclick=menu;
$('#add').append(glyph('plus'));$('#single').append(glyph('single'));$('#more').append(glyph('more'));$('#multiview').onclick=multiviewDialog;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>api.action('layout',{mode:b.dataset.mode}));
$('#send').onclick=sendDialog;$('#pending-insert').onclick=()=>api.action('send-insert');$('#pending-cancel').onclick=()=>api.action('send-cancel');$('#pending-choose').onclick=sendDialog;api.onSend(sendDialog);
api.onState(render);api.onNotice(flash);api.action('get').then(render);
