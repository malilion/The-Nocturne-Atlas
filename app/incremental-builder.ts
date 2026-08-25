export type IncrementalScheduler = (signal: AbortSignal) => Promise<void>;

export function yieldToMainThread(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
      if (frame) cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('World generation canceled.', 'AbortError'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    frame = requestAnimationFrame(() => {
      frame = 0;
      timer = setTimeout(() => {
        timer = undefined;
        cleanup();
        resolve();
      }, 0);
    });
  });
}

export async function runIncrementally<T>(
  chunks: Generator<void, T, void>,
  signal: AbortSignal,
  schedule: IncrementalScheduler = yieldToMainThread,
): Promise<T> {
  let completed = false;

  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = chunks.next();
      if (chunk.done) {
        completed = true;
        return chunk.value;
      }
      await schedule(signal);
    }
  } finally {
    if (!completed) chunks.return(undefined as never);
  }
}

export function runSynchronously<T>(chunks: Generator<void, T, void>, signal?: AbortSignal): T {
  let completed = false;

  try {
    while (true) {
      signal?.throwIfAborted();
      const chunk = chunks.next();
      if (chunk.done) {
        completed = true;
        return chunk.value;
      }
    }
  } finally {
    if (!completed) chunks.return(undefined as never);
  }
}
