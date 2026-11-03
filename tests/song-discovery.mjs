import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

// Empty workspace fixture. Exercise the actual search, editor and save UI.
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
  const page=await browser.newPage();
  const saved=[];let recommendations=0;
  await page.addInitScript(()=>sessionStorage.setItem('echo-key','fixture'));
  await page.route('**/api/v1/health',route=>route.fulfill({json:{status:'ok'}}));
  await page.route('**/api/v1/workspace/*',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/assist')){recommendations++;return route.fulfill({json:{summary:'Suggested hymn',songs:['saved-1']}});}
    if(path.endsWith('/songs')&&route.request().method()==='POST'){
      const row={id:'saved-1',revision:1,body:route.request().postDataJSON()};saved.push(row);
      return route.fulfill({json:row});
    }
    return route.fulfill({json:path.endsWith('/songs')?saved:[]});
  });
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:5387');
  await page.getByRole('button',{name:'Songs',exact:true}).click();
  await page.getByText('Find songs by theme',{exact:true}).click();
  const theme=page.getByLabel('Service theme',{exact:true});
  const find=page.getByRole('button',{name:'Find matching songs'});
  await theme.fill('Amazing grace');await find.click();
  const hymn=page.getByRole('button',{name:/Amazing Grace.*Open draft/});
  await hymn.waitFor();assert.equal(recommendations,0);
  const query=page.getByLabel('Find by title, artist, theme or lyrics');
  await query.fill('how sweet the sound that saved');await hymn.click();
  await page.getByRole('link',{name:'View source edition'}).waitFor();
  assert.equal(await page.getByLabel('Lyrics 7',{exact:true}).count(),1);
  assert.equal(saved.length,0);
  await page.getByLabel('I have permission').check();
  await page.getByRole('button',{name:'Save song',exact:true}).click();
  await page.getByText('Song saved.',{exact:true}).waitFor();
  assert.equal(saved[0].body.sections.length,7);
  assert(saved[0].body.license.includes('https://hymnary.org/hymn/CYBER/144'));
  await page.reload();await page.getByRole('button',{name:'Songs',exact:true}).click();
  await query.fill('I once was lost but now am found');
  await page.getByRole('button',{name:/Amazing Grace.*John Newton/}).waitFor();
  assert.equal(await hymn.count(),0);
  await page.getByText('Find songs by theme',{exact:true}).click();
  await theme.fill('comfort in uncertainty');await find.click();
  await page.getByText('Suggested hymn',{exact:true}).waitFor();assert.equal(recommendations,1);
  await query.fill('unknown song');await page.getByText(/import authorized lyrics/).waitFor();
  console.log('PASS empty-library title and cross-line lyric search, review, explicit save, reload, assistant fallback and missing-song guidance');
}finally{await browser.close();}
