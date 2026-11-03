import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';

const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const url=process.env.TEST_URL||'http://127.0.0.1:5387';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const capture=async name=>{
 if(process.env.TEST_SHOTS){await mkdir(process.env.TEST_SHOTS,{recursive:true});await page.screenshot({path:join(process.env.TEST_SHOTS,name+'.png')});}
};
try{
 const song={id:'song-1',body:{title:'Morning prayer',artist:'Choir',category:'Worship',sections:[{label:'Verse',text:'Morning light'}],arrangement:[0],lines:3,size:5,color:'#ffffff',margin:5}};
 const media={id:'media-1',body:{title:'Evening hills',thumb:'/vesper.svg',mime:'image/webp',category:'Worship',motion:'Still'}};
 const start=new Date(Date.now()+120000).toISOString();
 const service={id:'service-1',revision:1,body:{startUtc:start,endUtc:start,plan:{title:'Sunday gathering',timezone:'Africa/Accra',localStart:start.slice(0,16),items:[
   {title:'Welcome',type:'Announcements',minutes:1,songs:[],action:'Display',text:'Welcome to worship',layout:'center'},
   {title:'Morning prayer',type:'Praise and worship',minutes:2,songs:['song-1'],action:'Display',layout:'center'}]},run:{status:'Scheduled',index:-1}}};
 await page.route('**/workspace/services/service-1/*',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('ownership'))return route.fulfill({json:{owned:true,revision:service.revision}});
   const {action}=route.request().postDataJSON();service.revision++;
   if(action==='arm')service.body.run={status:'Armed',index:-1,due:start};
   if(action==='next')service.body.run={status:'Paused',index:0,remaining:60};
   if(action==='stop')service.body.run={status:'Completed',index:0};
   return route.fulfill({json:service});
 });
 await page.route('**/workspace/*',route=>{
   const kind=new URL(route.request().url()).pathname.split('/').pop();
   return route.fulfill({json:kind==='songs'?[song]:kind==='media'?[media]:kind==='services'?[service]:[]});
 });
 await page.goto(url);
 await page.getByRole('heading',{name:'Live Desk',exact:true}).waitFor();
 await capture('production-console');
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Open projector'}).click();const audience=await popup;
 await page.getByLabel('Reference or passage keywords').fill('Luke 18:1-7');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 await page.locator('.consoleScreen article').waitFor();assert.equal(await audience.locator('article').count(),0);
 await page.getByRole('button',{name:'Go live'}).click();await audience.getByText('Luke 18:1 · KJV',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await page.locator('.consoleScreen').getByText('Luke 18:2 · KJV',{exact:true}).waitFor();
 assert.match(await audience.locator('article b').innerText(),/Luke 18:1/);
 await page.getByRole('button',{name:'Blackout',exact:true}).click();await audience.locator('.blank').waitFor();
 await page.getByRole('button',{name:'Restore screen'}).click();
 await page.getByRole('button',{name:'Switch to light theme'}).click();await page.reload();
 assert(await page.locator('.app.light').count());await capture('glassy-workspace');
 await page.getByRole('button',{name:'Songs',exact:true}).click();
 await page.getByLabel('Shared operator passphrase').fill('fixture');
 await page.getByRole('button',{name:'Unlock shared library'}).click();
 await page.getByRole('navigation',{name:'Workspace tools'}).getByRole('button',{name:'Live Desk'}).click();
 await page.getByLabel('Reference or passage keywords').fill('John 3:16');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.getByRole('button',{name:'Project verse',exact:true}).click();
 await audience.getByText('John 3:16 · KJV',{exact:true}).waitFor();
 await capture('light-service-desk');
 await page.getByRole('button',{name:'Switch to dark theme'}).click();await capture('dark-service-desk');
 await page.getByRole('navigation',{name:'Workspace tools'}).getByRole('button',{name:'Songs'}).click();
 await page.getByRole('button',{name:/Morning prayer/}).click();
 await page.getByRole('button',{name:'Load saved song into service queue'}).click();
 await page.getByRole('button',{name:'Add to Sunday worship'}).click();
 await page.getByText(/2\. Morning prayer/).waitFor();
 await page.getByRole('button',{name:'Service schedule',exact:true}).click();
 await page.getByRole('button',{name:/Sunday gathering/}).click();
 await page.getByRole('button',{name:'Arm Service',exact:true}).click();
 await page.getByText('Service armed.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Next Item',exact:true}).click();
 await audience.getByText('Welcome to worship',{exact:true}).waitFor();
 await page.locator('.cueList .currentCue').getByText('Welcome',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Stop Service',exact:true}).click();
 await page.getByRole('button',{name:'Media Library',exact:true}).click();await page.locator('.assetGrid img').waitFor();
 for(const width of [1366,1024,768,390]){
   await page.setViewportSize({width,height:800});
   for(const name of ['Live Desk','Scripture','Backgrounds','Media Library','Songs','Service Planner']){
     await page.getByRole('navigation',{name:'Workspace tools'}).getByRole('button',{name,exact:true}).click();
     if(name==='Live Desk'&&width===1366)assert((await page.getByRole('button',{name:'Start listening'}).boundingBox()).y<800);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflows at '+width);
   }
 }
 assert.deepEqual(errors,[]);console.log('PASS themes, preview isolation, live controls, song queue, armed manual cue, media thumbnails and six tools at four viewport widths.');
}finally{await browser.close();}

