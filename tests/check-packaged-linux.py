"""Extract our deb without installing system-wide; launch its bundled executable."""
from pathlib import Path
import os,subprocess,tempfile,time,json,shutil
root=Path(__file__).resolve().parents[1];out=root/'test-output';out.mkdir(exist_ok=True)
package=next((root/'dist').glob('*linux-amd64.deb'))
xvfb=os.environ.get('TEST_XVFB') or shutil.which('Xvfb')
with tempfile.TemporaryDirectory(prefix='workspace-package-test-') as temp:
 extract=Path(temp)/'extracted';subprocess.run(['dpkg-deb','-x',str(package),str(extract)],check=True)
 binary=next(p for p in (extract/'opt').glob('*/*') if p.name=='ai-workspace-preview')
 env=dict(os.environ);env['DISPLAY']=':94';env['WORKSPACE_TEST_PROFILE']=temp+'/profile';env['XDG_RUNTIME_DIR']=temp+'/runtime';Path(env['XDG_RUNTIME_DIR']).mkdir(mode=0o700)
 with (out/'packaged-xvfb.log').open('w') as xf,(out/'packaged-app.log').open('w') as ef:
  x=subprocess.Popen([xvfb,':94','-screen','0','1500x1050x24','-nolisten','tcp','-ac'],env=env,stdout=xf,stderr=subprocess.STDOUT)
  try:
   for _ in range(30):
    if Path('/tmp/.X11-unix/X94').exists():break
    time.sleep(.1)
   p=subprocess.Popen([str(binary),'--fixtures','--disable-dev-shm-usage'],env=env,stdout=ef,stderr=subprocess.STDOUT)
   try:
    time.sleep(3)
    if p.poll() is not None:raise RuntimeError('Packaged app exited during startup')
    subprocess.run(['python',str(root/'tests/native-action.py'),'screenshot',str(out/'05-packaged-startup.png')],env=env,check=True)
    print(json.dumps({'package':package.name,'platform':'linux','startup_process_alive':True,'screenshot':'05-packaged-startup.png','scope':'offline fixture startup; no authenticated service test'}))
   finally:
    p.terminate()
    try:p.wait(timeout=5)
    except subprocess.TimeoutExpired:p.kill();p.wait()
  finally:
   x.terminate();x.wait(timeout=5)
