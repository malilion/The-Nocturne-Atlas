import assert from 'node:assert/strict';
import test from 'node:test';
import { RebuildCoordinator } from '../app/rebuild-coordinator.ts';

test('rapid requests keep only the latest payload', () => {
  const coordinator = new RebuildCoordinator<string>();
  const first = coordinator.request('A');
  const second = coordinator.request('B');
  const third = coordinator.request('C');

  assert.equal(first.signal.aborted, true);
  assert.equal(second.signal.aborted, true);
  assert.equal(third.signal.aborted, false);
  assert.equal(coordinator.takeLatest()?.payload, 'C');
});

test('a newer request aborts the active ticket and becomes next', () => {
  const coordinator = new RebuildCoordinator<string>();
  coordinator.request('old');
  const active = coordinator.takeLatest();
  assert.ok(active);

  coordinator.request('new');
  assert.equal(active.signal.aborted, true);
  assert.equal(coordinator.complete(active.id), false);
  assert.equal(coordinator.takeLatest()?.payload, 'new');
});

test('stale completion cannot clear the newest active ticket', () => {
  const coordinator = new RebuildCoordinator<string>();
  const queued = coordinator.request('latest');
  const active = coordinator.takeLatest();
  assert.ok(active);

  assert.equal(coordinator.complete(queued.id - 1), false);
  assert.equal(coordinator.isBusy, true);
  assert.equal(coordinator.complete(active.id), true);
  assert.equal(coordinator.isBusy, false);
});

test('dispose aborts queued and active work and is idempotent', () => {
  const coordinator = new RebuildCoordinator<string>();
  const active = coordinator.request('active');
  coordinator.takeLatest();
  const pending = coordinator.request('pending');

  coordinator.dispose();
  coordinator.dispose();
  assert.equal(active.signal.aborted, true);
  assert.equal(pending.signal.aborted, true);
  assert.equal(coordinator.isBusy, false);
  assert.throws(() => coordinator.request('late'), /after coordinator disposal/);
});
