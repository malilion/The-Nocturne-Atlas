import assert from 'node:assert/strict';
import test from 'node:test';
import { runIncrementally, runSynchronously, type IncrementalScheduler } from '../app/incremental-builder.ts';

test('synchronous builds drain every deterministic chunk', () => {
  const visited: number[] = [];
  function* build() {
    visited.push(1);
    yield;
    visited.push(2);
    yield;
    visited.push(3);
    return 'complete';
  }

  assert.equal(runSynchronously(build()), 'complete');
  assert.deepEqual(visited, [1, 2, 3]);
});

test('incremental builds yield between chunks', async () => {
  const events: string[] = [];
  const schedule: IncrementalScheduler = async () => {
    events.push('yield');
  };
  function* build() {
    events.push('chunk-1');
    yield;
    events.push('chunk-2');
    return 42;
  }

  const result = await runIncrementally(build(), new AbortController().signal, schedule);
  assert.equal(result, 42);
  assert.deepEqual(events, ['chunk-1', 'yield', 'chunk-2']);
});

test('abort stops an incremental build before its next chunk and closes it', async () => {
  const controller = new AbortController();
  const visited: number[] = [];
  let cleaned = false;
  const schedule: IncrementalScheduler = async () => {
    controller.abort();
  };
  function* build() {
    try {
      visited.push(1);
      yield;
      visited.push(2);
      return 'unreachable';
    } finally {
      cleaned = true;
    }
  }

  await assert.rejects(runIncrementally(build(), controller.signal, schedule), { name: 'AbortError' });
  assert.deepEqual(visited, [1]);
  assert.equal(cleaned, true);
});
