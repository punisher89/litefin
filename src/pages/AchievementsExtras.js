/**
 * AchievementBadges extended TV features: Score Shop, profile customization,
 * power-ups, friends and messaging. No movie-card integrations.
 * All HTML from Jellyfin is escaped and all mutations require explicit OK.
 */
import { achievementBadges as client } from '../api/AchievementBadgesClient.js';
import { toast } from '../ui/Toast.js';
import { focusManager } from '../ui/FocusManager.js';
import { logger } from '../utils/Logger.js';

const log = logger.create('AchievementExtras');
const list = (x) => Array.isArray(x) ? x : [];
const value = (x) => String(x == null ? '' : x);
const html = (x) => value(x).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
const number = (x) => Number(x || 0).toLocaleString();
const field = (obj, name) => obj?.[name] ?? obj?.[name.toLowerCase()];
const COSMETIC_KINDS = ['ProfileTheme', 'BadgeFrame', 'RankTitle', 'Avatar', 'Background', 'ProfileBorder'];
const cosmeticKind = (kind) => typeof kind === 'number' ? (COSMETIC_KINDS[kind] || '') : value(kind);

export class AchievementExtras {
    constructor(page) {
        this.page = page;
        this.tab = '';
        this._generation = 0;
        this._loaded = {};
        this._data = {};
        this._pending = null;
        this._busy = false;
        this._thread = null;
        this._filter = 'all';
        this._modalTrapped = false;
    }

    get ru() {
        return this.page._language === 'ru';
    }

    t(ru, en) {
        return this.ru ? ru : en;
    }

    destroy() {
        this._generation++;
        this._pending = null;
        if (this._modalTrapped) {
            focusManager.popTrap();
            this._modalTrapped = false;
        }
    }

    async open(tab) {
        this.tab = tab;
        const id = ++this._generation;
        this._renderMessage(this.t('Загрузка…', 'Loading…'));
        try {
            if (!this._loaded[tab]) {
                await this._fetch(tab);
                this._loaded[tab] = true;
            }
            if (id !== this._generation || !this.page.el) return;
            this.draw();
        } catch (error) {
            log.warn('Failed to load AchievementBadges section', error);
            if (id === this._generation) this._renderMessage(this.t('Не удалось загрузить раздел', 'Could not load this section'), true);
        }
    }

    async _fetch(tab) {
        if (tab === 'shop' || tab === 'cosmetics') {
            const [catalog, cosmetics, powerups] = await Promise.all([
                client.getShopCatalog(), client.getCosmetics(), client.getPowerUps()
            ]);
            this._data.catalog = catalog || {};
            this._data.cosmetics = cosmetics || {};
            this._data.powerups = powerups || {};
            return;
        }
        if (tab === 'friends') {
            const [friends, directory] = await Promise.all([
                client.getFriends(), client.getDirectory().catch(() => [])
            ]);
            this._data.friends = friends || {};
            this._data.directory = Array.isArray(directory) ? directory : list(directory?.Users || directory?.Items);
            return;
        }
        if (tab === 'messages') {
            const response = await client.getMessageThreads();
            this._data.threads = list(response?.Threads || response?.threads);
            return;
        }
    }

    _renderMessage(message, retry = false) {
        const el = this.page.$('#achievements-tab-content');
        if (!el) return;
        el.innerHTML = '<div class="achievements-message"><p>' + html(message) + '</p>' +
            (retry ? '<button tabindex="0" data-ach-extra="retry">' + html(this.t('Повторить', 'Retry')) + '</button>' : '') + '</div>';
    }

    draw() {
        const target = this.page.$('#achievements-tab-content');
        if (!target) return;
        let markup = '';
        if (this.tab === 'shop') markup = this.renderShop();
        if (this.tab === 'cosmetics') markup = this.renderCosmetics();
        if (this.tab === 'friends') markup = this.renderFriends();
        if (this.tab === 'messages') markup = this.renderMessages();
        target.innerHTML = markup + '<div id="achievement-extra-modal" class="achievement-extra-modal" hidden></div>';
        this.page._registerExtraFocus();
    }

    card(item, action, label, disabled, subtitle, swatch) {
        const id = html(item.Id);
        const preview = swatch && /^#[a-f0-9]{3,8}$/i.test(swatch) ? swatch : '#8a65c6';
        return '<div class="achievement-extra-card">' +
            '<span class="achievement-extra-swatch" style="background:' + preview + '">✦</span>' +
            '<strong>' + html(item.DisplayName || item.Id) + '</strong>' +
            '<p>' + html(item.Description) + '</p><small>' + html(subtitle) + '</small>' +
            '<button tabindex="0" data-ach-extra="' + html(action) + '" data-ach-item="' + id + '" ' +
            (disabled ? 'disabled' : '') + '>' + html(label) + '</button></div>';
    }

