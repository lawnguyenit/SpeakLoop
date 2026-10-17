/**
 * Web Audio microphone capture with local resampling and 16 kHz mono PCM16 WAV encoding.
 * No MediaRecorder WebM dependency. Strictly caps duration at 15 seconds.
 * Includes generation/cancellation safety so late getUserMedia resolutions or
 * AudioContext setup failures never leak active tracks or contexts.
 */

export const TARGET_SAMPLE_RATE = 16000;
export const MAX_RECORDING_SECONDS = 14.8; // Safe margin under 15.0s backend limit

export interface EncodedWavTake {
  blob: Blob;
  objectUrl: string;
  durationSeconds: number;
  sampleRate: number;
  peak: number;
  rms: number;
}

/**
 * Downsamples or resamples mono Float32 PCM from `sourceRate` to `targetRate` (16000 Hz)
 * using box-filter anti-aliased averaging when downsampling, or linear interpolation when upsampling.
 */
export function resampleTo16kMono(
  input: Float32Array,
  sourceRate: number,
  targetRate = TARGET_SAMPLE_RATE
): Float32Array {
  if (input.length === 0) {
    return new Float32Array(0);
  }
  if (sourceRate === targetRate) {
    return input;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  if (ratio > 1) {
    // Anti-aliased averaging filter for downsampling (e.g., 48000 -> 16000 or 44100 -> 16000)
    for (let i = 0; i < outputLength; i++) {
      const start = i * ratio;
      const end = (i + 1) * ratio;
      const startIndex = Math.floor(start);
      const endIndex = Math.min(input.length - 1, Math.ceil(end));

      let sum = 0;
      let weightSum = 0;

      for (let j = startIndex; j <= endIndex; j++) {
        const left = Math.max(start, j);
        const right = Math.min(end, j + 1);
        const weight = Math.max(0, right - left);
        if (weight > 0) {
          sum += input[j] * weight;
          weightSum += weight;
        }
      }

      output[i] =
        weightSum > 0 ? sum / weightSum : input[Math.min(input.length - 1, Math.round(start))];
    }
  } else {
    // Linear interpolation if sourceRate < targetRate
    for (let i = 0; i < outputLength; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = input[Math.min(input.length - 1, idx)];
      const s1 = input[Math.min(input.length - 1, idx + 1)];
      output[i] = s0 + frac * (s1 - s0);
    }
  }

  return output;
}

/**
 * Encodes mono Float32 samples [-1, 1] into a standard 44-byte RIFF/WAVE PCM16 buffer.
 */
export function encodePcm16Wav(
  samples: Float32Array,
  sampleRate = TARGET_SAMPLE_RATE
): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');

  // fmt sub-chunk
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size = 16
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample = 16

  // data sub-chunk
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return buffer;
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type RecorderErrorKind = 'permission_denied' | 'unsupported' | 'unknown';

export interface ActiveRecorderCallbacks {
  onLevel: (rms: number, peak: number, elapsedSeconds: number) => void;
  onAutoStop: (take: EncodedWavTake) => void;
  onError: (kind: RecorderErrorKind, message?: string) => void;
}

function stopStreamTracks(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // ignore
    }
  }
}

export class WebAudioWavRecorder {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private totalSamples = 0;
  private inputSampleRate = 48000;
  private recording = false;
  private starting = false;
  private generation = 0;
  private autoStopTriggered = false;

