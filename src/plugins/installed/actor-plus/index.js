/**
 * Native Litefin adaptation of ActorPlus-style actor profile highlights.
 *
 * The ActorPlus Web plugin adds hover UI to Jellyfin Web. Litefin instead
 * renders a D-pad friendly block on its native Person page using data it
 * already fetched for the filmography.
 */
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
            deferUntilReady: true,
            focusOptions: {
                orientation: 'vertical',
                leaveLeft: 'sidebar'
            },
            render: (context) => {
                const page = context && context.page;
                const person = page && page._person;
                if (!person || person.Type !== 'Person') return null;

                const works = Array.isArray(page._items) ? page._items : [];
                const roleMap = page._roleMap instanceof Map ? page._roleMap : new Map();
                const roles = Array.from(new Set(Array.from(roleMap.values()).filter(Boolean))).slice(0, 4);

                const root = document.createElement('section');
                root.className = 'actor-profile-highlights';

                const title = document.createElement('h3');
                title.textContent = 'Известные работы';

                const summary = document.createElement('p');
                summary.textContent = 'В фильмографии: ' + works.length + ' проектов';

                root.appendChild(title);
                root.appendChild(summary);

                if (roles.length) {
                    const roleLine = document.createElement('p');
                    roleLine.textContent = 'Персонажи: ' + roles.join(', ');
                    root.appendChild(roleLine);
                }

                const samples = works.slice(0, 3);
                if (samples.length) {
                    const list = document.createElement('div');
                    list.className = 'actor-profile-highlights__works';
                    samples.forEach((work) => {
                        const label = document.createElement('span');
                        label.textContent = String(work.Name || work.name || '');
                        if (label.textContent) list.appendChild(label);
                    });
                    root.appendChild(list);
                }

                return root;
            }
        });
    }
};
