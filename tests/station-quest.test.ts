import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceStationQuest, getStationQuest, getStationQuestCopy, type StationQuestStep } from '../app/station-quest.ts';

test('station quest follows a finite cross-region progression', () => {
  const states: StationQuestStep[] = ['sealed'];
  for (let index = 0; index < 6; index += 1) states.push(advanceStationQuest(states.at(-1)!));
  assert.deepEqual(states, ['sealed', 'decoded', 'accepted', 'stamped', 'arrived', 'complete', 'complete']);

  const quest = getStationQuest(101);
  assert.equal(getStationQuestCopy('sealed', quest).progress, '1 / 5');
  assert.match(getStationQuestCopy('stamped', quest).action!, new RegExp(quest.destination));
  assert.equal(getStationQuestCopy('arrived', quest).body, quest.delivery);
  assert.equal(getStationQuestCopy('complete', quest).action, null);
  assert.match(getStationQuestCopy('complete', quest).body, /restored/);
});

test('station quest content is deterministic and varies across seeds', () => {
  assert.deepEqual(getStationQuest(101), getStationQuest(101));
  assert.notDeepEqual(getStationQuest(101), getStationQuest(102));
  for (let seedHash = 0; seedHash < 30; seedHash += 1) {
    const quest = getStationQuest(seedHash);
    assert.ok(quest.destination.length > 0);
    assert.ok(quest.notice.length > 20);
    assert.ok(quest.request.length > 20);
    assert.ok(quest.delivery.length > 20);
    assert.ok(quest.reward.length > 20);
  }
});

test('every seeded courier route targets an existing world landmark', () => {
  const validLandmarks = new Set(['mountains', 'ruins', 'village']);
  const routes = Array.from({ length: 30 }, (_, seedHash) => getStationQuest(seedHash));
  assert.ok(routes.every((quest) => validLandmarks.has(quest.landmarkId)));
  assert.deepEqual(new Set(routes.map((quest) => quest.landmarkId)), validLandmarks);
});
