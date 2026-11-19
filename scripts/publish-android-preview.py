"""Publish a tested APK signed with the retained local key, then refresh all checksums.
CI-signed test APKs are intentionally excluded from automatic release publication.
"""
from pathlib import Path
import subprocess,json,os,re,tempfile
root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'package.json').read_text());version=manifest['version'];tag='v'+version
repo=json.loads(subprocess.check_output(['gh','api','repositories/1461224592'],text=True))['full_name']
apk=root/'dist/android'/f'plynt-{version}-android-test.apk';sdk=Path(os.environ.get('ANDROID_SDK_ROOT','/workspace/android-sdk'))
result=subprocess.check_output([str(sdk/'build-tools/35.0.0/apksigner'),'verify','--print-certs',str(apk)],text=True)
sha=re.search(r'certificate SHA-256 digest: ([a-f0-9]+)',result).group(1)
assert sha==json.loads((root/'docs/android-signing.json').read_text())['retainedCertificateSha256'],'APK signing identity changed'
release=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/releases/tags/{tag}'],text=True));assert release['prerelease'] and not release['draft']
assert not any(a['name']==apk.name for a in release['assets']),'APK already published; do not replace silently'
subprocess.run(['gh','release','upload',tag,str(apk),'--repo',repo],check=True)
release=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/releases/tags/{tag}'],text=True));files=sorted([a for a in release['assets'] if a['name']!='SHA256SUMS.txt'],key=lambda x:x['name']);assert len(files)==9
for a in files:assert a['state']=='uploaded' and a.get('digest','').startswith('sha256:')
with tempfile.TemporaryDirectory() as temp:
 checksum=Path(temp)/'SHA256SUMS.txt';checksum.write_text(''.join(a['digest'].removeprefix('sha256:')+'  ./'+a['name']+'\n' for a in files))
 subprocess.run(['gh','release','upload',tag,str(checksum),'--clobber','--repo',repo],check=True)
print('Retained-key Android APK published; nine installer checksums updated.')
