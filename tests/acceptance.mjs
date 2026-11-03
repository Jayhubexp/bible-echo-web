// Runs against real services. Set TEST_WAV to a recording of "John chapter three verse sixteen".
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import process from 'node:process';
const args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'];
if(process.env.TEST_WAV)args.push('--use-file-for-fake-audio-capture='+process.env.TEST_WAV+'%noloop');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge',args});
const ctx=await browser.newContext({ignoreHTTPSErrors:true,permissions:['microphone']});
const page=await ctx.newPage();
page.setDefaultTimeout(120000);
const failures=[];
async function check(name,fn){
  try{await fn();console.log('PASS',name);}catch(e){failures.push(name);console.error('FAIL',name,e.message.slice(0,500));}
}
try{
  await page.goto(process.env.TEST_URL || 'https://localhost:5173');
  await page.getByRole('heading',{name:'Live Desk',exact:true}).waitFor({timeout:20000});
  const popup=page.waitForEvent('popup');
  await page.getByRole('button',{name:'Open projector'}).click();
  const screen=await popup;
  await check('manual KJV range, projector window, navigation, clear, restore and resize',async()=>{
    await page.getByLabel('Reference or passage keywords').fill('John 3:16-17');
    await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.getByRole('button',{name:'Project verse'}).click();
    await screen.getByText('John 3:16 · KJV',{exact:true}).waitFor();
    assert.match(await screen.locator('article p').innerText(),/For God so loved the world/);
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await screen.getByText('John 3:17 · KJV',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Blackout'}).click();
    await screen.locator('.slide.blank').waitFor();
    await page.getByRole('button',{name:'Restore screen'}).click();
    await page.getByText('Display settings',{exact:true}).click();
    await page.getByLabel('Scripture text size').press('ArrowRight');
    await screen.waitForFunction(()=>document.querySelector('.slide').style.getPropertyValue('--scale')==='5.25');
    await screen.getByRole('button',{name:'Fullscreen'}).click();
    await screen.waitForFunction(()=>Boolean(document.fullscreenElement));
    await screen.evaluate(()=>document.exitFullscreen());
  });
  if(process.env.TEST_SPOKEN_NAV==='1')await check('spoken range, verse jump, next and terminal boundary in audience window',async()=>{
    const phrases=['Luke chapter eighteen from verse one to verse seven.','Verse two.','Next.','Verse seven.','Next.'];
    let received=0;
    await page.route('**/transcribe',route=>route.fulfill({
      headers:{'access-control-allow-origin':'*'},json:{transcript:phrases[received++]||''}
    }));
    try{
      await page.getByRole('button',{name:'Start listening'}).click();
      for(const n of [1,2,3,7])await screen.getByText('Luke 18:'+n+' · KJV',{exact:true}).waitFor({timeout:20000});
      await page.waitForFunction(()=>[...document.querySelectorAll('.transcript p')].filter(p=>p.textContent==='Next.').length===2);
      await page.getByRole('button',{name:'Stop listening'}).click();
      await page.getByRole('button',{name:'Start listening'}).waitFor();
      assert.equal(await screen.locator('article b').innerText(),'Luke 18:7 · KJV');
    }catch(e){console.error('Voice fixture chunks',received,'desk alerts',await page.getByRole('alert').allTextContents(),'audience',await screen.locator('article b').allTextContents());throw e;}finally{await page.unroute('**/transcribe');}
  });
  if(process.env.TEST_WAV)await check('HTTPS microphone capture, real Muse transcription and automatic projection',async()=>{
    assert(await page.evaluate(()=>isSecureContext));
    const response=page.waitForResponse(r=>r.url().endsWith('/transcribe'));
    await page.getByRole('button',{name:'Start listening'}).click();
    await page.getByRole('button',{name:'Stop listening'}).waitFor({timeout:15000});
    await page.waitForTimeout(4250);
    await page.getByRole('button',{name:'Stop listening'}).click();
    const result=await response;
    assert.equal(result.status(),200,await result.text());
    console.log('TRANSCRIPT',(await result.json()).transcript);
    await screen.getByText('John 3:16 · KJV',{exact:true}).waitFor({timeout:10000});
  });
  if(process.env.TEST_IMAGE==='1')await check('real Muse generation, preview, explicit apply, restore',async()=>{
    await page.getByRole('button',{name:'Backgrounds',exact:true}).click();
    await page.getByLabel('Describe a background').fill('A quiet blue mountain ridge at dusk, soft light, wide landscape, no text');
    const result=page.waitForResponse(r=>r.url().endsWith('/backgrounds/generate'));
    await page.getByRole('button',{name:'Generate image'}).click();
    const r=await result;assert.equal(r.status(),200,r.ok()?'':await r.text());
    await page.locator('.generated').waitFor();
    assert.equal(await screen.locator('.backdrop').count(),0);
    await page.getByRole('button',{name:'Apply to projector'}).click();
    await screen.locator('.backdrop').waitFor();
    assert(await screen.locator('.backdrop').evaluate(async img=>{await img.decode();return img.naturalWidth>0;}));
    await page.getByRole('button',{name:'Restore default'}).click();
    await screen.locator('.backdrop').waitFor({state:'detached'});
  });
  await check('desk reload reattaches to the existing audience without clearing it',async()=>{
    await page.getByRole('button',{name:'Live Desk',exact:true}).click();
    await page.getByLabel('Reference or passage keywords').fill('John 1:1');
    await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.getByText('KJV · John 1:1',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Project verse'}).click();
    await screen.locator('article p').filter({hasText:/In the beginning/i}).waitFor();
    await screen.evaluate(()=>window.reloadMarker='existing audience');
    await page.reload();
    await page.getByRole('button',{name:'Open projector'}).click();
    assert.equal(await screen.evaluate(()=>window.reloadMarker),'existing audience');
    assert.match(await screen.locator('article p').innerText(),/In the beginning/i);
  });
}finally{await browser.close();}
if(failures.length)process.exitCode=1;
