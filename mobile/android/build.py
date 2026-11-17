"""Build the Android compatibility preview using official Android SDK tools.

No Gradle or third-party Android dependencies. The debug signing key stays outside
the repository; do not use this debug package as a production distribution.
"""
from pathlib import Path
import json, os, shutil, subprocess, zipfile

root = Path(__file__).resolve().parents[2]
project = Path(__file__).resolve().parent
sdk = Path(os.environ.get('ANDROID_SDK_ROOT', '/workspace/android-sdk'))
tools = sdk / 'build-tools/35.0.0'
android = sdk / 'platforms/android-35/android.jar'
if not android.exists() or not (tools / 'aapt2').exists():
    raise SystemExit('Install official Android platform 35 and build-tools 35.0.0; set ANDROID_SDK_ROOT.')
out = root / 'dist/android'
out.mkdir(parents=True, exist_ok=True)
for name in ['classes', 'dex', 'assets']:
    p = out / name
    if p.exists(): shutil.rmtree(p)
    p.mkdir()
shutil.copytree(project / 'assets', out / 'assets', dirs_exist_ok=True)
shutil.copyfile(root / 'src/input-bridge.js', out / 'assets/input-bridge.js')
services = subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./src/workspace.cjs').SERVICES))"], cwd=root)
(out / 'assets/services.json').write_bytes(services)

def run(args): subprocess.run([str(x) for x in args], check=True)

run([tools / 'aapt2', 'link', '-I', android, '--manifest', project / 'AndroidManifest.xml', '-A', out / 'assets', '-o', out / 'base.apk'])
run(['javac', '-encoding', 'UTF-8', '-source', '17', '-target', '17', '-classpath', android, '-d', out / 'classes', project / 'src/dev/naru/mobile/preview/MainActivity.java'])
run([tools / 'd8', '--min-api', '26', '--lib', android, '--output', out / 'dex', *sorted((out / 'classes').rglob('*.class'))])
with zipfile.ZipFile(out / 'base.apk', 'a') as archive:
    for p in (out / 'dex').glob('*.dex'): archive.write(p, p.name)
run([tools / 'zipalign', '-f', '4', out / 'base.apk', out / 'aligned.apk'])
key = Path(os.environ.get('NARU_ANDROID_DEBUG_KEY', '/workspace/naru-android-test/naru-debug.keystore'))
key.parent.mkdir(parents=True, exist_ok=True)
if not key.exists():
    run(['keytool', '-genkeypair', '-keystore', key, '-storepass', 'android', '-keypass', 'android', '-alias', 'androiddebugkey', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Naru Android Debug,O=Naru,C=US'])
version = json.loads((root / 'package.json').read_text())['version']
apk = out / f'naru-{version}-android-test.apk'
run([tools / 'apksigner', 'sign', '--ks', key, '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', apk, out / 'aligned.apk'])
run([tools / 'apksigner', 'verify', apk])
print(apk)
