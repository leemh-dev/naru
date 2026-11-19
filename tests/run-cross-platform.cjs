// Fresh local profiles, synthetic pages and synthetic persistent cookie only.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'plynt-native-'));
try{for(const extra of [[],['--restore-check']]){const r=spawnSync(require('electron'),[path.join(__dirname,'features-smoke.cjs'),'--disable-dev-shm-usage',...extra],{cwd:path.join(__dirname,'..'),env:{...process.env,WORKSPACE_TEST_PROFILE:dir},stdio:'inherit',timeout:90000});if(r.status!==0)process.exitCode=1;if(process.exitCode)break;}}finally{fs.rmSync(dir,{recursive:true,force:true});}
