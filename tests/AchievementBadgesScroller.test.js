import assert from 'node:assert/strict';
import test from 'node:test';
import AchievementBadgesScroller from '../src/plugins/AchievementBadgesScroller.js';

function setup(reduced = false) {
    const frames = new Map();
    const listeners = new Map();
    let id = 0;
    const win = {
        document: {
            addEventListener: (name, callback) => listeners.set(name, callback),
            removeEventListener: (name) => listeners.delete(name)
        },
        localStorage: { getItem: () => (reduced ? 'true' : null) },
        innerHeight: 1000,
        getComputedStyle: () => ({ overflowY: 'auto', overflowX: 'auto' }),
        requestAnimationFrame: (callback) => {
            frames.set(++id, callback);
            return id;
        },
        cancelAnimationFrame: (frame) => frames.delete(frame)
    };
    const element = {
        nodeType: 1,
        parentElement: null,
        scrollTop: 0,
        scrollLeft: 0,
        scrollHeight: 2000,
        clientHeight: 500,
        scrollWidth: 1200,
        clientWidth: 500,
        style: { scrollBehavior: 'smooth' }
    };
    const scroller = new AchievementBadgesScroller(win);
    const wheel = (deltaY, extra = {}) => {
        const event = {
            target: element,
            deltaY,
            deltaX: 0,
            deltaMode: 0,
            preventDefault() {
                this.defaultPrevented = true;
            },
            ...extra
        };
        listeners.get('wheel')(event);
        return event;
    };
    const tick = (time) => {
        const callbacks = Array.from(frames.values());
        frames.clear();
        callbacks.forEach((callback) => callback(time));
    };
    return { scroller, element, wheel, tick, frames, listeners };
}

test('Magic Remote line ticks animate and accumulate without jumping immediately', () => {
    const { scroller, element, wheel, tick, frames } = setup();
    assert.equal(wheel(3, { deltaMode: 1 }).defaultPrevented, true);
    assert.equal(element.scrollTop, 0);
    tick(0);
    assert.ok(element.scrollTop > 0 && element.scrollTop < 96);
    wheel(3, { deltaMode: 1 });
    for (let time = 16; frames.size && time < 2000; time += 16) tick(time);
    assert.equal(element.scrollTop, 192);
    assert.equal(element.style.scrollBehavior, 'smooth');
    assert.equal(frames.size, 0);
    scroller.destroy();
});

test('reversing the wheel reverses the movement on the next frame', () => {
    const { scroller, element, wheel, tick } = setup();
    wheel(500);
    tick(0);
    const before = element.scrollTop;
    wheel(-60);
    tick(16);
    assert.ok(element.scrollTop < before);
    scroller.destroy();
});

test('reduced motion scrolls directly without scheduling animation', () => {
    const { scroller, element, wheel, frames } = setup(true);
    wheel(3, { deltaMode: 1 });
    assert.equal(element.scrollTop, 96);
    assert.equal(frames.size, 0);
    scroller.destroy();
});

test('Shift-wheel scrolls carousels horizontally, preserving the vertical position', () => {
    const { scroller, element, wheel, tick, frames } = setup();
    wheel(100, { shiftKey: true });
    for (let time = 0; frames.size && time < 2000; time += 16) tick(time);
    assert.equal(element.scrollLeft, 100);
    assert.equal(element.scrollTop, 0);
    scroller.destroy();
});

test('leaving the page cancels momentum, restores native scrolling and removes the wheel listener', () => {
    const { scroller, element, wheel, frames, listeners } = setup();
    wheel(500);
    assert.equal(element.style.scrollBehavior, 'auto');
    scroller.destroy();
    assert.equal(frames.size, 0);
    assert.equal(listeners.size, 0);
    assert.equal(element.style.scrollBehavior, 'smooth');
});
