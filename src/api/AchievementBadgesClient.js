/**
 * AchievementBadges Jellyfin server plugin client.
 * All requests use Litefin's authenticated API transport (never URL tokens).
 */
import { api } from './ApiClient.js';

const ROOT = '/Plugins/AchievementBadges';

class AchievementBadgesClient {
    get userId() {
        return api.userId;
    }

    get userRoot() {
        if (!this.userId) throw new Error('No authenticated Jellyfin user');
        return ROOT + '/users/' + encodeURIComponent(this.userId);
    }

    async isAvailable() {
        if (!api.serverUrl || !this.userId || api.isEmby()) return false;
        try {
            await api.get(ROOT + '/test');
            return true;
        } catch (_) {
            return false;
        }
    }

    getSummary() {
        return api.get(this.userRoot + '/summary');
    }

    getRank() {
        return api.get(this.userRoot + '/rank');
    }

    getBadges(lang = 'en') {
        return api.get(this.userRoot, { lang });
    }

    getEquipped(lang = 'en') {
        return api.get(this.userRoot + '/equipped', { lang });
    }

    getQuests() {
        return api.get(this.userRoot + '/quests');
    }

    getBank() {
        return api.get(this.userRoot + '/bank');
    }

    getLeaderboard(limit = 10) {
        return api.get(ROOT + '/leaderboard', { limit });
    }

    equip(badgeId) {
        return api.post(this.userRoot + '/equipped/' + encodeURIComponent(badgeId));
    }

    unequip(badgeId) {
        return api.delete(this.userRoot + '/equipped/' + encodeURIComponent(badgeId));
    }
}

export const achievementBadges = new AchievementBadgesClient();
