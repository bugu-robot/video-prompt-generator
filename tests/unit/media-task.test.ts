import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {waitForMediaTask} from '../../src/media/media-task';

describe('cancelable native media task boundary', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not open decoding work in the current event or its microtasks', async () => {
    let ready = false;
    const task = waitForMediaTask(new AbortController().signal).then(() => {ready = true;});
    await Promise.resolve();
    expect(ready).toBe(false);
    await vi.runAllTimersAsync();
    await task;
    expect(ready).toBe(true);
  });
  it('an already cancelled selection never schedules work', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(waitForMediaTask(controller.signal)).rejects.toThrow('已取消');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('replacement cancels the queued task and clears its timer', async () => {
    const controller = new AbortController();
    const task = waitForMediaTask(controller.signal);
    const rejected = expect(task).rejects.toThrow('已取消');
    controller.abort(); await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clear/pagehide can cancel work after microtasks but before decoding', async () => {
    const controller = new AbortController();
    const task = waitForMediaTask(controller.signal);
    const rejected = expect(task).rejects.toThrow('已取消');
    await Promise.resolve(); controller.abort(); await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('completed work removes its cancellation listener', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const task = waitForMediaTask(controller.signal);
    await vi.runAllTimersAsync(); await task;
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    controller.abort(); expect(vi.getTimerCount()).toBe(0);
  });
  it('cancelled work removes its cancellation listener', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const task = waitForMediaTask(controller.signal);
    const rejected = expect(task).rejects.toThrow('已取消');
    controller.abort(); await rejected;
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
