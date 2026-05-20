/**
 * Run an async `worker` over `tasks` with a worker-pool of `concurrency`.
 * As soon as one worker finishes it picks up the next task, so a single slow
 * task doesn't stall the others in its batch (head-of-line blocking).
 */
export async function runBatched<T>(
  tasks: T[],
  concurrency: number,
  worker: (task: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    runners.push((async () => {
      while (next < tasks.length) {
        const idx = next++;
        await worker(tasks[idx]);
      }
    })());
  }
  await Promise.all(runners);
}
