"""Run real Electron windows with synthetic pages and test restart. No service login."""
from pathlib import Path
import os,sys,subprocess,tempfile,time,shutil,json
root=Path(__file__).resolve().parents[1];out=root/'test-output';out.mkdir(exist_ok=True)
electron=os.environ.get('TEST_ELECTRON') or str(root/'node_modules/electron/dist/electron')
xvfb=os.environ.get('TEST_XVFB') or shutil.which('Xvfb')
if not xvfb:raise SystemExit('Xvfb required')
with tempfile.TemporaryDirectory(prefix='workspace-ui-test-') as temp:
 env=dict(os.environ);env['DISPLAY']=':96';env['WORKSPACE_TEST_PROFILE']=temp+'/profile';env['XDG_RUNTIME_DIR']=temp+'/runtime';Path(env['XDG_RUNTIME_DIR']).mkdir(mode=0o700)
 with (out/'xvfb.log').open('w') as xf,(out/'electron.log').open('w') as ef:
  x=subprocess.Popen([xvfb,':96','-screen','0','1500x1050x24','-nolisten','tcp','-ac'],env=env,stdout=xf,stderr=subprocess.STDOUT)
  try:
   for _ in range(30):
    if x.poll() is not None:raise RuntimeError('Xvfb failed')
    if Path('/tmp/.X11-unix/X96').exists():break
    time.sleep(.1)
   for script,extra in [('desktop-smoke.cjs',[]),('desktop-smoke.cjs',['--restore-check']),('service-picker-smoke.cjs',[])]:
    env['WORKSPACE_TEST_PROFILE']=temp+('/catalog-profile' if script=='service-picker-smoke.cjs' else '/profile')
    p=subprocess.Popen([electron,str(root/'tests'/script),'--disable-dev-shm-usage',*extra],cwd=root,env=env,stdout=ef,stderr=subprocess.STDOUT)
    try:rc=p.wait(timeout=45)
    except subprocess.TimeoutExpired:p.terminate();rc=p.wait(timeout=5)
    if rc:raise RuntimeError('Electron smoke failed; inspect test-output')
  finally:
   x.terminate()
   try:x.wait(timeout=5)
   except subprocess.TimeoutExpired:x.kill();x.wait()
 print((out/'desktop-results.json').read_text());print((out/'restore-results.json').read_text());print((out/'service-picker-results.json').read_text())