    renderShop() {
        const catalog = this._data.catalog || {};
        const own = this._data.cosmetics || {};
        const balance = Number(own.ScoreBank || this.page._data?.bank?.ScoreBank || 0);
        const owned = new Set(list(own.Owned).map(value));
        const cards = list(catalog.Cosmetics).concat(list(catalog.PowerUps)).map((item) => {
            const isOwned = owned.has(item.Id);
            const price = Number(item.PriceScore || 0);
            const caption = this.t('Цена: ', 'Price: ') + number(price) + ' XP';
            return this.card(item, 'buy', isOwned ? this.t('Куплено', 'Owned') :
                this.t('Купить', 'Buy'), isOwned || price > balance, caption, item.PreviewColor);
        }).join('');
        return '<div class="achievement-extra-heading"><h2>' + this.t('Магазин', 'Score Shop') +
            '</h2><strong>✦ ' + number(balance) + ' XP</strong></div>' +
            '<div class="achievement-extra-grid" id="achievement-extra-controls">' + (cards ||
            '<p>' + this.t('Магазин пуст', 'Shop is empty') + '</p>') + '</div>';
    }

    renderCosmetics() {
        const catalog = this._data.catalog || {};
        const own = this._data.cosmetics || {};
        const owned = new Set(list(own.Owned).map(value));
        const selection = {
            ProfileTheme: own.EquippedThemeId,
            BadgeFrame: own.EquippedBadgeFrameId,
            RankTitle: own.EquippedCustomTitleId,
            Avatar: own.EquippedAvatarId,
            Background: own.EquippedBackgroundId,
            ProfileBorder: own.EquippedProfileBorderId
        };
        const cards = list(catalog.Cosmetics).filter((item) => owned.has(item.Id)).map((item) => {
            const kind = cosmeticKind(item.Kind);
            const selected = selection[kind] === item.Id;
            return this.card(item, selected ? 'unequip' : 'cosmetic-equip',
                selected ? this.t('Убрать', 'Unequip') : this.t('Применить', 'Equip'),
                false, selected ? this.t('Установлено', 'Equipped') : kind,
                item.PreviewColor);
        }).join('');
        return '<div class="achievement-extra-heading"><h2>' + this.t('Оформление профиля', 'Profile cosmetics') + '</h2></div>' +
            '<div class="achievement-extra-preview">✦ ' + html(own.EquippedCustomTitleId || this.page._data?.rank?.Tier?.Name || '') +
            '<span>' + this.t('Темы · рамки · аватары · фоны · титулы', 'Themes · frames · avatars · backgrounds · titles') + '</span></div>' +
            '<div class="achievement-extra-grid" id="achievement-extra-controls">' + (cards ||
            '<p>' + this.t('Косметика пока не открыта', 'No unlocked cosmetics') + '</p>') + '</div>' +
            this.renderPowerups();
    }

    renderPowerups() {
        const inventory = list(this._data.powerups?.Inventory);
        const rows = inventory.map((info) => {
            const key = value(info.Type);
            const qty = Number(info.Count || 0);
            return '<div class="achievement-extra-row"><strong>' + html(info.DisplayName || key) + ' × ' + qty + '</strong>' +
                '<button tabindex="0" data-ach-extra="powerup" data-ach-item="' + html(key) + '" ' +
                (qty <= 0 ? 'disabled' : '') + '>' + this.t('Использовать', 'Use') + '</button></div>';
        }).join('');
        return '<h2 class="achievements-quest-heading">' + this.t('Усиления', 'Power-ups') + '</h2>' +
            '<div class="achievement-extra-rows">' + rows + '</div>';
    }

