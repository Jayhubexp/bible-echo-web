class SermonCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(sampleRate * 3);
    this.used = 0;
    this.heardSpeech = false;
    this.quietSamples = 0;
    this.done = false;
    this.port.onmessage = () => {
      this.done = true;
      this.flush();
      this.port.postMessage(null);
    };
  }
  flush() {
    if (this.used) {
      const samples = this.buffer.slice(0, this.used);
      this.port.postMessage(samples, [samples.buffer]);
      this.used = 0;
      this.heardSpeech = false;
      this.quietSamples = 0;
    }
  }
  process(inputs) {
    if (this.done) return false;
    const mono = inputs[0]?.[0];
    if (!mono) return true;
    let energy = 0;
    for (const sample of mono) energy += sample * sample;
    const quiet = energy < mono.length * 0.008 ** 2;
    for (const sample of mono) {
      this.buffer[this.used++] = sample;
      if (quiet) this.quietSamples++;
      else { this.heardSpeech = true; this.quietSamples = 0; }
      if (this.used === this.buffer.length) this.flush();
    }
    // Keep every sample, but prefer a short pause over cutting a word at three seconds.
    if (this.heardSpeech && this.used >= sampleRate * 2.1 && this.quietSamples >= sampleRate * 0.18) this.flush();
    return true;
  }
}
registerProcessor('sermon-capture', SermonCapture);
