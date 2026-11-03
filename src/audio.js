function wav(samples, rate) {
  const data = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(data);
  const label = (offset, s) => [...s].forEach((c,i) => view.setUint8(offset+i,c.charCodeAt(0)));
  label(0,'RIFF'); view.setUint32(4,data.byteLength-8,true); label(8,'WAVEfmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,rate,true); view.setUint32(28,rate*2,true);
  view.setUint16(32,2,true); view.setUint16(34,16,true); label(36,'data');
  view.setUint32(40,samples.length*2,true);
  samples.forEach((s,i) => view.setInt16(44+2*i,Math.max(-1,Math.min(1,s)) * (s<0?32768:32767),true));
  return new Blob([data],{type:'audio/wav'});
}
export async function listen(onChunk,onError) {
  if (!navigator.mediaDevices?.getUserMedia) throw Error('Open the desk over HTTPS or localhost to use a microphone.');
  const ctx = new AudioContext({sampleRate:16000});
  let stream, node, pending = 0, chain = Promise.resolve(), failed = false, finish;
  const stopped = new Promise(resolve => { finish=resolve; });
  async function cleanup() {
    stream?.getTracks().forEach(track=>track.stop());
    node?.disconnect();
    if (ctx.state !== 'closed') await ctx.close();
  }
  function fail(message) {
    if (failed) return;
    failed = true;
    cleanup().finally(finish);
    onError(message);
  }
  try {
    await ctx.resume();
    stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1}});
    await ctx.audioWorklet.addModule('/capture.js');
    node = new AudioWorkletNode(ctx,'sermon-capture',{channelCount:1,channelCountMode:'explicit'});
    const mute=ctx.createGain(); mute.gain.value=0;
    node.connect(mute).connect(ctx.destination);
    node.port.onmessage = ({data}) => {
      if (failed) return;
      if (data === null) { cleanup().then(()=>chain).finally(finish); return; }
      if (pending >= 4) { fail('Transcription fell behind. Listening stopped. Restart when the API responds.'); return; }
      pending++;
      chain=chain.then(()=>!failed && onChunk(wav(data,ctx.sampleRate))).catch(e=>fail(e.message)).finally(()=>pending--);
    };
    stream.getAudioTracks()[0].onended=()=>fail('The microphone disconnected.');
    ctx.createMediaStreamSource(stream).connect(node);
    return async () => { if (!failed) node.port.postMessage('stop'); await stopped; };
  } catch (e) { await cleanup(); throw e; }
}