    renderFriends() {
        const data = this._data.friends || {};
        const friends = list(data.Friends);
        const incoming = list(data.Incoming);
        const outgoing = list(data.Outgoing);
        const friendIds = new Set(friends.map((f) => value(f.UserId).toLowerCase()));
        const invited = new Set(outgoing.map((f) => value(f.UserId).toLowerCase()));
        const pending = new Set(incoming.map((f) => value(f.UserId).toLowerCase()));
        const friendRows = friends.map((f) => '<div class="achievement-extra-row"><div><strong>' +
            html(f.UserName || f.UserId) + '</strong><small>' + (f.Online ? '● Online' : '○ Offline') +
            '</small></div><div><button tabindex="0" data-ach-extra="chat-user" data-ach-item="' + html(f.UserId) + '">' +
            this.t('Написать', 'Message') + '</button><button tabindex="0" data-ach-extra="remove-friend" data-ach-item="' +
            html(f.UserId) + '">' + this.t('Удалить', 'Remove') + '</button></div></div>').join('');
        const inviteRows = incoming.map((f) => '<div class="achievement-extra-row"><strong>' + html(f.UserName || f.UserId) +
            '</strong><button tabindex="0" data-ach-extra="accept-friend" data-ach-item="' + html(f.UserId) + '">' +
            this.t('Принять', 'Accept') + '</button></div>').join('');
        const directoryRows = list(this._data.directory).filter((f) => {
            const id = value(f.UserId || f.Id).toLowerCase();
            return id && id !== value(client.userId).toLowerCase() && !friendIds.has(id) && !invited.has(id) && !pending.has(id);
        }).map((f) => '<div class="achievement-extra-row"><strong>' + html(f.UserName || f.Name || f.Username) +
            '</strong><button tabindex="0" data-ach-extra="invite" data-ach-item="' + html(f.UserId || f.Id) + '">' +
            this.t('Пригласить', 'Invite') + '</button></div>').join('');
        return '<div id="achievement-extra-controls"><h2 class="achievements-quest-heading">' + this.t('Друзья', 'Friends') + ' (' + friends.length + ')</h2>' +
            '<div class="achievement-extra-rows">' + (friendRows || '<p>' + this.t('Нет друзей', 'No friends yet') + '</p>') + '</div>' +
            '<h2 class="achievements-quest-heading">' + this.t('Заявки', 'Requests') + '</h2><div class="achievement-extra-rows">' +
            (inviteRows || '<p>—</p>') + '</div><h2 class="achievements-quest-heading">' +
            this.t('Найти пользователей', 'Find users') + '</h2><div class="achievement-extra-rows">' + directoryRows +
            '</div></div>';
    }

    renderMessages() {
        if (this._thread) return this.renderThread();
        const rows = list(this._data.threads).map((thread) => '<button class="achievement-extra-thread" tabindex="0" ' +
            'data-ach-extra="thread" data-ach-item="' + html(thread.conversationId || thread.ConversationId) + '">' +
            '<strong>' + html(thread.title || thread.otherUserName || thread.OtherUserName || this.t('Беседа', 'Conversation')) +
            '</strong><small>' + html(thread.lastMessage || '') + '</small><span>' +
            number(thread.unreadCount || 0) + ' · →</span></button>').join('');
        return '<h2 class="achievements-quest-heading">' + this.t('Сообщения', 'Messages') + '</h2>' +
            '<div id="achievement-extra-controls" class="achievement-extra-rows">' + (rows ||
            '<p>' + this.t('Сообщений пока нет', 'No messages yet') + '</p>') + '</div>';
    }

    renderThread() {
        const thread = this._thread || {};
        const messages = list(thread.messages);
        return '<div id="achievement-extra-controls"><button tabindex="0" data-ach-extra="thread-back">← ' +
            this.t('Все сообщения', 'All messages') + '</button><h2 class="achievements-quest-heading">' +
            html(thread.title) + '</h2><div class="achievement-extra-chat">' +
            messages.map((msg) => '<div class="achievement-extra-bubble ' +
                (value(msg.fromUserId).toLowerCase() === value(client.userId).toLowerCase() ? 'mine' : '') + '">' +
                '<small>' + html(msg.fromUserName || '') + '</small><p>' + html(msg.text || '') +
                '</p></div>').join('') +
            '</div><div class="achievement-extra-compose"><textarea id="achievement-chat-input" maxlength="4000" rows="2" tabindex="0" placeholder="' +
            this.t('Ваше сообщение', 'Write a message') + '"></textarea><button tabindex="0" data-ach-extra="send">' +
            this.t('Отправить', 'Send') + '</button></div></div>';
    }

    showConfirm(message, callback, label) {
        this._pending = callback;
        const modal = this.page.$('#achievement-extra-modal');
        if (!modal) return;
        modal.hidden = false;
        modal.innerHTML = '<div class="achievement-extra-confirm" role="dialog" aria-modal="true"><p>' + html(message) +
            '</p><button tabindex="0" data-ach-extra="confirm">' + html(label || this.t('Подтвердить', 'Confirm')) +
            '</button><button tabindex="0" data-ach-extra="cancel">' + this.t('Отмена', 'Cancel') + '</button></div>';
        this._priorFocus = document.activeElement;
        focusManager.pushTrap(modal, { orientation: 'horizontal', defaultFocusSelector: '[data-ach-extra="cancel"]' });
        this._modalTrapped = true;
    }

    closeConfirm() {
        const modal = this.page.$('#achievement-extra-modal');
        if (modal) { modal.hidden = true; modal.innerHTML = ''; }
        this._pending = null;
        if (this._modalTrapped) {
            focusManager.popTrap();
            this._modalTrapped = false;
        }
        if (this._priorFocus?.isConnected) this._priorFocus.focus();
    }

