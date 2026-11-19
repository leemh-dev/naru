// Private local named workspaces. No credentials and no diagnostic content.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),workspace=require('./workspace.cjs');
function empty(){return {version:1,current:'default',entries:[{id:'default',state:workspace.empty(),updatedAt:null}]};}
function normalize(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.entries)||!raw.entries.length)throw new Error('invalid-library');
 const seen=new Set(),entries=[];
 for(const e of raw.entries.slice(0,50)){if(!e||typeof e.id!=='string'||!/^[a-z0-9-]{1,60}$/i.test(e.id)||seen.has(e.id)||![1,2].includes(e.state?.version))throw new Error('invalid-workspace');seen.add(e.id);entries.push({id:e.id,state:workspace.normalize(e.state),updatedAt:typeof e.updatedAt==='string'?e.updatedAt:null});}
 return {version:1,current:seen.has(raw.current)?raw.current:entries[0].id,entries};
}
function load(file,legacy){
 for(const candidate of [file,file+'.bak'])try{return {library:normalize(JSON.parse(fs.readFileSync(candidate,'utf8'))),recovered:candidate.endsWith('.bak')};}catch(e){if(e.code!=='ENOENT'&&!fs.existsSync(file+'.bak'))return {library:empty(),blocked:true};}
 if(fs.existsSync(file)||fs.existsSync(file+'.bak'))return {library:empty(),blocked:true};
 const library=empty();try{if(fs.existsSync(legacy)){const raw=JSON.parse(fs.readFileSync(legacy,'utf8'));if(![1,2].includes(raw.version))throw new Error('invalid-legacy');library.entries[0].state=workspace.normalize(raw);}}catch{return {library,blocked:true};}return {library};
}
function save(file,lib){const valid=normalize(lib);fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)){try{normalize(JSON.parse(fs.readFileSync(file,'utf8')));fs.copyFileSync(file,file+'.bak');fs.chmodSync(file+'.bak',0o600);}catch{}}const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(valid),{mode:0o600});fs.renameSync(tmp,file);}
function checkpoint(lib,state){const e=lib.entries.find(e=>e.id===lib.current);e.state=workspace.normalize(state);e.updatedAt=new Date().toISOString();}
function create(lib,state,name){if(lib.entries.length>=50)return null;const next=workspace.normalize(state);next.name=String(name||'새 워크스페이스').trim().slice(0,60)||'새 워크스페이스';const id=randomUUID();lib.entries.push({id,state:next,updatedAt:new Date().toISOString()});lib.current=id;return id;}
function rename(lib,id,name){if(typeof name!=='string'||!name.trim()||name.trim().length>60)return false;const entry=lib.entries.find(e=>e.id===id);if(!entry)return false;entry.state.name=name.trim();entry.updatedAt=new Date().toISOString();return true;}
module.exports={empty,normalize,load,save,checkpoint,create,rename};
