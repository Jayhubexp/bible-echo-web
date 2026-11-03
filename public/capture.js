class SermonCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(sampleRate * 5);
    this.used = 0;
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
    }
  }
  process(inputs) {
    if (this.done) return false;
    const mono = inputs[0]?.[0];
    if (!mono) return true;
    for (const sample of mono) {
      this.buffer[this.used++] = sample;
      if (this.used === this.buffer.length) this.flush();
    }
    return true;
  }
}
registerProcessor('sermon-capture', SermonCapture);
