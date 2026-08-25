import assert from 'node:assert/strict';
import test from 'node:test';
import { ArcaneAudioSystem, createArcaneAudioProfile, getStationCueFrequencies } from '../app/arcane-audio.ts';

test('procedural audio profiles are deterministic, seed-aware, and day-aware', () => {
  const night = createArcaneAudioProfile(12345, 'night');
  const repeat = createArcaneAudioProfile(12345, 'night');
  const changed = createArcaneAudioProfile(12346, 'night');
  const day = createArcaneAudioProfile(12345, 'day');
  assert.deepEqual(night, repeat);
  assert.notDeepEqual(night, changed);
  assert.notDeepEqual(night, day);
  assert.ok(night.droneHz > 40 && night.droneHz < 60);
  assert.ok(day.windCutoffHz > night.windCutoffHz);
  assert.ok(day.masterGain < night.masterGain);
});

test('station cues expand with quest progress and audio lifecycle is server-safe', async () => {
  assert.deepEqual(getStationCueFrequencies('sealed', 42), []);
  assert.equal(getStationCueFrequencies('decoded', 42).length, 2);
  assert.equal(getStationCueFrequencies('accepted', 42).length, 3);
  assert.equal(getStationCueFrequencies('complete', 42).length, 4);
  assert.deepEqual(getStationCueFrequencies('complete', 42), getStationCueFrequencies('complete', 42));

  const audio = new ArcaneAudioSystem(42);
  assert.equal(await audio.setEnabled(true), false);
  audio.setSeed(43);
  audio.setTimeOfDay('day');
  audio.playStationCue('complete');
  audio.dispose();
  audio.dispose();
});
