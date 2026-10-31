export default {
    id: 'startrack',
    name: 'StarTrack',
    version: '1.0.0',
    description: 'Native ratings, watchlist, diary and recommendations.',
    serverDependency: 'startrack',
    defaultEnabled: true,
    init(api) {
        api.log.info('StarTrack server integration is available.');
        api.emit('startrack:availability', true);
    },
    destroy(api) {
        api.emit('startrack:availability', false);
    }
};
