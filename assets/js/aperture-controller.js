const STATUS = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  STOPPED: 'stopped'
});

export function createApertureController({ durations, onFrame, onComplete = () => {}, schedule, cancel, now }) {
  if (!Array.isArray(durations) || durations.length === 0 || durations.some((duration) => !Number.isFinite(duration) || duration <= 0)) {
    throw new TypeError('durations must contain positive millisecond values');
  }

  let index = 0;
  let status = STATUS.IDLE;
  let playCount = 0;
  let timer = null;
  let deadline = 0;
  let remaining = durations[0];

  function state() {
    return { index, status, playCount };
  }

  function finishFrame() {
    timer = null;
    if (status !== STATUS.PLAYING) return;
    if (index === durations.length - 1) {
      status = STATUS.COMPLETE;
      onComplete(state());
      return;
    }
    index += 1;
    remaining = durations[index];
    onFrame(index, state());
    arm();
  }

  function arm() {
    deadline = now() + remaining;
    timer = schedule(finishFrame, remaining);
  }

  return Object.freeze({
    start() {
      if (status !== STATUS.IDLE) return;
      status = STATUS.PLAYING;
      playCount = 1;
      remaining = durations[0];
      onFrame(index, state());
      arm();
    },
    pause() {
      if (status !== STATUS.PLAYING) return;
      cancel(timer);
      timer = null;
      remaining = Math.max(0, deadline - now());
      status = STATUS.PAUSED;
    },
    resume() {
      if (status !== STATUS.PAUSED) return;
      status = STATUS.PLAYING;
      arm();
    },
    stop() {
      if (timer !== null) cancel(timer);
      timer = null;
      status = STATUS.STOPPED;
    },
    state
  });
}
