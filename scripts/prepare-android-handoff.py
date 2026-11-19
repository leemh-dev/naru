"""Make a small workflow input from two public APKs; no signing key is read.
Requires bsdiff4==1.2.6. The workflow verifies the source build, output digest and certificate.
"""
import argparse,base64,hashlib,json
from pathlib import Path
import bsdiff4
p=argparse.ArgumentParser();p.add_argument('--ci-apk',type=Path,required=True);p.add_argument('--source-run',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];version=json.loads((root/'package.json').read_text())['version'];target=(root/'dist/android'/f'plynt-{version}-android-test.apk').read_bytes();source=a.ci_apk.read_bytes();patch=bsdiff4.diff(source,target)
assert len(patch)<=48000 and bsdiff4.patch(source,patch)==target
payload={'ref':'main','inputs':{'tag':'v'+version,'source_run':a.source_run,'apk_sha256':hashlib.sha256(target).hexdigest(),'patch_base64':base64.b64encode(patch).decode()}}
assert len(json.dumps(payload))<65000
a.output.write_text(json.dumps(payload));print('Workflow input created from public APK bytes; no private key included.')
