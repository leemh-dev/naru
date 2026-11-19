// Real Electron UI with local synthetic pages and a temporary profile only.
process.argv.push('--fixtures');
const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'../test-output'),checks=[];fs.mkdirSync(out,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function check(name,ok){assert.ok(ok,name);checks.push({name,passed:true});}
(async()=>{
  const c=await require('../src/main.cjs').ready;await pause(250);
  assert.equal(c.profile,process.env.WORKSPACE_TEST_PROFILE);
  const ui=code=>c.win.webContents.executeJavaScript(code);
  async function waitFor(code){for(let i=0;i<60;i++){if(await ui(code))return;await pause(50);}throw new Error('UI timed out: '+code);}
  async function open(){await ui('document.querySelector("#add").click()');await waitFor('!!document.querySelector("#service-search")&&document.querySelector("#dialog").open');}
  async function search(text){await ui(`(()=>{const e=document.querySelector('#service-search');e.value=${JSON.stringify(text)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
  async function capture(name){await ui('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(250);fs.writeFileSync(path.join(out,name+'.png'),(await c.win.webContents.capturePage()).toPNG());}
  const expected=Object.keys(c.snapshot().services).filter(id=>id!=='web').length;
  await open();
  check('all-services-visible-once',await ui(`(()=>{const ids=[...document.querySelectorAll('[data-service]')].map(e=>e.dataset.service);return ids.length===${expected}&&new Set(ids).size===ids.length;})()`));
  check('eight-categories-and-all',await ui('document.querySelectorAll("[data-category]").length===9'));
  check('dialog-and-url-entry-fit-window',await ui(`(()=>{const d=document.querySelector('#dialog').getBoundingClientRect(),u=document.querySelector('#service-url').getBoundingClientRect();return d.top>=0&&d.bottom<=innerHeight&&u.bottom<=d.bottom;})()`));
  await capture('07-service-catalog');
  await ui(`document.querySelector('[data-category="music"]').click()`);
  check('music-filter-includes-suno-and-udio-only-relevant-services',await ui(`!!document.querySelector('[data-service="suno"]')&&!!document.querySelector('[data-service="udio"]')&&!document.querySelector('[data-service="claude"]')`));
  await capture('08-music-shortcuts');
  await ui(`document.querySelector('[data-category="all"]').click()`);await search('미드저니');
  check('korean-search-crosses-category',await ui(`document.querySelectorAll('[data-service]').length===1&&!!document.querySelector('[data-service="midjourney"]')&&document.querySelector('[data-category="all"]').getAttribute('aria-pressed')==='true'`));
  await ui(`document.querySelector('[data-service="midjourney"]').click()`);await waitFor('!document.querySelector("#dialog").open');
  check('shortcut-opens-and-activates-destination',c.snapshot().tabs.length===1&&c.snapshot().tabs[0].service==='midjourney'&&c.snapshot().active===c.snapshot().tabs[0].id);
  await open();await search('NOTEBOOKLM');
  check('former-product-name-searches-current-shortcut',await ui(`document.querySelectorAll('[data-service]').length===1&&document.querySelector('[data-service="notebooklm"]').textContent.includes('Gemini Notebook')`));
  await search('르샤');check('former-korean-name-is-searchable',await ui(`!!document.querySelector('[data-service="mistral"]')`));
  await search('CANARY_NO_RESULTS');
  check('no-results-retains-custom-url-entry',await ui(`document.querySelectorAll('[data-service]').length===0&&!!document.querySelector('.service-no-results')&&!!document.querySelector('#service-url')`));
  await search('');await ui(`document.querySelector('[data-category="code"]').click()`);
  check('development-filter-includes-cloud-tools',await ui(`!!document.querySelector('[data-service="codex"]')&&!!document.querySelector('[data-service="githubcopilot"]')&&!!document.querySelector('[data-service="replit"]')`));
  for(let i=0;i<2;i++){
    if(i)await open();await ui(`document.querySelector('[data-category="all"]').click()`);await search('제미나이');await ui(`document.querySelector('[data-service="gemini"]').click()`);await waitFor('!document.querySelector("#dialog").open');
  }
  const gemini=c.snapshot().tabs.filter(t=>t.service==='gemini');check('same-new-service-opens-independent-tabs',gemini.length===2&&gemini[0].id!==gemini[1].id);
  check('new-service-icons-remain-on-tabs',await ui(`document.querySelectorAll('#tabs .icon.gemini').length===2&&document.querySelector('#tabs .icon.gemini').textContent==='Ge'`));
  await open();await search('CANARY_NO_RESULTS');
  await ui(`document.querySelector('#service-url').value='https://example.test/custom';document.querySelector('.service-url-form').requestSubmit()`);await waitFor('!document.querySelector("#dialog").open');
  check('custom-url-still-opens-outside-catalogue',c.snapshot().tabs.some(t=>t.service==='web'&&t.url==='https://example.test/custom'));
  check('search-text-is-not-diagnosed',!JSON.stringify(c.diag.report()).includes('CANARY_NO_RESULTS'));
  const report={scope:'Linux Electron synthetic pages only; no actual service sign-in or generation',checks};fs.writeFileSync(path.join(out,'service-picker-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({servicePickerPassed:checks.length}));app.quit();
})().catch(e=>{console.error(e);app.exit(1);});
