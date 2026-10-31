import BaseMenu from './BaseMenu.js';
import { i18n } from '../../utils/i18n.js';
import { logger } from '../../utils/Logger.js';
import { toast } from '../../ui/Toast.js';
import { escapeHtml } from '../../utils/Utils.js';
import '../../styles/seerr-issue-menu.css';

const log = logger.create('SeerrIssueMenu');

function t(key, fallback) {
    const value = i18n.t(key);
    return value && value !== key ? value : fallback;
}

/**
 * In-player Seerr issue form. It is a BaseMenu so the existing OSD owns
 * focus, D-pad movement, Back handling and auto-hide suppression.
 */
export default class SeerrIssueMenu extends BaseMenu {
    constructor(osdController) {
        super(osdController);
        this.isModal = true;
        this._item = null;
        this._mediaId = null;
        this._mediaType = 'movie';
        this._selectedType = 1;
        this._sending = false;
        this._openedAt = 0;
    }

    open(item) {
        this._item = item || null;
        this._mediaType = item && ['Series', 'Season', 'Episode'].includes(item.Type) ? 'tv' : 'movie';
        const providers = item && item.ProviderIds ? item.ProviderIds : {};
        const seriesProviders = item && item.SeriesProviderIds ? item.SeriesProviderIds : {};
        const rawId = this._mediaType === 'tv'
            ? (seriesProviders.Tmdb || seriesProviders.tmdb || providers.Tmdb || providers.tmdb)
            : (providers.Tmdb || providers.tmdb);
        this._mediaId = rawId && /^\d+$/.test(String(rawId)) ? Number(rawId) : null;
        this._selectedType = 1;
        this._sending = false;

        this.render();
        this.osd.activeMenu = this;
        this.show();
        this._openedAt = Date.now();
        this.osd._cacheFocusableElements();
        this.osd._currentFocusRow = -1;
        this.osd._currentFocusIndex = 0;
        this.osd._updateFocus();
    }

    render() {
        if (this.$el) this.$el.remove();
        const itemTitle = this._mediaType === 'tv'
            ? (this._item?.SeriesName || this._item?.Name || t('Series', 'Сериал'))
            : (this._item?.Name || t('Movie', 'Фильм'));
        const types = [
            [1, t('SeerrIssueVideo', 'Видео'), '▣'],
            [2, t('SeerrIssueAudio', 'Звук'), '♫'],
            [3, t('SeerrIssueSubtitles', 'Субтитры'), 'CC'],
            [4, t('SeerrIssueOther', 'Другое'), '…']
        ];
        const overlay = document.createElement('div');
        overlay.className = 'seerr-issue-menu-overlay';
        overlay.innerHTML = `
            <section class="seerr-issue-menu" role="dialog" aria-modal="true">
                <header class="seerr-issue-menu__header">
                    <div class="seerr-issue-menu__eyebrow">SEERR / ${escapeHtml(t('SeerrCenterIssue', 'Проблема'))}</div>
                    <h2>${escapeHtml(t('SeerrIssueReportTitle', 'Сообщить о проблеме'))}</h2>
                    <p>${escapeHtml(itemTitle)}</p>
                </header>
                <div class="seerr-issue-menu__types">
                    ${types.map(([id,label,icon]) => `
                        <button type="button" class="seerr-issue-type${id === this._selectedType ? ' active' : ''}"
                            data-issue-type="${id}" tabindex="0">
                            <span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span>
                        </button>
                    `).join('')}
                </div>
                <label class="seerr-issue-menu__label" for="seerr-issue-message">${escapeHtml(t('SeerrIssueDescription', 'Опишите проблему'))}</label>
                <textarea id="seerr-issue-message" maxlength="2000" rows="4" tabindex="0"
                    placeholder="${escapeHtml(t('SeerrIssueDescriptionPlaceholder', 'Например: нет звука в русской дорожке…'))}"></textarea>
                <div class="seerr-issue-menu__actions">
                    <button type="button" class="seerr-issue-submit" data-issue-submit="true" tabindex="0">${escapeHtml(t('Send', 'Отправить'))}</button>
                    <button type="button" class="seerr-issue-cancel" data-issue-cancel="true" tabindex="0">${escapeHtml(t('ButtonBack', 'Назад'))}</button>
                </div>
                <p class="seerr-issue-menu__hint">${escapeHtml(t('SeerrIssueHint', 'Обращение появится в центре Seerr.'))}</p>
            </section>
        `;
        const overlays = this.osd._osdEl && this.osd._osdEl.querySelector('.osd-overlays');
        if (overlays) overlays.appendChild(overlay);
        this.$el = overlay;

        overlay.addEventListener('click', (event) => {
            const typeButton = event.target.closest('[data-issue-type]');
            if (typeButton) {
                this._selectType(Number(typeButton.getAttribute('data-issue-type')));
                return;
            }
            if (event.target.closest('[data-issue-submit]')) {
                void this._submit();
                return;
            }
            if (event.target.closest('[data-issue-cancel]')) this.osd.closeMenu();
        });
        overlay.querySelector('textarea')?.addEventListener('input', () => {
            this._message = overlay.querySelector('textarea').value;
        });
    }

