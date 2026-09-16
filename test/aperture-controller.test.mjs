import assert from 'node:assert/strict';
import test from 'node:test';

import { createApertureController } from '../assets/js/aperture-controller.js';

function createScheduler() {
  let time = 0;
  let nextId = 0;
  const tasks = new Map();

  return {
    now: () => time,
    schedule(callback, delay) {
      const id = nextId += 1;
      tasks.set(id, { callback, due: time + delay });
      return id;
    },
    cancel(id) {
      tasks.delete(id);
    },
    advance(milliseconds) {
      const target = time + milliseconds;
      while ([...tasks.values()].some((task) => task.due <= target)) {
        const [id, next] = [...tasks.entries()].filter(([, task]) => task.due <= target).sort(([, left], [, right]) => left.due - right.due)[0];
        time = next.due;
        tasks.delete(id);
        next.callback();
      }
      time = target;
    }
  };
}

test('starts once and completes all authored aperture frames without looping', () => {
  const scheduler = createScheduler();
  const frames = [];
  const controller = createApertureController({
    durations: [4, 3, 4, 4, 5, 3],
    onFrame: (index) => frames.push(index),
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    now: scheduler.now
  });

  assert.deepEqual(controller.state(), { index: 0, status: 'idle', playCount: 0 });
  controller.start();
  scheduler.advance(23);
  controller.start();

  assert.deepEqual(frames, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(controller.state(), { index: 5, status: 'complete', playCount: 1 });
});

test('pauses and resumes using the remaining duration', () => {
  const scheduler = createScheduler();
  const frames = [];
  const controller = createApertureController({
    durations: [10, 10],
    onFrame: (index) => frames.push(index),
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    now: scheduler.now
  });

  controller.start();
  scheduler.advance(4);
  controller.pause();
  scheduler.advance(20);
  controller.resume();
  scheduler.advance(5);
  assert.deepEqual(frames, [0]);
  scheduler.advance(1);

  assert.deepEqual(frames, [0, 1]);
  assert.equal(controller.state().status, 'playing');
});