    onBack() {
        const modal = this.page.$('#achievement-extra-modal');
        if (modal && !modal.hidden) { this.closeConfirm(); return true; }
        if (this.tab === 'messages' && this._thread) { this._thread = null; this.draw(); return true; }
        return false;
    }

    async _mutate(fn, tab = this.tab) {
        if (this._busy) return;
        this._busy = true;
        try {
            const result = await fn();
            if (result && result.Success === false) throw new Error(result.Message || 'Server rejected request');
            toast.show(this.t('Изменения сохранены', 'Changes saved'), 3200);
            delete this._loaded[tab];
            if (tab === 'shop' || tab === 'cosmetics') {
                delete this._loaded.shop;
                delete this._loaded.cosmetics;
            }
            await this.open(tab);
        } catch (err) {
            log.warn('AchievementBadges action failed', err);
            toast.show(this.t('Ошибка: ', 'Error: ') + value(err.message || err), 4500);
        } finally { this._busy = false; }
    }

    async handle(button) {
        const action = button?.dataset?.achExtra;
        if (!action) return false;
        const itemId = button.dataset.achItem;
        if (action === 'cancel') { this.closeConfirm(); return true; }
        if (action === 'confirm') {
            const pending = this._pending;
            this.closeConfirm();
            if (pending) await pending();
            return true;
        }
        if (action === 'retry') { delete this._loaded[this.tab]; await this.open(this.tab); return true; }
        if (action === 'buy') {
            const catalog = this._data.catalog || {};
            const item = list(catalog.Cosmetics).concat(list(catalog.PowerUps)).find((it) => it.Id === itemId);
            if (item) this.showConfirm(this.t('Купить ', 'Buy ') + (item.DisplayName || itemId) + ' за ' + number(item.PriceScore) + ' XP?',
                () => this._mutate(() => client.buyShopItem(itemId)));
            return true;
        }
        if (action === 'cosmetic-equip' || action === 'unequip') {
            const item = list(this._data.catalog?.Cosmetics).find((it) => it.Id === itemId);
            if (item) await this._mutate(() => action === 'unequip' ?
                client.unequipCosmetic(cosmeticKind(item.Kind)) : client.equipCosmetic(itemId), 'cosmetics');
            return true;
        }
        if (action === 'powerup') {
            this.showConfirm(this.t('Использовать усиление ', 'Use power-up ') + itemId + '?',
                () => this._mutate(() => client.usePowerUp(itemId), 'cosmetics'));
            return true;
        }
        if (action === 'invite' || action === 'accept-friend' || action === 'remove-friend') {
            const fn = action === 'invite' ? () => client.inviteFriend(itemId) :
                action === 'accept-friend' ? () => client.acceptFriend(itemId) : () => client.removeFriend(itemId);
            this.showConfirm(this.t('Подтвердить действие для пользователя?', 'Confirm friend action?'),
                () => this._mutate(fn, 'friends'));
            return true;
        }
        if (action === 'chat-user') {
            this.tab = 'messages';
            try {
                const response = await client.getMessages(itemId);
                this._thread = { userId: itemId, conversationId: response.ConversationId, title: itemId, messages: list(response.Messages) };
                await this.open('messages');
            } catch (err) { toast.show(this.t('Не удалось открыть переписку', 'Cannot open chat'), 4500); }
            return true;
        }
        if (action === 'thread') {
            const source = list(this._data.threads).find((t) => value(t.conversationId) === itemId);
            try {
                const response = await client.getConversationMessages(itemId);
                this._thread = { conversationId: itemId, title: source?.title || source?.otherUserName || itemId, messages: list(response.Messages) };
                this.draw();
            } catch (err) { toast.show(this.t('Не удалось открыть переписку', 'Cannot open chat'), 4500); }
            return true;
        }
        if (action === 'thread-back') { this._thread = null; this.draw(); return true; }
        if (action === 'send' && this._thread) {
            const input = this.page.$('#achievement-chat-input');
            const message = (input?.value || '').trim();
            if (!message) return true;
            if (message.length > 4000) return true;
            try {
                const response = this._thread.conversationId ?
                    await client.sendConversationMessage(this._thread.conversationId, message) :
                    await client.sendMessage(this._thread.userId, message);
                if (response?.Success === false) throw Error(response.Message || 'Cannot send');
                const updated = this._thread.conversationId ?
                    await client.getConversationMessages(this._thread.conversationId) :
                    await client.getMessages(this._thread.userId);
                this._thread.messages = list(updated.Messages);
                this.draw();
                const field = this.page.$('#achievement-chat-input');
                if (field) field.focus();
            } catch (err) { toast.show(this.t('Сообщение не отправлено', 'Message not sent'), 4500); }
            return true;
        }
        return false;
    }
}
