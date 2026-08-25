import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceStationQuest, getStationQuest, getStationQuestCopy, type StationQuestStep } from '../app/station-quest.ts';

test('station quest follows a finite three-action progression', () => {
  const states: StationQuestStep[] = ['sealed'];
  for (let index = 0; index < 4; index += 1) states.push(advanceStationQuest(states.at(-1)!));
  assert.deepEqual(states, ['sealed', 'decoded', 'accepted', 'complete', 'complete']);

  const quest = getStationQuest(101);
  assert.equal(getStationQuestCopy('sealed', quest).progress, '1 / 3');
  assert.equal(getStationQuestCopy('complete', quest).action, null);
  assert.match(getStationQuestCopy('complete', quest).body, /authorized/);
});

test('station quest content is deterministic and varies across seeds', () => {
  assert.deepEqual(getStationQuest(101), getStationQuest(101));
  assert.notDeepEqual(getStationQuest(101), getStationQuest(102));
  for (let seedHash = 0; seedHash < 30; seedHash += 1) {
    const quest = getStationQuest(seedHash);
    assert.ok(quest.destination.length > 0);
    assert.ok(quest.notice.length > 20);
    assert.ok(quest.request.length > 20);
    assert.ok(quest.reward.length > 20);
  }
});