  static isSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const hasGetUserMedia = Boolean(
      navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
    );
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return hasGetUserMedia && Boolean(AudioCtx);
  }

  isPendingOrRecording(): boolean {
    return this.starting || this.recording;
  }

  async start(callbacks: ActiveRecorderCallbacks): Promise<void> {
    if (this.starting || this.recording) {
      return;
    }

    if (!WebAudioWavRecorder.isSupported()) {
      callbacks.onError('unsupported');
      throw new Error('unsupported');
    }

    // Increment generation and clean up any leftover resources
    this.cleanupHardware();
    const myGeneration = ++this.generation;
    this.starting = true;
    this.chunks = [];
    this.totalSamples = 0;
    this.autoStopTriggered = false;

    let acquiredStream: MediaStream | null = null;

    try {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (err) {
        if (
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' ||
            err.name === 'PermissionDeniedError' ||
            err.name === 'SecurityError')
        ) {
          throw err;
        }
        // If cancelled while waiting for first getUserMedia attempt, do not start fallback
        if (myGeneration !== this.generation) {
          throw new Error('cancelled');
        }
        acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      stopStreamTracks(acquiredStream);
      if (myGeneration === this.generation) {
        this.starting = false;
        this.cleanupHardware();
        if (
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' ||
            err.name === 'PermissionDeniedError' ||
            err.name === 'SecurityError')
        ) {
          callbacks.onError('permission_denied', err.message);
        } else {
          callbacks.onError('unknown', err instanceof Error ? err.message : String(err));
        }
      }
      throw err;
    }

    // If unmount/cleanup/stop happened while getUserMedia was pending, immediately stop tracks
    if (myGeneration !== this.generation) {
      stopStreamTracks(acquiredStream);
      throw new Error('cancelled');
    }

    this.stream = acquiredStream;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Re-check generation after async resume()
      if (myGeneration !== this.generation) {
        throw new Error('cancelled');
      }
      if (!this.audioCtx || !this.stream) {
        throw new Error('cancelled');
      }

      this.inputSampleRate = this.audioCtx.sampleRate || 48000;
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
      this.processorNode = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.silentGainNode = this.audioCtx.createGain();
      this.silentGainNode.gain.value = 0;

      this.starting = false;
      this.recording = true;

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.recording || myGeneration !== this.generation) return;

        const inputBuffer = event.inputBuffer.getChannelData(0);
        const copy = new Float32Array(inputBuffer.length);
        copy.set(inputBuffer);
        this.chunks.push(copy);
        this.totalSamples += copy.length;

        let sumSq = 0;
        let peak = 0;
        for (let i = 0; i < copy.length; i++) {
          const abs = Math.abs(copy[i]);
          sumSq += abs * abs;
          if (abs > peak) peak = abs;
        }
        const rms = copy.length > 0 ? Math.sqrt(sumSq / copy.length) : 0;
        const elapsedSeconds = this.totalSamples / this.inputSampleRate;

        callbacks.onLevel(rms, peak, elapsedSeconds);

        if (elapsedSeconds >= MAX_RECORDING_SECONDS && !this.autoStopTriggered) {
          this.autoStopTriggered = true;
          const take = this.stop();
          if (take) {
            callbacks.onAutoStop(take);
          }
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.silentGainNode);
      this.silentGainNode.connect(this.audioCtx.destination);
    } catch (setupErr) {
      const wasCurrent = myGeneration === this.generation;
      if (wasCurrent) this.cleanupHardware();
      if (wasCurrent && (setupErr as Error)?.message !== 'cancelled') {
        callbacks.onError(
          'unknown',
          setupErr instanceof Error ? setupErr.message : String(setupErr)
        );
      }
      throw setupErr;
    }
  }

  stop(): EncodedWavTake | null {
    // Invalidate any pending start generation
    this.generation++;
    this.starting = false;

    if (!this.recording && this.chunks.length === 0) {
      this.cleanupHardware();
      return null;
    }

    this.recording = false;
    const sourceRate = this.inputSampleRate;
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    this.chunks = [];
    this.totalSamples = 0;
    this.cleanupHardware();

    const maxInputSamples = Math.floor(MAX_RECORDING_SECONDS * sourceRate);
    const trimmed =
      merged.length > maxInputSamples ? merged.subarray(0, maxInputSamples) : merged;

    const resampled16k = resampleTo16kMono(trimmed, sourceRate, TARGET_SAMPLE_RATE);

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < resampled16k.length; i++) {
      const abs = Math.abs(resampled16k[i]);
      sumSq += abs * abs;
      if (abs > peak) peak = abs;
    }
    const rms = resampled16k.length > 0 ? Math.sqrt(sumSq / resampled16k.length) : 0;
    const durationSeconds = resampled16k.length / TARGET_SAMPLE_RATE;

    const wavBuffer = encodePcm16Wav(resampled16k, TARGET_SAMPLE_RATE);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const objectUrl = URL.createObjectURL(blob);

    return {
      blob,
      objectUrl,
      durationSeconds,
      sampleRate: TARGET_SAMPLE_RATE,
      peak,
      rms,
    };
  }

  cleanupHardware(): void {
    // Advance generation so any in-flight getUserMedia or resume() aborts and cleans up
    this.generation++;
    this.starting = false;
    this.recording = false;

    if (this.processorNode) {
      try {
        this.processorNode.onaudioprocess = null;
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch {
        // ignore
      }
      this.silentGainNode = null;
    }
    if (this.stream) {
      stopStreamTracks(this.stream);
      this.stream = null;
    }
    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== 'closed') {
          void this.audioCtx.close();
        }
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }
}
