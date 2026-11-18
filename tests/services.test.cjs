const test=require('node:test'),assert=require('node:assert/strict');
const workspace=require('../src/workspace.cjs'),{sanitize}=require('../src/diagnostics.cjs');
const {services,categories}=require('../src/services.json');

test('catalogue shortcuts have safe restorable web destinations and valid groups',()=>{
  const groups=new Set(categories.map(c=>c.id));assert.equal(groups.size,categories.length);
  const urls=new Set();
  for(const [id,s]of Object.entries(services)){
    if(id==='web')continue;
    assert.match(id,/^[a-z][a-z0-9]*$/);assert.ok(s.name&&s.icon&&s.description);
    const url=new URL(s.url);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');
    assert.equal(workspace.restorableURL(s.url),s.url);
    assert.ok(!urls.has(s.url),'Duplicate shortcut: '+s.name);urls.add(s.url);
    assert.ok(s.categories.length);assert.equal(new Set(s.categories).size,s.categories.length);
    for(const group of s.categories)assert.ok(groups.has(group));
  }
  for(const group of groups)assert.ok(Object.values(services).some(s=>s.categories.includes(group)));
});

test('old and newly added service tabs retain identity, private paths and aliases on restore',()=>{
  const ids=['chatgpt','codex','claude','suno','midjourney','canva','gemini','udio','kling','notebooklm','githubcopilot'];
  const tabs=ids.map((service,i)=>({id:'tab-'+i,service,url:services[service].url+'private-test',alias:'local-'+i}));
  const restored=workspace.normalize({...workspace.empty(),tabs,active:'tab-6'});
  assert.deepEqual(restored.tabs,tabs);assert.equal(restored.active,'tab-6');
});

test('new service IDs are diagnosed without accepting queries, arbitrary service names or URLs',()=>{
  for(const service of Object.keys(services)){
    assert.deepEqual(sanitize('tab.open',{service,query:'CANARY_SEARCH',url:'https://example.test/CANARY_URL',source:'CANARY_SOURCE'}),{event:'tab.open',service});
  }
  assert.deepEqual(sanitize('tab.open',{service:'CANARY_PRIVATE_SERVICE'}),{event:'tab.open'});
});
