import { mulberry32 } from './world-core.ts';
import type { TimeOfDay } from './environment-system.ts';
import type { StationQuestStep } from './station-quest.ts';

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
  private drone: OscillatorNode | null = null;
  private overtone: OscillatorNode | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
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

    const droneFilter = context.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.Q.value = 0.72;
    droneFilter.connect(master);
    const drone = context.createOscillator();
    drone.type = 'sine';
    drone.connect(droneFilter);
    const overtoneGain = context.createGain();
    overtoneGain.gain.value = 0.17;
    overtoneGain.connect(droneFilter);
    const overtone = context.createOscillator();
    overtone.type = 'triangle';
    overtone.connect(overtoneGain);

    const windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.Q.value = 0.5;
    const windGain = context.createGain();
    windGain.gain.value = 0.32;
    windFilter.connect(windGain);
    windGain.connect(master);
    const windBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const windData = windBuffer.getChannelData(0);
    const random = mulberry32(this.seedHash ^ 0xa7c31d5e);
    let smoothed = 0;
    for (let index = 0; index < windData.length; index += 1) {
      smoothed = smoothed * 0.985 + (random() * 2 - 1) * 0.015;
      windData[index] = smoothed;
    }
    const wind = context.createBufferSource();
    wind.buffer = windBuffer;
    wind.loop = true;
    wind.connect(windFilter);

    drone.start();
    overtone.start();
    wind.start();
    this.context = context;
    this.master = master;
    this.drone = drone;
    this.overtone = overtone;
    this.wind = wind;
    this.windFilter = windFilter;
    this.applyProfile(true);
  }

  private applyProfile(immediate = false) {
    if (!this.context || !this.master || !this.drone || !this.overtone || !this.windFilter) return;
    const profile = createArcaneAudioProfile(this.seedHash, this.timeOfDay);
    const now = this.context.currentTime;
    const settleAt = immediate ? now : now + 0.8;
    this.drone.frequency.cancelScheduledValues(now);
    this.overtone.frequency.cancelScheduledValues(now);
    this.windFilter.frequency.cancelScheduledValues(now);
    this.drone.frequency.linearRampToValueAtTime(profile.droneHz, settleAt);
    this.overtone.frequency.linearRampToValueAtTime(profile.overtoneHz, settleAt);
    this.windFilter.frequency.linearRampToValueAtTime(profile.windCutoffHz, settleAt);
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
    this.drone?.stop();
    this.overtone?.stop();
    this.wind?.stop();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.drone = null;
    this.overtone = null;
    this.wind = null;
    this.windFilter = null;
  }
}
