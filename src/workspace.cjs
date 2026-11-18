const fs=require('node:fs'),path=require('node:path'),layout=require('./layout.cjs'),navigation=require('./navigation.cjs');
const {services:SERVICES,categories:CATEGORIES}=require('./services.json');
function safeURL(input){try{const u=new URL(input);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;return u.href;}catch{return null;}}
function restorableURL(input){const valid=safeURL(input);if(!valid)return null;const u=new URL(valid);if(/\/(?:auth|oauth|callback|login|signin|sign-in)(?:\/|$)/i.test(u.pathname))return null;for(const k of u.searchParams.keys())if(/token|code|secret|password|credential|session|ticket|assertion/i.test(k))return null;return valid;}
// Additive fields keep the original envelope readable by earlier previews.
function empty(){return {version:1,name:'기본 워크스페이스',tabs:[],active:null,presentation:'single',mode:'grid',tree:null,clips:[],diagnostics:true};}
function normalize(raw){
  const s=empty();if(!raw||![1,2].includes(raw.version))return s;
  s.name=typeof raw.name==='string'?raw.name.slice(0,60):s.name;
  const used=new Set();s.tabs=(Array.isArray(raw.tabs)?raw.tabs:[]).slice(0,navigation.MAX_TABS).flatMap(t=>{
    const url=restorableURL(t.url);if(!url||typeof t.id!=='string'||!/^[a-z0-9-]{1,60}$/i.test(t.id)||used.has(t.id))return [];used.add(t.id);
    return [{id:t.id,service:SERVICES[t.service]?t.service:'web',url,alias:typeof t.alias==='string'?t.alias.slice(0,60):'작업'}];
  });
  s.active=s.tabs.some(t=>t.id===raw.active)?raw.active:s.tabs[0]?.id||null;
  s.mode=['grid','columns','custom'].includes(raw.mode)?raw.mode:'grid';
  s.tree=layout.valid(raw.tree,s.tabs.map(t=>t.id));if(layout.ids(s.tree).length>navigation.MAX_PANELS)s.tree=null;
  const legacy=!Object.hasOwn(raw,'presentation');
  if(legacy&&!s.tree)s.tree=layout.preset(s.tabs.slice(0,navigation.MAX_PANELS).map(t=>t.id),s.mode);
  s.presentation=(legacy?raw.mode!=='single':raw.presentation==='multi')&&layout.ids(s.tree).includes(s.active)?'multi':'single';
  s.clips=(Array.isArray(raw.clips)?raw.clips:[]).filter(c=>typeof c.id==='string'&&typeof c.text==='string').slice(0,50).map(c=>({id:c.id.slice(0,60),text:c.text.slice(0,50000)}));
  s.diagnostics=raw.diagnostics!==false;return s;
}
function load(file){try{return normalize(JSON.parse(fs.readFileSync(file,'utf8')));}catch{return empty();}}
function save(file,state){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(state),{mode:0o600});fs.renameSync(temp,file);}
module.exports={SERVICES,CATEGORIES,safeURL,restorableURL,empty,normalize,load,save};
