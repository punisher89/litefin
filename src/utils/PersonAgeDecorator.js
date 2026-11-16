import { api } from '../api/index.js';
import { seerr } from '../api/seerrClient.js';
import { i18n } from './i18n.js';
import { personAgeFacts } from './PersonAge.js';

const CACHE = new Map();
const TTL = 12 * 60 * 60 * 1000;
const enhancedUnavailable = new Set();

/** Fetch only mounted/near-visible cast cards, batching Enhanced requests. */
export default class PersonAgeDecorator {
    constructor(container, getItem) {
        this.container = container;
        this.getItem = getItem;
        this._session = `${api.serverUrl}|${api.userId}`;
        this._queue = new Set();
        this._seen = new WeakSet();
        this._active = true;
        this._io =
            typeof IntersectionObserver === 'function'
                ? new IntersectionObserver(
                      (entries) => {
                          entries.forEach((entry) => {
                              if (entry.isIntersecting) {
                                  this._io.unobserve(entry.target);
                                  this._enqueue(entry.target);
                              }
                          });
                      },
                      { root: container, rootMargin: '500px' }
                  )
                : null;
        this._observer = new MutationObserver(() => this._scan());
        this._observer.observe(container, { childList: true, subtree: true });
        this._scan();
    }

    _scan() {
        this.container.querySelectorAll('[data-person-id]').forEach((card) => {
            if (this._seen.has(card)) return;
            this._seen.add(card);
            if (this._io) this._io.observe(card);
            else this._enqueue(card);
        });
    }

    _enqueue(card) {
        this._queue.add(card);
        if (!this._running) {
            this._running = true;
            Promise.resolve().then(() => this._drain());
        }
    }

    async _drain() {
        while (this._active && this._queue.size) {
            const cards = Array.from(this._queue).slice(0, 16);
            cards.forEach((card) => this._queue.delete(card));
            const ids = cards
                .map((card) => card.dataset.personId)
                .filter((id) => /^[a-f0-9-]{32,36}$/i.test(id) && !CACHE.has(`${this._session}|${id}`));
            if (ids.length && !enhancedUnavailable.has(this._session)) {
                try {
                    const result = await api.get(
                        '/JellyfinEnhanced/people/info',
                        { ids: Array.from(new Set(ids)).join(',') },
                        { suppressUnauthorized: true }
                    );
                    if (result?.people) {
                        ids.forEach((id) => {
                            const facts = result.people[id] || result.people[id.replace(/-/g, '').toLowerCase()];
                            if (facts) CACHE.set(`${this._session}|${id}`, { data: facts, time: Date.now() });
                        });
                    }
                } catch {
                    enhancedUnavailable.add(this._session);
                }
            }
            // Four concurrent fallbacks keep TV/network load bounded.
            let index = 0;
            await Promise.all(
                Array.from({ length: Math.min(4, cards.length) }, async () => {
                    while (this._active && index < cards.length) {
                        const card = cards[index++];
                        const facts = await this._facts(card.dataset.personId);
                        if (
                            !this._active ||
                            `${api.serverUrl}|${api.userId}` !== this._session ||
                            !this.container.contains(card)
                        )
                            continue;
                        this._render(card, facts);
                    }
                })
            );
        }
        this._running = false;
    }

    async _facts(id) {
        const key = `${this._session}|${id}`;
        const cached = CACHE.get(key);
        if (cached && Date.now() - cached.time < TTL) return cached.data;
        try {
            const tmdb = /^tmdb-person-(\d+)$/.exec(id);
            const data = tmdb
                ? await seerr.personFacts(tmdb[1])
                : await api.getItem(id, {}, { suppressUnauthorized: true });
            if (CACHE.size >= 500) CACHE.delete(CACHE.keys().next().value);
            CACHE.set(key, { data, time: Date.now() });
            return data;
        } catch {
            return null;
        }
    }

    _render(card, person) {
        if (!person) return;
        const facts = personAgeFacts(person, this.getItem());
        const badges = document.createElement('div');
        badges.className = 'person-age-badges';
        const add = (text) => {
            const badge = document.createElement('span');
            badge.textContent = text;
            badges.appendChild(badge);
        };
        if (facts.productionAge !== null) add(i18n.t(facts.productionLabel, [facts.productionAge]));
        if (facts.currentAge !== null)
            add(i18n.t(facts.deceased ? 'ActorAgeAtDeath' : 'ActorAgeNow', [facts.currentAge]));
        if (facts.deceased) {
            const cross = document.createElement('span');
            cross.className = 'person-deceased-marker';
            cross.textContent = '†';
            cross.setAttribute('aria-label', i18n.t('ActorDeceased'));
            cross.title = i18n.t('ActorDeceased');
            card.querySelector('.card-image')?.appendChild(cross);
        }
        if (badges.children.length) card.querySelector('.card-image')?.appendChild(badges);
    }

    destroy() {
        this._active = false;
        this._queue.clear();
        this._observer.disconnect();
        this._io?.disconnect();
    }
}
