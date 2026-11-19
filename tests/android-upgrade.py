"""Update the official retained-key preview.5 APK in place; synthetic data only."""
import importlib.util,sys,time,json,subprocess,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('phone',Path(__file__).with_name('android-smoke.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
ui.out=Path('test-output/android-upgrade');ui.out.mkdir(parents=True,exist_ok=True)
APP=ui.APP

def launch(fixtures=False):
 # Launchers query MAIN/LAUNCHER entries and then start an explicit component.
 # A generic implicit start may require CATEGORY_DEFAULT, which launcher entries lack.
 query=ui.shell('cmd','package','query-activities','--brief','--components','-a','android.intent.action.MAIN','-c','android.intent.category.LAUNCHER','-p',APP)
 components=sorted(set(re.findall(re.escape(APP)+r'/[A-Za-z0-9_.$]+',query)))
 ui.check('one-launcher-entry-'+('previous' if fixtures else 'updated'),len(components)==1)
 args=['am','start','-W','-n',components[0],'-a','android.intent.action.MAIN','-c','android.intent.category.LAUNCHER']
 if fixtures:args+=['--ez','test_fixtures','true']
 result=subprocess.run(['adb','shell',*args],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if result.returncode:raise AssertionError('Synthetic launcher command failed: '+result.stdout)
 ui.check('launcher-component-starts-'+('previous' if fixtures else 'updated'),'Error' not in result.stdout and 'Status: ok' in result.stdout)
def state():
 b=json.loads(ui.shell('run-as',APP,'cat','files/workspaces.json'));return b['current'],next(e['state'] for e in b['entries'] if e['id']==b['current'])
try:
 subprocess.run(['adb','install','-r',sys.argv[1]],check=True,stdout=subprocess.DEVNULL);ui.shell('pm','clear',APP);launch(True);ui.connect();page=ui.active_page()
 ui.js(page,"document.cookie='plynt_upgrade=synthetic; Max-Age=86400; Path=/; Secure; SameSite=Lax';localStorage.setItem('plynt_upgrade','synthetic')")
 ui.shell('input','keyevent','KEYCODE_HOME');time.sleep(1);before=state();ui.check('previous-version-has-two-saved-tabs',len(before[1]['tabs'])==2);ui.shell('am','force-stop',APP)
 subprocess.run(['adb','install','-r',sys.argv[2]],check=True,stdout=subprocess.DEVNULL);ui.check('same-signature-update-installs-without-uninstall',True)
 launch();ui.connect();after=state();ui.check('update-preserves-workspace-and-tab-identities',before[0]==after[0] and before[1]['tabs']==after[1]['tabs'] and before[1]['activeId']==after[1]['activeId'])
 page=ui.active_page();ui.check('update-preserves-synthetic-login-cookie',ui.js(page,"document.cookie.includes('plynt_upgrade=synthetic')"));ui.check('update-preserves-synthetic-web-storage',ui.js(page,"localStorage.getItem('plynt_upgrade')==='synthetic'"))
 ui.open_menu('Plynt 메뉴','워크스페이스 관리');ui.check('updated-app-opens-new-sidebar',ui.node('워크스페이스 관리') is not None);ui.shot('01-updated-sidebar')
except Exception as e:
 try:ui.shot('failure')
 except Exception:pass
 (ui.out/'failure.txt').write_text(str(e));raise
finally:
 (ui.out/'results.json').write_text(json.dumps({'scope':'Official preview.5 APK to retained-key preview.6 update on Android 15 emulator; launcher component discovery/start, synthetic workspace/cookie/localStorage only','checks':ui.checks},indent=2)+'\n')
