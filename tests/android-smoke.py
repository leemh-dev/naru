"""Real Android native UI and WebView test; fresh app data and synthetic HTTPS only."""
import subprocess,sys,time,json,re,urllib.request,xml.etree.ElementTree as ET
from pathlib import Path
import websocket
APP='dev.naru.mobile.preview';out=Path('test-output/android');out.mkdir(parents=True,exist_ok=True);checks=[]
def adb(*args):return subprocess.check_output(['adb',*args],text=True).strip()
def shell(*args):return adb('shell',*args)
def check(name,value):
 if not value:raise AssertionError(name)
 checks.append({'name':name,'passed':True});print(name,flush=True)
def dump():
 for _ in range(6):
  shell('rm','-f','/sdcard/plynt-ui.xml')
  result=shell('uiautomator','dump','/sdcard/plynt-ui.xml')
  if 'dumped to' in result:
   try:return ET.fromstring(shell('cat','/sdcard/plynt-ui.xml'))
   except (ET.ParseError,subprocess.CalledProcessError):pass
  time.sleep(.7)
 raise AssertionError('Android accessibility snapshot unavailable')
def bounds(node):
 n=list(map(int,re.findall(r'\d+',node.attrib['bounds'])));return ((n[0]+n[2])//2,(n[1]+n[3])//2)
def node(label,contains=False):
 tree=dump()
 for n in tree.iter('node'):
  text=n.attrib.get('text','');desc=n.attrib.get('content-desc','')
  if (label in text or label in desc) if contains else (label==text or label==desc):return n
 return None
def tap(label,contains=False):
 for _ in range(5):
  n=node(label,contains)
  if n is not None:
   x,y=bounds(n);shell('input','tap',str(x),str(y));time.sleep(.4);return
  time.sleep(.4)
 raise AssertionError('Missing UI action: '+label)
def open_menu(action,expected):
 for attempt in range(3):
  tap(action)
  for _ in range(3):
   n=node(expected)
   if n is not None:return n
   time.sleep(.5)
 raise AssertionError('Menu did not open: '+expected)
def shot(name):
 (out/(name+'.png')).write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
def connect():
 for _ in range(40):
  pid=shell('pidof',APP)
  if pid:
   adb('forward','tcp:9228','localabstract:webview_devtools_remote_'+pid.split()[0])
   try:
    pages=json.load(urllib.request.urlopen('http://127.0.0.1:9228/json',timeout=2));pages=[p for p in pages if p.get('url','').startswith('https://fixture.plynt.test/')]
    if pages:return pages
   except Exception:pass
  time.sleep(.5)
 raise AssertionError('Synthetic WebView not available')
def js(page,expr):
 ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=8,suppress_origin=True)
 try:
  ws.send(json.dumps({'id':1,'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}}))
  while True:
   r=json.loads(ws.recv())
   if r.get('id')==1:
    if 'exceptionDetails' in r.get('result',{}):raise AssertionError('Synthetic script error')
    return r.get('result',{}).get('result',{}).get('value')
 finally:ws.close()
def active_page():
 pages=connect()
 for p in pages:
  try:
   if js(p,'document.hasFocus()'):return p
  except Exception:pass
 return pages[0]
def tap_dom(page,selector,long=False):
 pos=js(page,"(()=>{const e=document.querySelector("+json.dumps(selector)+");e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+Math.min(30,r.width/2),y:r.y+Math.min(18,r.height/2),ratio:devicePixelRatio}})()")
 tree=dump();web=next(n for n in tree.iter('node') if n.attrib.get('class')=='android.webkit.WebView');rect=list(map(int,re.findall(r'\d+',web.attrib['bounds'])));x=int(rect[0]+pos['x']*pos['ratio']);y=int(rect[1]+pos['y']*pos['ratio'])
 if long:shell('input','swipe',str(x),str(y),str(x),str(y),'900')
 else:shell('input','tap',str(x),str(y))
 time.sleep(.5)
def tap_selection_action(page):
 n=node('다른 탭에 넣기')
 if n is not None:
  x,y=bounds(n)
 else:
  # API 35's floating toolbar may not be exported by uiautomator dump.
  # Screenshot-confirmed position for the fixed Pixel 2 / English CI profile.
  rect=js(page,"(()=>{const r=document.querySelector('#sample').getBoundingClientRect();return {top:r.top,ratio:devicePixelRatio,width:innerWidth}})()")
  web=next(n for n in dump().iter('node') if n.attrib.get('class')=='android.webkit.WebView');box=list(map(int,re.findall(r'\d+',web.attrib['bounds'])))
  x=int(rect['width']*rect['ratio']*.65);y=int(box[1]+(rect['top']-28)*rect['ratio'])
 shell('input','tap',str(x),str(y));time.sleep(.6)
def set_name(text):
 tree=dump();n=next(n for n in tree.iter('node') if n.attrib.get('class')=='android.widget.EditText');x,y=bounds(n);shell('input','tap',str(x),str(y));shell('input','keyevent','KEYCODE_MOVE_END');shell('input','keyevent','--longpress','KEYCODE_DEL')
 # Select all using native key shortcut; synthetic ASCII test name only.
 shell('input','keycombination','113','29');shell('input','text',text.replace(' ','%s'));shell('input','keyevent','4')
def book():return json.loads(shell('run-as',APP,'cat','files/workspaces.json'))
def workspaces():open_menu('Plynt 메뉴','워크스페이스 관리');open_menu('워크스페이스 관리','워크스페이스 이름')
if __name__=="__main__":
 try:
  subprocess.run(['adb','install','-r',sys.argv[1]],check=True,stdout=subprocess.DEVNULL);shell('pm','clear',APP);shell('am','start','-W','-n',APP+'/.MainActivity','--ez','test_fixtures','true');time.sleep(2);pages=connect();check('android-two-real-webviews-render',len(pages)==2)
  opened=open_menu('＋','분류 All');check('all-category-default',opened.attrib.get('selected')=='true');tap('분류 음악');tap('분류 이미지');check('multiple-categories-selected',node('분류 음악').attrib.get('selected')=='true' and node('분류 이미지').attrib.get('selected')=='true');check('google-pinned-above-results',node('브라우저 · Google') is not None);shot('01-picker');tap('분류 All');check('all-clears-individual-categories',node('분류 음악').attrib.get('selected')!='true');tap('닫기')
  source=active_page();tap_dom(source,'#sample',long=True);selected=js(source,'window.getSelection().toString()');check('native-long-press-selects-text',bool(selected));tap_selection_action(source);check('unregistered-tab-listed-in-native-chooser',node('입력칸 선택 필요',True) is not None);shot('02-destinations');tap('입력칸 선택 필요',True);target=active_page();tap_dom(target,'#prompt');tap('여기에 넣기');time.sleep(.8);check('native-selection-transfer-exact',js(target,'document.querySelector("#prompt").value')==selected)
  js(target,'document.querySelector("#prompt").value=""');tap_dom(target,'#copy');open_menu('↗','복사한 글 보내기');open_menu('복사한 글 보내기','대상 탭 선택');check('clipboard-preview-has-complete-text',node('Plynt mobile test',True) is not None);tap('최근 ·',True);time.sleep(.8);check('clipboard-transfer-preserves-newlines',js(target,'document.querySelector("#prompt").value')=='Plynt mobile test\nSecond line');shot('03-transfer')
  open_menu('↗','복사한 글 보내기');open_menu('복사한 글 보내기','대상 탭 선택');tap('최근 ·',True);time.sleep(.6);check('existing-draft-is-preserved',js(target,'document.querySelector("#prompt").value')=='Plynt mobile test\nSecond line');tap('취소')
  tap('↗');tap('ChatGPT 답변 가져오기 · 시험');check('whole-assistant-answer-available-without-selection',node('Plynt mobile test',True) is not None);tap('닫기')
  js(target,"document.cookie='plynt_fixture=synthetic; Max-Age=86400; Path=/; Secure; SameSite=Lax';localStorage.setItem('plynt_fixture','synthetic')")
  workspaces();set_name('Mobile QA');tap('현재 작업 저장');workspaces();check('workspace-name-saved',node('Mobile QA',True) is not None);set_name('Empty QA');tap('새 빈 작업');check('new-workspace-has-no-webview',not any(n.attrib.get('class')=='android.webkit.WebView' for n in dump().iter('node')));workspaces();tap('Mobile QA · 2개 탭',True);connect();workspaces();shot('04-workspaces');tap('닫기')
  # Rename an inactive workspace without replacing the current WebView or draft.
  target=active_page();js(target,"document.querySelector('#prompt').value='SIDEBAR_DRAFT_SYNTHETIC';document.body.style.minHeight='3000px';scrollTo(0,160)");time.sleep(.3)
  before=book();inactive=next(e for e in before['entries'] if e['id']!=before['current'])
  open_menu('Plynt 메뉴','워크스페이스 관리');check('phone-keeps-multiview-hidden',node('멀티뷰 설정') is None);check('leading-brand-replaces-overflow-menu',node('···') is None);shot('05-sidebar');shell('input','keyevent','4');check('sidebar-back-preserves-live-draft-scroll',js(target,"document.querySelector('#prompt').value==='SIDEBAR_DRAFT_SYNTHETIC'&&scrollY===160"))
  workspaces();tap('Empty QA 이름 변경');set_name('Archive QA');tap('이름 저장');after=book();check('inactive-rename-keeps-current-and-tab-data',after['current']==before['current'] and next(e for e in after['entries'] if e['id']==inactive['id'])['state']==dict(inactive['state'],name='Archive QA'));check('rename-does-not-reload-webview',js(target,"document.querySelector('#prompt').value==='SIDEBAR_DRAFT_SYNTHETIC'&&scrollY===160"))
  tap('Mobile QA 이름 변경');set_name('Cancelled QA');tap('취소');check('cancel-keeps-name',node('● Mobile QA · 2개 탭') is not None)
  tap('Mobile QA 이름 변경');set_name('Renamed Mobile QA');shot('06-rename');tap('이름 저장');tap('닫기')
  shell('input','keyevent','KEYCODE_HOME');time.sleep(.5);shell('am','force-stop',APP);shell('am','start','-W','-n',APP+'/.MainActivity');time.sleep(1);pages=connect();check('workspace-tabs-survive-process-restart',node('◈ 시험 A') is not None and node('◈ 시험 B') is not None);page=active_page();check('synthetic-login-cookie-survives-restart',js(page,"document.cookie.includes('plynt_fixture=synthetic')"));check('synthetic-web-storage-survives-restart',js(page,"localStorage.getItem('plynt_fixture')==='synthetic'"));workspaces();check('named-current-workspace-survives-restart',node('● Renamed Mobile QA',True) is not None);tap('닫기')
  report=json.loads(shell('run-as',APP,'cat','files/diagnostics.json'));check('diagnostics-exclude-text-and-workspace-names',all(x not in json.dumps(report) for x in ['Plynt mobile test','Mobile QA','fixture.plynt.test','plynt_fixture']))
 except Exception as e:
  try:
   shot('failure');(out/'failure-ui.xml').write_bytes(ET.tostring(dump(),encoding='utf-8'))
  except Exception:pass
  (out/'failure.txt').write_text(str(e));raise
 finally:
  (out/'results.json').write_text(json.dumps({'scope':'Real Android emulator, native touch and synthetic HTTPS fixture only; no real service sign-in','android':shell('getprop','ro.build.version.release'),'model':shell('getprop','ro.product.model'),'abi':shell('getprop','ro.product.cpu.abi'),'webview':locals().get('report',{}).get('webview','not-read'),'checks':checks},indent=2)+'\n')
