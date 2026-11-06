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
    // Score Shop: catalog, purchases, and personal cosmetics.
    getShopCatalog() {
        return api.get(ROOT + '/shop/catalog');
    }

    getCosmetics() {
        return api.get(this.userRoot + '/cosmetics');
    }

    buyShopItem(itemId) {
        return api.post(this.userRoot + '/shop/purchase', { ItemId: itemId });
    }

    equipCosmetic(cosmeticId) {
        return api.post(this.userRoot + '/cosmetics/equip', { CosmeticId: cosmeticId });
    }

    unequipCosmetic(kind) {
        return api.post(this.userRoot + '/cosmetics/unequip?kind=' + encodeURIComponent(kind));
    }

    getPowerUps() {
        return api.get(this.userRoot + '/powerups');
    }

    usePowerUp(type) {
        return api.post(this.userRoot + '/powerups/use/' + encodeURIComponent(type));
    }

    rerollQuest(period) {
        if (period !== 'daily' && period !== 'weekly') throw new Error('Invalid quest period');
        return api.post(this.userRoot + '/quests/' + period + '/reroll');
    }

    // Friends and private conversations are scoped to the signed-in Jellyfin user.
    getFriends() {
        return api.get(this.userRoot + '/friends');
    }

    getDirectory() {
        return api.get(this.userRoot + '/directory');
    }

    inviteFriend(id) {
        return api.post(this.userRoot + '/friends/' + encodeURIComponent(id));
    }

    acceptFriend(id) {
        return api.post(this.userRoot + '/friends/' + encodeURIComponent(id) + '/accept');
    }

    removeFriend(id) {
        return api.delete(this.userRoot + '/friends/' + encodeURIComponent(id));
    }

    getMessageThreads() {
        return api.get(this.userRoot + '/messages/threads');
    }

    getMessages(otherUserId, limit = 100) {
        return api.get(this.userRoot + '/messages/' + encodeURIComponent(otherUserId), { limit });
    }

    getConversationMessages(conversationId, limit = 100) {
        return api.get(this.userRoot + '/conversations/' + encodeURIComponent(conversationId) + '/messages', { limit });
    }

    sendMessage(otherUserId, text) {
        return api.post(this.userRoot + '/messages/' + encodeURIComponent(otherUserId), { Text: text });
    }

    sendConversationMessage(conversationId, text) {
        return api.post(this.userRoot + '/conversations/' + encodeURIComponent(conversationId) + '/messages', { Text: text });
    }

    getUnreadCount() {
        return api.get(this.userRoot + '/messages/unread-count');
    }

    getPreferences() {
        return api.get(this.userRoot + '/preferences');
    }

    getUnlocksSince(since, deviceId) {
        const params = { since };
        if (deviceId) params.deviceId = deviceId;
        return api.get(this.userRoot + '/unlocks-since', params);
    }

}

export const achievementBadges = new AchievementBadgesClient();
