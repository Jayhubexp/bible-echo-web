import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {spokenVerseIndex} from '../src/spokenNavigation.js';

const verses=Array.from({length:7},(_,i)=>({id:i+10,verse:i+1}));
const range={verses},screen={verse:verses[0]};
const follow=(words,slide=screen)=>spokenVerseIndex(words,range,slide);
assert.equal(follow('Verse two.'),1);
assert.equal(spokenVerseIndex('Two.',range,screen,'Listen carefully. Verse'),1);
assert.equal(follow('Verse 2 says we should pray.'),1);
assert.equal(follow('Next.'),1);
assert.equal(follow('Next verse, please.',{verse:verses[1]}),2);
assert.equal(follow('Verse six. Next.'),6);
for(const text of ['Next Sunday we meet.','The next verse is interesting.','Verse 8.','Verse 2 to 7.'])assert.equal(follow(text),-1);
assert.equal(follow('Next.',{verse:verses[6]}),-1);
assert.equal(follow('Next.',{...screen,clear:true}),-1);
assert.equal(follow('Next.',{...screen,caption:{text:'Song'}}),-1);
assert.equal(follow('Next.',{verse:{id:99}}),-1);
console.log('PASS spoken jumps, advancement, range boundaries and live-slide guards');

let Processor;
const packets=[];
runInNewContext(readFileSync(new URL('../public/capture.js',import.meta.url),'utf8'),{
  sampleRate:16000,AudioWorkletProcessor:class {port={postMessage:s=>packets.push(s)};},
  registerProcessor:(_,ctor)=>{Processor=ctor;}
});
const capture=new Processor();
function feed(samples,value){
  for(let n=0;n<samples;n+=128)capture.process([[new Float32Array(Math.min(128,samples-n)).fill(value)]]);
}
feed(44000,0.1);feed(4000,0);
assert.equal(packets.length,1);
feed(88000,0.1);capture.port.onmessage();
assert.equal(packets.at(-1),null);
assert.equal(packets[1].length,48000);
assert.equal(packets.slice(0,-1).reduce((n,p)=>n+p.length,0),136000);
console.log('PASS pause-aware capture, three-second cap and lossless final flush');
