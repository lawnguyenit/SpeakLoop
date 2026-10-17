import {
  encodePcm16Wav,
  resampleTo16kMono,
  TARGET_SAMPLE_RATE,
  WebAudioWavRecorder,
} from './wavRecorder.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests(): Promise<void> {
  // 1. Test resampleTo16kMono from 48 kHz and 44.1 kHz
  const oneSec48k = new Float32Array(48000);
  for (let i = 0; i < oneSec48k.length; i++) {
    oneSec48k[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
  }
  const resampledFrom48k = resampleTo16kMono(oneSec48k, 48000, TARGET_SAMPLE_RATE);
  assert(resampledFrom48k.length === 16000, `Expected 16000 samples from 48k, got ${resampledFrom48k.length}`);

  const halfSec441k = new Float32Array(22050);
  halfSec441k.fill(0.25);
  const resampledFrom441k = resampleTo16kMono(halfSec441k, 44100, TARGET_SAMPLE_RATE);
  assert(resampledFrom441k.length === 8000, `Expected 8000 samples from 22050@44.1k, got ${resampledFrom441k.length}`);
  assert(Math.abs(resampledFrom441k[100] - 0.25) < 1e-5, 'Expected DC level preserved after resampling');

  // 2. Test encodePcm16Wav RIFF/WAVE header and sample clamping
  const testSamples = new Float32Array([-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5]);
  const wavBuf = encodePcm16Wav(testSamples, TARGET_SAMPLE_RATE);
  assert(wavBuf.byteLength === 44 + testSamples.length * 2, 'WAV byte length must be 44 + 2*N');
  const view = new DataView(wavBuf);
  const readFourCC = (off: number) =>
    String.fromCharCode(
      view.getUint8(off),
      view.getUint8(off + 1),
      view.getUint8(off + 2),
      view.getUint8(off + 3)
    );
  assert(readFourCC(0) === 'RIFF', 'ChunkID must be RIFF');
  assert(readFourCC(8) === 'WAVE', 'Format must be WAVE');
  assert(readFourCC(12) === 'fmt ', 'Subchunk1ID must be fmt ');
  assert(view.getUint16(20, true) === 1, 'AudioFormat must be 1 (PCM)');
  assert(view.getUint16(22, true) === 1, 'NumChannels must be 1 (mono)');
  assert(view.getUint32(24, true) === 16000, 'SampleRate must be 16000');
  assert(view.getUint32(28, true) === 32000, 'ByteRate must be 32000');
  assert(view.getUint16(32, true) === 2, 'BlockAlign must be 2');
  assert(view.getUint16(34, true) === 16, 'BitsPerSample must be 16');
  assert(readFourCC(36) === 'data', 'Subchunk2ID must be data');
  assert(view.getUint32(40, true) === testSamples.length * 2, 'Subchunk2Size must match PCM bytes');
  assert(view.getInt16(44, true) === -32768, 'Clamped -1.5 must encode to -32768');
  assert(view.getInt16(44 + 6 * 2, true) === 32767, 'Clamped +1.5 must encode to +32767');

  // 3. Test late getUserMedia resolution after cleanupHardware() stops tracks immediately
  let lateTrackStopped = false;
  let audioCtxConstructed = false;
  let resolvePendingGetUserMedia!: (stream: MediaStream) => void;
  let getUserMediaCalls = 0;

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = g;
  Object.defineProperty(g, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => {
          getUserMediaCalls++;
          return new Promise<MediaStream>((resolve) => {
            resolvePendingGetUserMedia = resolve;
          });
        },
      },
    },
  });
  g.AudioContext = class FakeAudioContext {
    state = 'running';
    sampleRate = 48000;
    constructor() {
      audioCtxConstructed = true;
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  };

  const recorder1 = new WebAudioWavRecorder();
  const startPromise1 = recorder1.start({
    onLevel: () => {},
    onAutoStop: () => {},
    onError: () => {},
  });

  // Concurrent start click while permission is pending must be ignored
  await recorder1.start({
    onLevel: () => {},
    onAutoStop: () => {},
    onError: () => {},
  });
  assert(getUserMediaCalls === 1, 'Concurrent start() while permission pending must not call getUserMedia twice');

  // Unmount/cleanup before getUserMedia resolves
  recorder1.cleanupHardware();

  // Now resolve getUserMedia late
  resolvePendingGetUserMedia({
    getTracks: () => [
      {
        stop: () => {
          lateTrackStopped = true;
        },
      } as unknown as MediaStreamTrack,
    ],
  } as unknown as MediaStream);

  let start1Rejected = false;
  try {
    await startPromise1;
  } catch {
    start1Rejected = true;
  }
  assert(start1Rejected, 'Cancelled start() should reject when cleaned up before getUserMedia resolves');
  assert(lateTrackStopped, 'Late getUserMedia stream tracks must be stopped immediately upon resolution');
  assert(!audioCtxConstructed, 'AudioContext must not be constructed after cancellation');

  // 4. Test AudioContext resume/setup failure stops acquired stream tracks and closes context
  let setupFailureTrackStopped = false;
  let setupFailureCtxClosed = false;

  Object.defineProperty(g, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () =>
          ({
            getTracks: () => [
              {
                stop: () => {
                  setupFailureTrackStopped = true;
                },
              } as unknown as MediaStreamTrack,
            ],
          }) as unknown as MediaStream,
      },
    },
  });

  g.AudioContext = class FailingAudioContext {
    state = 'suspended';
    sampleRate = 48000;
    async resume(): Promise<void> {
      throw new Error('AudioContext resume failed');
    }
    async close(): Promise<void> {
      this.state = 'closed';
      setupFailureCtxClosed = true;
    }
  };

  const recorder2 = new WebAudioWavRecorder();
  let errorCallbackFired = false;
  let start2Rejected = false;
  try {
    await recorder2.start({
      onLevel: () => {},
      onAutoStop: () => {},
      onError: () => {
        errorCallbackFired = true;
      },
    });
  } catch {
    start2Rejected = true;
  }
  assert(start2Rejected && errorCallbackFired, 'AudioContext setup failure should notify onError and reject');
  assert(setupFailureTrackStopped, 'Acquired microphone tracks must be stopped when AudioContext setup fails');
  assert(setupFailureCtxClosed, 'AudioContext must be closed when setup fails');

  console.log('All wavRecorder encoding and lifecycle safety checks passed.');
}

void runTests();
