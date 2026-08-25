import type { TimeOfDay } from './environment-system.ts';
import type { StationQuestStep } from './station-quest.ts';

// Relative (no leading slash) so it resolves correctly whether the page is
// served from the site root or a GitHub Pages project subpath.
const TRACK_URL = 'audio/beyond-the-mist.mp3';

let cachedTrackBuffer: AudioBuffer | null = null;
let cachedTrackPromise: Promise<AudioBuffer> | null = null;

function loadTrackBuffer(context: AudioContext): Promise<AudioBuffer> {
  if (cachedTrackBuffer) return Promise.resolve(cachedTrackBuffer);
  if (!cachedTrackPromise) {
    cachedTrackPromise = fetch(TRACK_URL)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        cachedTrackBuffer = buffer;
        return buffer;
      });
  }
  return cachedTrackPromise;
}

export interface ArcaneAudioProfile {
  droneHz: number;
  overtoneHz: number;
  windCutoffHz: number;
  masterGain: number;
}

export function createArcaneAudioProfile(seedHash: number, timeOfDay: TimeOfDay): ArcaneAudioProfile {
  const variation = (seedHash % 17) / 17;
  const night = timeOfDay === 'night';
  return {
    droneHz: Number((night ? 43 + variation * 9 : 54 + variation * 11).toFixed(3)),
    overtoneHz: Number((night ? 86 + variation * 18 : 108 + variation * 22).toFixed(3)),
    windCutoffHz: Number((night ? 520 + variation * 180 : 760 + variation * 260).toFixed(3)),
    masterGain: night ? 0.105 : 0.075,
  };
}

export function getStationCueFrequencies(step: StationQuestStep, seedHash: number) {
  const root = 196 + (seedHash % 7) * 7;
  if (step === 'decoded') return [root, root * 1.25];
  if (step === 'accepted') return [root, root * 1.2, root * 1.5];
  if (step === 'stamped') return [root, root * 1.25, root * 1.5, root * 1.75];
  if (step === 'arrived') return [root * 1.25, root * 1.5, root * 2];
  if (step === 'complete') return [root, root * 1.25, root * 1.5, root * 1.75, root * 2];
  return [];
}

type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class ArcaneAudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private track: AudioBufferSourceNode | null = null;
  private seedHash: number;
  private timeOfDay: TimeOfDay;
  private enabled = false;
  private disposed = false;

  constructor(seedHash: number, timeOfDay: TimeOfDay = 'night') {
    this.seedHash = seedHash;
    this.timeOfDay = timeOfDay;
  }

  private initialize() {
    if (this.context || this.disposed || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    void this.startTrack(context, master);
  }

  private async startTrack(context: AudioContext, master: GainNode) {
    const buffer = await loadTrackBuffer(context);
    if (this.disposed || this.context !== context) return;
    const track = context.createBufferSource();
    track.buffer = buffer;
    track.loop = true;
    track.connect(master);
    track.start();
    this.track = track;
    this.applyProfile(true);
  }

  private applyProfile(immediate = false) {
    if (!this.context || !this.master) return;
    const profile = createArcaneAudioProfile(this.seedHash, this.timeOfDay);
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(this.enabled ? profile.masterGain : 0, immediate ? now : now + 0.35);
  }

  async setEnabled(enabled: boolean) {
    if (this.disposed) return false;
    this.enabled = enabled;
    if (enabled) this.initialize();
    if (!this.context) return false;
    if (enabled && this.context.state === 'suspended') await this.context.resume();
    this.applyProfile();
    return true;
  }

  setSeed(seedHash: number) {
    this.seedHash = seedHash;
    this.applyProfile();
  }

  setTimeOfDay(timeOfDay: TimeOfDay) {
    this.timeOfDay = timeOfDay;
    this.applyProfile();
  }

  playStationCue(step: StationQuestStep) {
    if (!this.enabled || !this.context || !this.master) return;
    const frequencies = getStationCueFrequencies(step, this.seedHash);
    const now = this.context.currentTime;
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * 0.09);
      gain.gain.linearRampToValueAtTime(0.12, now + index * 0.09 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.58);
      oscillator.connect(gain);
      gain.connect(this.master!);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.62);
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.track?.stop();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.track = null;
  }
}
