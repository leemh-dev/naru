"""Android emulator tablet configuration; synthetic pages only, no authentication."""
import importlib.util,sys,time,json,subprocess,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('phone',Path(__file__).with_name('android-smoke.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
ui.out=Path('test-output/android-tablet');ui.out.mkdir(parents=True,exist_ok=True)
from types import SimpleNamespace
shell=ui.shell;tap=ui.tap;node=ui.node;check=ui.check;js=ui.js;APP=ui.APP

def boxes():
 return [list(map(int,re.findall(r'\d+',n.attrib['bounds']))) for n in ui.dump().iter('node') if n.attrib.get('class')=='android.webkit.WebView']
def choose(mode):
 ui.open_menu('멀티뷰 설정','태블릿 멀티뷰');tap(mode)
def current_book():return json.loads(shell('run-as',APP,'cat','files/workspaces.json'))
try:
 # A real Android 15 runtime with an explicit large-screen density, not desktop emulation.
 shell('wm','size','2560x1600');shell('wm','density','240');time.sleep(2)
 shell('pm','clear',APP);shell('am','start','-W','-n',APP+'/.MainActivity','--ez','test_fixtures','true','--ei','test_fixture_count','5');ui.connect()
 check('tablet-offers-multiview-control',node('멀티뷰 설정') is not None)
 choose('2×2 배치')
 for alias in ['A','B','C','D']:tap('멀티뷰 패널 · 시험 '+alias)
 check('fifth-panel-disabled-at-four',node('멀티뷰 패널 · 시험 E').attrib.get('enabled')=='false');tap('적용');time.sleep(1)
 r=boxes();check('four-native-webviews-in-two-by-two-grid',len(r)==4 and r[0][1]==r[1][1] and r[2][1]>r[0][1] and r[2][1]==r[3][1]);ui.shot('01-tablet-grid')
 page=ui.active_page();js(page,"document.querySelector('#prompt').value='TABLET_DRAFT_SYNTHETIC'")
 tap('◈ 시험 E');check('non-member-tab-uses-whole-screen',len(boxes())==1 and node('패널 이동 · 시험 A') is None)
 tap('◈ 시험 A');check('member-tab-returns-to-four-panels',len(boxes())==4);check('switching-preserves-live-draft',js(page,"document.querySelector('#prompt').value==='TABLET_DRAFT_SYNTHETIC'"))
 ui.open_menu('Plynt 메뉴','워크스페이스 관리');ui.shot('02-tablet-sidebar');tap('닫기');check('sidebar-preserves-four-panels-and-draft',len(boxes())==4 and js(page,"document.querySelector('#prompt').value==='TABLET_DRAFT_SYNTHETIC'"))
 choose('좌우 열 배치');tap('적용');r=boxes();check('columns-run-left-to-right-not-top-to-bottom',len(r)==4 and len(set(b[1] for b in r))==1 and all(r[i][0]<r[i+1][0] for i in range(3)));ui.shot('03-tablet-columns')
 before=current_book();order=next(e for e in before['entries'] if e['id']==before['current'])['state']['multiIds']
 start=ui.bounds(node('패널 이동 · 시험 A'));end=ui.bounds(node('패널 이동 · 시험 B'))
 shell('input','motionevent','DOWN',str(start[0]),str(start[1]));time.sleep(.9);shell('input','motionevent','MOVE',str(end[0]),str(end[1]));time.sleep(.7);shell('input','motionevent','UP',str(end[0]),str(end[1]));time.sleep(.8)
 after=current_book();reordered=next(e for e in after['entries'] if e['id']==after['current'])['state']['multiIds'];check('native-drag-swaps-panel-order',reordered==[order[1],order[0],*order[2:]])
 shell('wm','size','1600x2560');time.sleep(1);check('tablet-portrait-keeps-multiview-and-live-draft',len(boxes())==4 and js(page,"document.querySelector('#prompt').value==='TABLET_DRAFT_SYNTHETIC'"));ui.shot('04-tablet-portrait')
 shell('am','force-stop',APP);shell('am','start','-W','-n',APP+'/.MainActivity');ui.connect();check('tablet-layout-and-panel-order-restore',len(boxes())==4 and next(e for e in current_book()['entries'] if e['id']==current_book()['current'])['state']['multiIds']==reordered)
except Exception as e:
 try:ui.shot('failure');(ui.out/'failure-ui.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(ui.dump(),encoding='unicode'))
 except Exception:pass
 (ui.out/'failure.txt').write_text(str(e));raise
finally:
 (ui.out/'results.json').write_text(json.dumps({'scope':'Real Android 15 emulator, tablet metrics 2560x1600 / 1600x2560 at 240 dpi; synthetic pages only','configuration':shell('am','get-config'),'checks':ui.checks},indent=2)+'\n');shell('wm','size','reset');shell('wm','density','reset')
