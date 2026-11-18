// All diagnostic fields are allowlisted. Never pass through arbitrary messages,
// URLs, aliases, page titles, stacks, filenames, console output or payloads.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const EVENTS=new Set(['app.start','app.stop','app.error','tab.open','tab.close','page.load','page.failure','page.crash','layout.change','field.register','transfer.result','clip.saved','report.export','diagnostics.changed','workspace.restore']);
// Only IDs from the bundled catalogue are allowed, never user search terms or URLs.
const ENUMS={service:[...Object.keys(require('./services.json').services),'fixture'],status:['ok','blocked','error','exact','changed','occupied','gone','focus-failed','login','iframe','unsupported','too-long'],reason:['network','renderer','process','input','storage','unknown'],layout:['single','grid','columns','custom'],field:['prompt','lyrics','style']};
const NUMBERS=new Set(['tab','target','elapsedMs','chars','expectedNewlines','actualNewlines','count','errorCode','exitCode']);
function sanitize(event,fields={}){
  if(!EVENTS.has(event))return null;
  const out={event};
  for(const [key,allowed] of Object.entries(ENUMS))if(allowed.includes(fields[key]))out[key]=fields[key];
  for(const key of NUMBERS)if(Number.isSafeInteger(fields[key])&&Math.abs(fields[key])<=1e9)out[key]=fields[key];
  return out;
}
class Diagnostics{
  constructor(dir,meta={}){this.dir=dir;this.enabled=true;this.storageError=false;this.session=randomUUID();this.meta={};for(const k of ['appVersion','electron','chromium','osRelease'])if(typeof meta[k]==='string'&&/^[0-9A-Za-z.+_-]{1,60}$/.test(meta[k]))this.meta[k]=meta[k];for(const k of ['platform','arch'])if(['win32','darwin','linux','x64','arm64'].includes(meta[k]))this.meta[k]=meta[k];fs.mkdirSync(dir,{recursive:true,mode:0o700});}
  file(index){return path.join(this.dir,`events-${index}.ndjson`);}
  log(event,fields={}){
    if(!this.enabled)return;
    const clean=sanitize(event,fields);if(!clean)return;
    try{
      if(fs.existsSync(this.file(0))&&fs.statSync(this.file(0)).size>512*1024){
        fs.rmSync(this.file(3),{force:true});for(let n=2;n>=0;n--)if(fs.existsSync(this.file(n)))fs.renameSync(this.file(n),this.file(n+1));
      }
      fs.appendFileSync(this.file(0),JSON.stringify({at:new Date().toISOString(),session:this.session,...clean})+'\n',{mode:0o600});
    }catch{this.storageError=true;}
  }
  report(){
    const events=[];
    for(let n=3;n>=0;n--){
      try{for(const line of fs.readFileSync(this.file(n),'utf8').split('\n')){
        try{const raw=JSON.parse(line),clean=sanitize(raw.event,raw);if(clean){
          const record={...clean};
          if(typeof raw.at==='string'&&/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(raw.at))record.at=raw.at;
          if(typeof raw.session==='string'&&/^[a-f0-9-]{36}$/.test(raw.session))record.session=raw.session;
          events.push(record);
        }}catch{}
      }}catch{}
    }
    return {schema:1,generatedAt:new Date().toISOString(),environment:this.meta,storageError:this.storageError,privacy:'No prompts, page URLs, credentials, aliases, screenshots or remote console messages.',events};
  }
  clear(){for(let n=0;n<4;n++)fs.rmSync(this.file(n),{force:true});this.storageError=false;}
}
module.exports={Diagnostics,sanitize};
