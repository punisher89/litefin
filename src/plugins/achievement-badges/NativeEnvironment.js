import revampStyles from './vendor/RevampStyles.js';
import { achievementLegacyCss } from '../AchievementBadgesCompat.js';
import { i18n } from '../../utils/i18n.js';
import english from './translations/en.json';
import russian from './translations/ru.json';

/** Owns the bundled renderer's DOM, storage, observers and scheduling. No frame/global bootstrap. */
export default class NativeEnvironment {
    constructor(root, options) {
        this.root = root;
        this.options = options;
        this._timers = new Set();
        this._intervals = new Set();
        this._frames = new Set();
        this._observers = new Set();
        this._listeners = [];
        this._audio = [];
        this._audioContexts = [];
        this._objectUrls = new Set();
        this._dead = false;
        this.assets = document.createElement('div');
        this.assets.className = 'achievement-native-assets';
        root.appendChild(this.assets);
        const scopedStorage = {
            getItem: (key) => options.storage.getItem(options.storagePrefix + key),
            setItem: (key, value) => options.storage.setItem(options.storagePrefix + key, value),
            removeItem: (key) => options.storage.removeItem(options.storagePrefix + key)
        };
        const listen = (target, type, callback, config) => {
            target.addEventListener(type, callback, config);
            this._listeners.push(() => target.removeEventListener(type, callback, config));
        };
        const doc = {
            body: root,
            head: this.assets,
            documentElement: root,
            readyState: 'complete',
            currentScript: { src: options.serverUrl + '/Plugins/AchievementBadges/client-script/standalone' },
            get visibilityState() {
                return document.visibilityState;
            },
            title: options.title,
            getElementById: (id) => root.querySelector('[id="' + String(id).replace(/["\\]/g, '') + '"]'),
            querySelector: (selector) => root.querySelector(selector),
            querySelectorAll: (selector) => root.querySelectorAll(selector),
            getElementsByTagName: (name) => root.getElementsByTagName(name),
            createElement: (name) => {
                // Revamp is bundled with Litefin and has no external font/script dependency.
                const element = document.createElement(name === 'link' ? 'style' : name);
                if (name === 'link') element.textContent = achievementLegacyCss(revampStyles);
                return element;
            },
            addEventListener: (type, callback, config) =>
                listen(type === 'visibilitychange' ? document : root, type, callback, config),
            dispatchEvent: (event) => root.dispatchEvent(event)
        };
        let currentHash = '#/achievements';
        const location = {
            get hash() {
                return currentHash;
            },
            set hash(value) {
                currentHash = value;
                options.navigate(value);
            }
        };
        const events = document.createElement('div');
        const win = {
            document: doc,
            ApiClient: options.apiClient,
            localStorage: scopedStorage,
            location,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            matchMedia: window.matchMedia.bind(window),
            AudioContext: window.AudioContext
                ? function (...args) {
                      const context = new window.AudioContext(...args);
                      owner._audioContexts.push(context);
                      return context;
                  }
                : undefined,
            webkitAudioContext: window.webkitAudioContext
                ? function (...args) {
                      const context = new window.webkitAudioContext(...args);
                      owner._audioContexts.push(context);
                      return context;
                  }
                : undefined,
            addEventListener: (type, callback, config) => listen(events, type, callback, config),
            dispatchEvent: (event) => events.dispatchEvent(event)
        };
        const owner = this;
        const scopedURL = function (url, base) {
            return new window.URL(url, base);
        };
        scopedURL.createObjectURL = (blob) => {
            if (this._dead) return '';
            const url = window.URL.createObjectURL(blob);
            this._objectUrls.add(url);
            return url;
        };
        scopedURL.revokeObjectURL = (url) => {
            window.URL.revokeObjectURL(url);
            this._objectUrls.delete(url);
        };
        this.scope = {
            window: win,
            document: doc,
            localStorage: scopedStorage,
            sessionStorage: scopedStorage,
            language: i18n.currentLang,
            translations: { ...english, ...(String(i18n.currentLang).split('-')[0] === 'ru' ? russian : {}) },
            // Keep the backend's custom translations; a missing bundle must never expose raw keys.
            fetch: async (url, init) => {
                const match = String(url).match(/\/AchievementBadges\/translations\/([a-z-]+)/i);
                if (!match) return options.fetch(url, init);
                let remote = {};
                try {
                    const response = await options.fetch(url, init);
                    if (response.ok) remote = await response.json();
                } catch (error) {
                    if (this._dead) throw error;
                }
                const local = match[1].split('-')[0] === 'ru' ? russian : {};
                // Some plugin versions return the English bundle for an unknown language.
                // Do not let that fallback erase our bundled Russian strings.
                remote = Object.fromEntries(
                    Object.entries(remote || {}).filter(([key, value]) => !local[key] || value !== english[key])
                );
                return new Response(JSON.stringify({ ...english, ...local, ...remote }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            },
            log: options.log,
            URL: scopedURL,
            setTimeout: (callback, delay, ...args) => {
                const id = window.setTimeout(() => {
                    this._timers.delete(id);
                    if (!this._dead) callback(...args);
                }, delay);
                this._timers.add(id);
                return id;
            },
            clearTimeout: (id) => {
                window.clearTimeout(id);
                this._timers.delete(id);
            },
            setInterval: (callback, delay, ...args) => {
                const id = window.setInterval(() => {
                    if (!this._dead) callback(...args);
                }, delay);
                this._intervals.add(id);
                return id;
            },
            clearInterval: (id) => {
                window.clearInterval(id);
                this._intervals.delete(id);
            },
            requestAnimationFrame: (callback) => {
                const id = window.requestAnimationFrame((time) => {
                    this._frames.delete(id);
                    if (!this._dead) callback(time);
                });
                this._frames.add(id);
                return id;
            },
            cancelAnimationFrame: (id) => {
                window.cancelAnimationFrame(id);
                this._frames.delete(id);
            },
            MutationObserver: class extends MutationObserver {
                constructor(callback) {
                    super((...args) => {
                        if (!owner._dead) callback(...args);
                    });
                    owner._observers.add(this);
                }
            },
            Audio: function (...args) {
                const audio = new window.Audio(...args);
                owner._audio.push(audio);
                return audio;
            },
            // Browser push prompts are not useful in the TV client; in-app notifications remain available.
            Notification: undefined
        };
        this.window = win;
    }

    destroy() {
        this._dead = true;
        this._timers.forEach((id) => window.clearTimeout(id));
        this._intervals.forEach((id) => window.clearInterval(id));
        this._frames.forEach((id) => window.cancelAnimationFrame(id));
        this._observers.forEach((observer) => observer.disconnect());
        this._listeners.forEach((remove) => remove());
        this._audio.forEach((audio) => {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        });
        this._audioContexts.forEach((context) => {
            try {
                context.close().catch(() => {});
            } catch {}
        });
        this._objectUrls.forEach((url) => window.URL.revokeObjectURL(url));
        this._objectUrls.clear();
        this.root.innerHTML = '';
    }
}