    _selectType(type) {
        this._selectedType = type;
        this.$el?.querySelectorAll('[data-issue-type]').forEach((button) => {
            const active = Number(button.getAttribute('data-issue-type')) === type;
            button.classList.toggle('active', active);
        });
    }

    async _submit() {
        if (this._sending) return;
        const message = this.$el?.querySelector('#seerr-issue-message')?.value?.trim() || '';
        if (!this._mediaId) {
            toast.show(t('SeerrIssueNoTmdb', 'Для этого элемента не найден TMDB ID.'));
            return;
        }
        if (!message) {
            toast.show(t('SeerrIssueMessageRequired', 'Добавьте описание проблемы.'));
            this.$el?.querySelector('#seerr-issue-message')?.focus();
            return;
        }

        this._sending = true;
        const submit = this.$el?.querySelector('[data-issue-submit]');
        if (submit) {
            submit.disabled = true;
            submit.textContent = t('Loading', 'Отправка…');
        }
        try {
            const { seerr } = await import('../../api/seerrClient.js');
            const user = await seerr.currentUser();
            const permissions = Number(user?.permissions || 0);
            const canCreate = !!(permissions & (2 | 4194304));
            if (!canCreate) {
                throw new Error(t('SeerrIssuePermissionDenied', 'У вашей учётной записи нет права создавать обращения.'));
            }
            await seerr.createIssue({
                mediaId: this._mediaId,
                issueType: this._selectedType,
                message
            });
            toast.show(t('SeerrIssueSent', 'Сообщение отправлено в Seerr.'));
            this.osd.closeMenu();
        } catch (error) {
            log.warn('Unable to submit Seerr issue', error);
            toast.show(error?.message || t('SeerrIssueSendFailed', 'Не удалось отправить обращение.'));
            this._sending = false;
            if (submit) {
                submit.disabled = false;
                submit.textContent = t('Send', 'Отправить');
            }
        }
    }

    handleKey(key) {
        if (!this.isVisible || !this.$el) return false;
        if (key === 'back') {
            this.osd.closeMenu();
            return true;
        }
        const current = this.osd._cachedOverlayRow[this.osd._currentFocusIndex];
        const editing = current && (current.tagName === 'TEXTAREA' || current.tagName === 'INPUT');
        if (editing && (key === 'left' || key === 'right' || key === 'up' || key === 'down')) {
            return true;
        }
        if (key === 'enter' && current) {
            if (current.hasAttribute('data-issue-type')) {
                current.click();
                return true;
            }
            if (current.hasAttribute('data-issue-submit')) {
                void this._submit();
                return true;
            }
            if (current.hasAttribute('data-issue-cancel')) {
                this.osd.closeMenu();
                return true;
            }
            if (current.tagName === 'TEXTAREA' || current.tagName === 'INPUT') {
                current.focus();
                return true;
            }
        }
        return false;
    }

    hide() {
        super.hide();
        if (this.$el) this.$el.remove();
        this.$el = null;
    }
}
