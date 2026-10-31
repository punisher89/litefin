export default {
    id: 'startrack',
    name: 'StarTrack',
    version: '1.0.0',
    description: 'Native ratings, watchlist, diary and recommendations.',
    serverDependency: 'startrack',
    defaultEnabled: true,
    init(api) {
        api.log.info('StarTrack server integration is available.');
    },
    destroy(api) {
        api.log.info('StarTrack server integration disabled.');
    }
};
