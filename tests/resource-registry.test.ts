import assert from 'node:assert/strict';
import test from 'node:test';
import { ResourceRegistry } from '../app/resource-registry.ts';

test('shared resources are owned and disposed exactly once', () => {
  const registry = new ResourceRegistry();
  let disposeCalls = 0;
  const shared = { dispose: () => { disposeCalls += 1; } };
  registry.own(shared, 'geometries');
  registry.own(shared, 'geometries');
  assert.equal(registry.size, 1);
  const report = registry.dispose();
  assert.equal(disposeCalls, 1);
  assert.equal(report.disposed, 1);
  assert.equal(report.byCategory.geometries, 1);
});

test('registry disposal is idempotent and rejects late ownership', () => {
  const registry = new ResourceRegistry();
  registry.own({ dispose() {} }, 'materials');
  assert.equal(registry.dispose().alreadyDisposed, false);
  assert.deepEqual(registry.dispose(), { disposed: 0, byCategory: {}, alreadyDisposed: true });
  assert.throws(() => registry.own({ dispose() {} }), /after registry disposal/);
});
