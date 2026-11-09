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

    // The plugin owns its own interface and catalog translations.
    getTranslations(language = 'en') {
        const lang = String(language || 'en').toLowerCase().split(/[-_]/)[0].replace(/[^a-z]/g, '') || 'en';
        return api.get(ROOT + '/translations/' + encodeURIComponent(lang));
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

    getPublicConfig() {
        return api.get(ROOT + '/public-config');
    }

    // Server-authoritative social, personal statistics, showcase and settings.
    savePreferences(preferences) {
        return api.post(this.userRoot + '/preferences', preferences);
    }

    getUiFeatures() {
        return api.get(ROOT + '/admin/ui-features');
    }

    checkMilestones() {
        return api.get(this.userRoot + '/check-milestones');
    }

    getActivityFeed(page = 1, pageSize = 20) {
        return api.get(ROOT + '/activity-feed', { page, pageSize });
    }

    getRecentUnlocks(limit = 12) {
        return api.get(this.userRoot + '/recent-unlocks-v2', { limit });
    }

    getNextBadges(limit = 6) {
        return api.get(this.userRoot + '/next-badges', { limit });
    }

    getCategoryProgress() {
        return api.get(this.userRoot + '/category-progress');
    }

    getRecords() {
        return api.get(this.userRoot + '/records');
    }

    getStreakCalendar(weeks = 26) {
        return api.get(this.userRoot + '/streak-calendar', { weeks });
    }

    getWatchCalendar(days = 90) {
        return api.get(this.userRoot + '/watch-calendar', { days });
    }

    getRecap(period = 'week') {
        return api.get(this.userRoot + '/recap', { period });
    }

    getWrapped(year) {
        return api.get(this.userRoot + '/wrapped', year ? { year } : null);
    }

    getBadgeEta(limit = 12) {
        return api.get(this.userRoot + '/badge-eta', { limit });
    }

    getPersonalRecommendations(limit = 10) {
        return api.get(this.userRoot + '/recommendations', { limit });
    }

    getWatchClock() {
        return api.get(this.userRoot + '/watch-clock');
    }

    getShowcase() {
        return this.getEquipped();
    }

    getCompareHistory() {
        return api.get(this.userRoot + '/compare-history');
    }

    getPrestigeLeaderboard(limit = 10) {
        return api.get(ROOT + '/leaderboard-prestige', { limit });
    }

    prestige() {
        return api.post(this.userRoot + '/prestige');
    }

    pinBadge(id, pinned = true) {
        return api.post(this.userRoot + '/pin/' + encodeURIComponent(id), { Pinned: pinned });
    }

    getPublicProfile(userId) {
        return api.get(ROOT + '/profiles/' + encodeURIComponent(userId) + '/summary');
    }

    compareUsers(otherUserId) {
        return api.get(ROOT + '/compare/' + encodeURIComponent(this.userId) + '/' + encodeURIComponent(otherUserId));
    }

    getGroup(conversationId) {
        return api.get(this.userRoot + '/conversations/' + encodeURIComponent(conversationId));
    }

    createGroup(name, memberIds = []) {
        return api.post(this.userRoot + '/conversations', { Name: name, MemberIds: memberIds });
    }

    renameGroup(id, name) {
        return api.post(this.userRoot + '/conversations/' + encodeURIComponent(id) + '/rename', { Name: name });
    }

    addGroupMember(id, memberId) {
        return api.post(this.userRoot + '/conversations/' + encodeURIComponent(id) + '/members/' + encodeURIComponent(memberId));
    }

    removeGroupMember(id, memberId) {
        return api.delete(this.userRoot + '/conversations/' + encodeURIComponent(id) + '/members/' + encodeURIComponent(memberId));
    }

    deleteMessage(id) {
        return api.delete(this.userRoot + '/messages/by-id/' + encodeURIComponent(id));
    }

    clearConversation(id) {
        return api.delete(this.userRoot + '/conversations/' + encodeURIComponent(id) + '/clear');
    }

    blockUser(id) {
        return api.post(this.userRoot + '/block/' + encodeURIComponent(id));
    }

    unblockUser(id) {
        return api.delete(this.userRoot + '/block/' + encodeURIComponent(id));
    }

    getBlockedUsers() {
        return api.get(this.userRoot + '/blocked');
    }

    getProfileExport() {
        return api.get(this.userRoot + '/export');
    }

    getUnlocksSince(since, deviceId) {
        const params = { since };
        if (deviceId) params.deviceId = deviceId;
        return api.get(this.userRoot + '/unlocks-since', params);
    }

}

export const achievementBadges = new AchievementBadgesClient();
