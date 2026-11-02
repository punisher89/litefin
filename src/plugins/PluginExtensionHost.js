/**
 * ============================================================================
 * Litefin - Plugin Extension Host
 * ============================================================================
 * Renders trusted, bundled plugin UI in stable Litefin-owned page slots.
 * This is a native adapter API, not a loader for Jellyfin Web scripts.
 * ============================================================================
 */

import { logger } from '../utils/Logger.js';

const log = logger.create('PluginExtensionHost');

export const PLUGIN_EXTENSION_SLOTS = Object.freeze({
    'home:featured': { page: 'home', selector: '#home-hero-placeholder', position: 'after' },
    'home:widgets': { page: 'home', selector: '#home-rows', position: 'before' },
    'details:hero': { page: 'details', selector: '.details-info-col', position: 'append' },
    'details:content': { page: 'details', selector: '.details-content', position: 'append' },
    'person:profile': { page: 'person', selector: '#person-info-col', position: 'append' },
    'person:content': { page: 'person', selector: '#person-works', position: 'before' }
});

const VALID_EXTENSION_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

class PluginExtensionHost {
    constructor() {
        this._extensions = new Map();
        this._mounted = new Map();
        this._pending = new Set();
        this._activePage = null;
    }

    register(pluginId, slot, extension, api) {
        if (!PLUGIN_EXTENSION_SLOTS[slot]) {
            log.warn('Rejected unsupported extension slot:', slot);
            return null;
        }
        if (!pluginId || !extension || !VALID_EXTENSION_ID.test(extension.id || '') ||
            typeof extension.render !== 'function') {
            log.warn('Rejected invalid extension descriptor for plugin:', pluginId);
            return null;
        }

        const key = pluginId + ':' + slot + ':' + extension.id;
        if (this._extensions.has(key)) {
            log.warn('Duplicate extension registration ignored:', key);
            return null;
        }

        const entry = { key, pluginId, slot, extension, api };
        this._extensions.set(key, entry);
        this._mountEntry(entry);

        return () => {
            if (!this._extensions.has(key)) return;
            this._unmountEntry(key);
            this._extensions.delete(key);
        };
    }

    getExtensions(slot) {
        return Array.from(this._extensions.values())
            .filter((entry) => !slot || entry.slot === slot)
            .sort((a, b) => {
                const diff = (Number(a.extension.order) || 0) - (Number(b.extension.order) || 0);
                return diff || a.key.localeCompare(b.key);
            })
            .map((entry) => ({
                id: entry.extension.id,
                pluginId: entry.pluginId,
                slot: entry.slot,
                name: entry.extension.name || entry.extension.id,
                order: Number(entry.extension.order) || 0
            }));
    }

    mountPage(pageId, pageEl, page) {
        if (!pageEl) return;
        if (this._activePage && this._activePage.pageEl !== pageEl) {
            this.unmountPage(this._activePage.pageEl);
        }
        this._activePage = { pageId, pageEl, page };
        for (const entry of this._extensions.values()) this._mountEntry(entry);
    }

    unmountPage(pageEl) {
        if (!this._activePage) return;
        if (pageEl && this._activePage.pageEl !== pageEl) return;

        const activeEl = this._activePage.pageEl;
        for (const [key, mounted] of Array.from(this._mounted.entries())) {
            if (mounted.pageEl === activeEl) this._unmountEntry(key);
        }
        this._pending.clear();
        this._activePage = null;
    }

    _mountEntry(entry) {
        const active = this._activePage;
        const slotConfig = PLUGIN_EXTENSION_SLOTS[entry.slot];
        if (!active || !slotConfig || slotConfig.page !== active.pageId) return;
        if (this._mounted.get(entry.key)?.pageEl === active.pageEl || this._pending.has(entry.key)) return;

        const mount = () => {
            this._pending.delete(entry.key);
            if (this._activePage !== active) return;

            const pageRoot = active.pageEl.matches?.('.page')
                ? active.pageEl
                : active.pageEl.querySelector?.('.page') || active.pageEl;
            if (!pageRoot || pageRoot.isConnected === false) return;

            const target = pageRoot.querySelector(slotConfig.selector);
            if (!target) {
                log.debug('Extension slot target not found:', entry.slot);
                return;
            }

            let content;
            try {
                content = entry.extension.render(
                    { pageId: active.pageId, page: active.page, root: pageRoot, target },
                    entry.api
                );
            } catch (err) {
                log.error('Extension render failed:', entry.key, err);
                return;
            }

            if (!content || content.nodeType !== 1) {
                if (content !== null && content !== undefined) {
                    log.warn('Extension render() must return an HTMLElement or null:', entry.key);
                }
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'litefin-plugin-extension plugin-extension-' +
                entry.slot.replace(/[^a-z0-9_-]/gi, '-');
            wrapper.dataset.pluginId = entry.pluginId;
            wrapper.dataset.pluginExtension = entry.extension.id;
            wrapper.appendChild(content);

            if (slotConfig.position === 'before' && target.parentNode) {
                target.parentNode.insertBefore(wrapper, target);
            } else if (slotConfig.position === 'after' && target.parentNode) {
                target.parentNode.insertBefore(wrapper, target.nextSibling);
            } else if (slotConfig.position === 'prepend') {
                target.insertBefore(wrapper, target.firstChild);
            } else {
                target.appendChild(wrapper);
            }

            const focusSectionName = entry.extension.focusOptions
                ? 'extension:' + entry.slot + ':' + entry.extension.id
                : null;
            if (focusSectionName) {
                entry.api.addFocusSection(focusSectionName, wrapper, entry.extension.focusOptions);
            }

            let cleanup = null;
            if (typeof entry.extension.onMount === 'function') {
                try {
                    const result = entry.extension.onMount(
                        wrapper,
                        { pageId: active.pageId, page: active.page, root: pageRoot, target },
                        entry.api
                    );
                    if (typeof result === 'function') cleanup = result;
                } catch (err) {
                    log.error('Extension onMount failed:', entry.key, err);
                }
            }

            this._mounted.set(entry.key, {
                pageEl: active.pageEl,
                wrapper,
                cleanup,
                focusSectionName,
                api: entry.api,
                extension: entry.extension,
                context: { pageId: active.pageId, page: active.page, root: pageRoot, target }
            });
        };

        const ready = active.page && active.page.ready;
        if (entry.extension.deferUntilReady === true && ready && typeof ready.then === 'function') {
            this._pending.add(entry.key);
            ready.then(mount).catch((err) => {
                this._pending.delete(entry.key);
                log.warn('Page readiness wait failed for extension:', entry.key, err);
            });
        } else {
            mount();
        }
    }

    _unmountEntry(key) {
        const mounted = this._mounted.get(key);
        if (!mounted) return;
        this._mounted.delete(key);

        if (typeof mounted.cleanup === 'function') {
            try { mounted.cleanup(); } catch (err) { log.warn('Extension cleanup failed:', key, err); }
        }
        if (typeof mounted.extension.onUnmount === 'function') {
            try {
                mounted.extension.onUnmount(mounted.wrapper, mounted.context, mounted.api);
            } catch (err) {
                log.warn('Extension onUnmount failed:', key, err);
            }
        }
        if (mounted.focusSectionName) {
            mounted.api.removeFocusSection(mounted.focusSectionName);
        }
        if (mounted.wrapper.parentNode) mounted.wrapper.parentNode.removeChild(mounted.wrapper);
    }

    destroy() {
        for (const key of Array.from(this._mounted.keys())) this._unmountEntry(key);
        this._extensions.clear();
        this._pending.clear();
        this._activePage = null;
    }
}

export default PluginExtensionHost;
