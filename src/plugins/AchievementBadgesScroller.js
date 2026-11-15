/** Smooth Magic Remote wheel input without a timer or listener per control. */
export default class AchievementBadgesScroller {
    constructor(win) {
        this.win = win;
        this._targets = new Map();
        this._frame = null;
        this._lastTime = null;
        this._onWheel = this._onWheel.bind(this);
        this._tick = this._tick.bind(this);
        win.document.addEventListener('wheel', this._onWheel, { passive: false });
    }

    reducedMotion() {
        return (
            this.win.localStorage.getItem('ab-reduced-motion') === 'true' ||
            !!(this.win.matchMedia && this.win.matchMedia('(prefers-reduced-motion: reduce)').matches)
        );
    }

    _onWheel(event) {
        if (event.defaultPrevented || event.ctrlKey) return;
        const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
        const property = horizontal ? 'scrollLeft' : 'scrollTop';
        const size = horizontal ? 'clientWidth' : 'clientHeight';
        const extent = horizontal ? 'scrollWidth' : 'scrollHeight';
        const overflow = horizontal ? 'overflowX' : 'overflowY';
        const raw = horizontal && event.deltaX ? event.deltaX : event.deltaY;
        const delta = raw * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? this.win.innerHeight : 1);
        if (!delta) return;
        let element = event.target.nodeType === 1 ? event.target : event.target.parentElement;
        while (element) {
            const max = element[extent] - element[size];
            if (max > 0 && /auto|scroll/.test(this.win.getComputedStyle(element)[overflow])) {
                const current = this._targets.get(element);
                const continuing =
                    current &&
                    current.property === property &&
                    Math.sign(delta) === Math.sign(current.target - element[property]);
                const start = continuing ? current.target : element[property];
                const target = Math.max(0, Math.min(max, start + delta));
                if (target !== start) {
                    event.preventDefault();
                    if (this.reducedMotion()) {
                        this.cancel();
                        element[property] = target;
                        return;
                    }
                    const behavior = current ? current.behavior : element.style.scrollBehavior;
                    element.style.scrollBehavior = 'auto';
                    this._targets.set(element, { property, target, behavior });
                    if (this._frame === null) this._frame = this.win.requestAnimationFrame(this._tick);
                    return;
                }
                if (continuing && current.target !== element[property]) {
                    event.preventDefault();
                    return;
                }
            }
            element = element.parentElement;
        }
    }

    _tick(time) {
        const elapsed = this._lastTime === null ? 16 : Math.min(64, time - this._lastTime);
        this._lastTime = time;
        this._frame = null;
        // Time-based easing keeps the motion consistent at 30 and 60 fps.
        const amount = 1 - Math.exp(-elapsed / 65);
        this._targets.forEach((state, element) => {
            const remaining = state.target - element[state.property];
            if (Math.abs(remaining) < 1) {
                element[state.property] = state.target;
                element.style.scrollBehavior = state.behavior;
                this._targets.delete(element);
            } else {
                // Integer scroll positions on TV engines must still advance
                // near the end of an animation instead of rounding to zero.
                const step = Math.sign(remaining) * Math.max(1, Math.abs(remaining * amount));
                element[state.property] += step;
            }
        });
        if (this._targets.size) this._frame = this.win.requestAnimationFrame(this._tick);
        else this._lastTime = null;
    }

    /** Cancel wheel momentum before directional focus navigation or teardown. */
    cancel() {
        if (this._frame !== null) this.win.cancelAnimationFrame(this._frame);
        this._frame = null;
        this._lastTime = null;
        this._targets.forEach((state, element) => {
            element.style.scrollBehavior = state.behavior;
        });
        this._targets.clear();
    }

    destroy() {
        this.cancel();
        this.win.document.removeEventListener('wheel', this._onWheel);
    }
}
