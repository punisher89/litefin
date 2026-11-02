import './actor-plus.css';

/**
 * Native Litefin adaptation of ActorPlus-style actor profile highlights.
 * The original plugin injects hover UI into Jellyfin Web; this adapter adds a
 * D-pad friendly summary to Litefin's own Person page.
 */

function renderPersonSummary(root, page, settings) {
    const person = page && page._person;
    const summary = root.querySelector('.actor-profile-highlights__summary');
    const rolesEl = root.querySelector('.actor-profile-highlights__roles');
    const worksEl = root.querySelector('.actor-profile-highlights__works');
    if (!person || person.Type !== 'Person') {
        if (summary) summary.textContent = 'Загружаем фильмографию…';
        return;
    }

    const works = Array.isArray(page._items) ? page._items : [];
    const roleMap = page._roleMap instanceof Map ? page._roleMap : new Map();
    const showRoles = !settings || settings.get('showRoles') !== 'false';
    const roles = showRoles ? Array.from(new Set(Array.from(roleMap.values()).filter(Boolean))).slice(0, 4) : [];
    const worksCount = Math.max(1, Math.min(10, Number(settings && settings.get('worksCount')) || 3));

    if (summary) summary.textContent = 'В фильмографии: ' + works.length + ' проектов';
    if (rolesEl) {
        rolesEl.textContent = roles.length ? 'Персонажи: ' + roles.join(', ') : '';
        rolesEl.hidden = roles.length === 0;
    }
    if (worksEl) {
        worksEl.textContent = '';
        works.slice(0, worksCount).forEach((work) => {
            const label = document.createElement('span');
            label.textContent = String(work.Name || work.name || '');
            if (label.textContent) worksEl.appendChild(label);
        });
    }
}

export default {
    id: 'actor-plus',
    name: 'Actor profile highlights',
    version: '1.0.0',
    description: 'Добавляет блок известных работ в нативный профиль актёра.',
    defaultEnabled: true,

    init(api) {
        api.addPersonWidget({
            id: 'known-for',
            name: 'Известные работы',
            order: 10,
            render: () => {
                const root = document.createElement('section');
                root.className = 'actor-profile-highlights';

                const title = document.createElement('h3');
                title.textContent = 'Известные работы';

                const summary = document.createElement('p');
                summary.className = 'actor-profile-highlights__summary';
                summary.textContent = 'Загружаем фильмографию…';

                const roles = document.createElement('p');
                roles.className = 'actor-profile-highlights__roles';
                roles.hidden = true;

                const works = document.createElement('div');
                works.className = 'actor-profile-highlights__works';

                root.appendChild(title);
                root.appendChild(summary);
                root.appendChild(roles);
                root.appendChild(works);
                return root;
            },
            onMount: (wrapper, context, extensionApi) => {
                const root = wrapper.querySelector('.actor-profile-highlights');
                const settings = extensionApi.getStorage();
                const update = () => renderPersonSummary(root, context.page, settings);
                update();

                // PersonPage loads its metadata and filmography asynchronously.
                // This event updates the already-mounted widget without polling.
                const unsubscribeLoaded = extensionApi.on('person:loaded', (payload) => {
                    if (payload && payload.page === context.page) update();
                });
                const unsubscribeRoles = extensionApi.on('person:roles-loaded', (payload) => {
                    if (payload && payload.page === context.page) update();
                });
                return () => {
                    unsubscribeLoaded();
                    unsubscribeRoles();
                };
            }
        });
    }
};
