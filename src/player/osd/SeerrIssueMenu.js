import BaseMenu from './BaseMenu.js';
import { i18n } from '../../utils/i18n.js';
import { logger } from '../../utils/Logger.js';
import { toast } from '../../ui/Toast.js';
import { escapeHtml } from '../../utils/Utils.js';
import { SEERR_STATUS } from '../../api/seerrNormalize.js';
import '../../styles/seerr-issue-menu.css';

const log = logger.create('SeerrIssueMenu');

function t(key, fallback) {
    const value = i18n.t(key);
    return value && value !== key ? value : fallback;
}

/**
 * Seerr-style issue modal embedded into the player OSD.
 * Uses Seerr's internal media row ID (mediaInfo.id), not the TMDB ID,
 * and mirrors Seerr's radio options plus affected season/episode selects.
 */
export default class SeerrIssueMenu extends BaseMenu {
    constructor(osdController) {
        super(osdController);
        this.isModal = true;
        this._item = null;
        this._tmdbId = null;
        this._mediaType = 'movie';
        this._mediaId = null;
        this._details = null;
        this._availableSeasons = [];
        this._selectedType = 1;
        this._problemSeason = 0;
        this._problemEpisode = 0;
        this._metadataLoading = false;
        this._metadataError = '';
        this._sending = false;
        this._message = '';
    }

    open(item) {
        this._item = item || null;
        this._mediaType = item && ['Series', 'Season', 'Episode'].includes(item.Type) ? 'tv' : 'movie';
        const providers = item && item.ProviderIds ? item.ProviderIds : {};
        const seriesProviders = item && item.SeriesProviderIds ? item.SeriesProviderIds : {};
        const rawId = this._mediaType === 'tv'
            ? (seriesProviders.Tmdb || seriesProviders.tmdb || providers.Tmdb || providers.tmdb)
            : (providers.Tmdb || providers.tmdb);
        this._tmdbId = rawId && /^\d+$/.test(String(rawId)) ? Number(rawId) : null;
        this._mediaId = null;
        this._details = null;
        this._availableSeasons = [];
        this._selectedType = 1;
        this._problemSeason = 0;
        this._problemEpisode = 0;
        this._metadataLoading = !!this._tmdbId;
        this._metadataError = this._tmdbId ? '' : t('SeerrIssueNoTmdb', 'Для этого элемента не найден TMDB ID.');
        this._sending = false;
        this._message = '';

        this._render();
        this.osd.activeMenu = this;
        this.show();
        this._syncFocus();
        if (this._tmdbId) void this._loadMediaDetails();
    }

    _syncFocus() {
        this.osd._cacheFocusableElements();
        this.osd._currentFocusRow = -1;
        this.osd._currentFocusIndex = 0;
        this.osd._updateFocus();
    }

    _getTitle() {
        if (this._mediaType === 'tv') {
            return this._item?.SeriesName || this._item?.Name || t('Series', 'Сериал');
        }
        return this._item?.Name || t('Movie', 'Фильм');
    }

    async _loadMediaDetails() {
        try {
            const { seerr } = await import('../../api/seerrClient.js');
            const details = await seerr.details(this._mediaType, this._tmdbId);
            this._details = details;
            this._mediaId = Number(details?._seerrMediaId) > 0 ? Number(details._seerrMediaId) : null;

            if (this._mediaType === 'tv') {
                const mediaSeasons = Array.isArray(details?._seerrMediaInfo?.seasons)
                    ? details._seerrMediaInfo.seasons
                    : [];
                this._availableSeasons = mediaSeasons
                    .filter((season) => {
                        const status = Number(season?.status || 0);
                        return status === SEERR_STATUS.AVAILABLE || status === SEERR_STATUS.PARTIALLY_AVAILABLE;
                    })
                    .map((season) => Number(season.seasonNumber))
                    .filter((season) => Number.isInteger(season) && season >= 0)
                    .sort((a, b) => a - b);
                this._problemSeason = this._availableSeasons.length === 1 ? this._availableSeasons[0] : 0;
            }
            this._metadataLoading = false;
            this._metadataError = this._mediaId
                ? ''
                : t('SeerrIssueMediaNotRegistered', 'Seerr ещё не зарегистрировал этот фильм или сериал. Откройте его в Seerr или создайте запрос, затем повторите отправку.');
            this._render();
            this.show();
            this._syncFocus();
        } catch (error) {
            log.warn('Unable to resolve the Seerr media record for issue reporting', error);
            this._metadataLoading = false;
            this._metadataError = error?.message || t('SeerrIssueDetailsFailed', 'Не удалось получить данные Seerr для этого фильма.');
            this._render();
            this.show();
            this._syncFocus();
        }
    }

    _getEpisodeCount() {
        if (!this._details || !Array.isArray(this._details._seerrSeasons)) return 0;
        const season = this._details._seerrSeasons.find((entry) =>
            Number(entry?.seasonNumber ?? entry?.season_number) === Number(this._problemSeason)
        );
        return Math.max(0, Number(season?.episodeCount ?? season?.episode_count ?? 0));
    }

    _renderSeasonSelectors() {
        if (this._mediaType !== 'tv' || this._metadataLoading || !this._mediaId) return '';
        if (!this._availableSeasons.length) {
            return `<div class="seerr-issue-no-seasons">${escapeHtml(t('SeerrIssueNoAvailableSeasons', 'Seerr не указал доступные сезоны. Можно отправить обращение для всего сериала.'))}</div>`;
        }

        const seasonOptions = [];
        if (this._availableSeasons.length > 1) {
            seasonOptions.push(`<option value="0"${this._problemSeason === 0 ? ' selected' : ''}>${escapeHtml(t('SeerrIssueAllSeasons', 'Все сезоны'))}</option>`);
        }
        this._availableSeasons.forEach((season) => {
            seasonOptions.push(`<option value="${season}"${this._problemSeason === season ? ' selected' : ''}>${escapeHtml(t('SeerrIssueSeason', 'Сезон'))} ${season}</option>`);
        });

        const episodeCount = this._problemSeason > 0 ? this._getEpisodeCount() : 0;
        const episodeOptions = [`<option value="0"${this._problemEpisode === 0 ? ' selected' : ''}>${escapeHtml(t('SeerrIssueAllEpisodes', 'Все эпизоды'))}</option>`];
        for (let episode = 1; episode <= episodeCount; episode += 1) {
            episodeOptions.push(`<option value="${episode}"${this._problemEpisode === episode ? ' selected' : ''}>${escapeHtml(t('SeerrIssueEpisode', 'Эпизод'))} ${episode}</option>`);
        }

        return `
            <div class="seerr-issue-menu__extras">
                <div class="seerr-issue-field">
                    <label class="seerr-issue-menu__label" for="seerr-issue-season">${escapeHtml(t('SeerrIssueAffectedSeason', 'Затронутый сезон'))}</label>
                    <select id="seerr-issue-season" tabindex="0">${seasonOptions.join('')}</select>
                </div>
                ${this._problemSeason > 0 ? `
                    <div class="seerr-issue-field">
                        <label class="seerr-issue-menu__label" for="seerr-issue-episode">${escapeHtml(t('SeerrIssueAffectedEpisode', 'Затронутый эпизод'))}</label>
                        <select id="seerr-issue-episode" tabindex="0">${episodeOptions.join('')}</select>
                    </div>
                ` : ''}
            </div>
        `;
    }

    _render() {
        if (this.$el) this.$el.remove();
        const types = [
            [1, t('SeerrIssueVideo', 'Видео'), t('SeerrIssueVideoDescription', 'Изображение, качество или воспроизведение видео')],
            [2, t('SeerrIssueAudio', 'Звук'), t('SeerrIssueAudioDescription', 'Нет звука, неверная дорожка или рассинхронизация')],
            [3, t('SeerrIssueSubtitles', 'Субтитры'), t('SeerrIssueSubtitlesDescription', 'Нет субтитров, неверный язык или синхронизация')],
            [4, t('SeerrIssueOther', 'Другое'), t('SeerrIssueOtherDescription', 'Другая проблема с этим фильмом или сериалом')]
        ];
        const backdrop = this._details?._backdropUrl || '';
        const overlay = document.createElement('div');
        overlay.className = 'seerr-issue-menu-overlay';
        overlay.innerHTML = `
            <section class="seerr-issue-menu" role="dialog" aria-modal="true" aria-label="${escapeHtml(t('SeerrIssueReportTitle', 'Сообщить о проблеме'))}">
                ${backdrop ? `<div class="seerr-issue-menu__backdrop" style="background-image:url('${escapeHtml(backdrop)}')"></div>` : ''}
                <div class="seerr-issue-menu__body">
                    <header class="seerr-issue-menu__header">
                        <div class="seerr-issue-menu__eyebrow">SEERR <span>/</span> ${escapeHtml(t('SeerrCenterIssue', 'Проблема'))}</div>
                        <h2>${escapeHtml(t('SeerrIssueReportTitle', 'Сообщить о проблеме'))}</h2>
                        <p>${escapeHtml(this._getTitle())}</p>
                    </header>
                    ${this._metadataLoading ? `<div class="seerr-issue-state loading"><span class="seerr-issue-spinner"></span>${escapeHtml(t('SeerrIssueLoadingMedia', 'Проверяем фильм в Seerr…'))}</div>` : ''}
                    ${this._metadataError ? `<div class="seerr-issue-state error">${escapeHtml(this._metadataError)}</div>` : ''}
                    <div class="seerr-issue-form">
                        ${this._renderSeasonSelectors()}
                        <div class="seerr-issue-section-title">${escapeHtml(t('SeerrIssueTypeLabel', 'Что случилось?'))}</div>
                        <div class="seerr-issue-type-list" role="radiogroup" aria-label="${escapeHtml(t('SeerrIssueTypeLabel', 'Тип проблемы'))}">
                            ${types.map(([id,label,description]) => `
                                <button type="button" class="seerr-issue-type${id === this._selectedType ? ' active' : ''}"
                                    role="radio" aria-checked="${id === this._selectedType ? 'true' : 'false'}"
                                    data-issue-type="${id}" tabindex="0">
                                    <span class="seerr-issue-radio" aria-hidden="true"><span></span></span>
                                    <span class="seerr-issue-type-copy">
                                        <strong>${escapeHtml(label)}</strong>
                                        <small>${escapeHtml(description)}</small>
                                    </span>
                                </button>
                            `).join('')}
                        </div>
                        <div class="seerr-issue-field seerr-issue-message-field">
                            <label class="seerr-issue-menu__label" for="seerr-issue-message">${escapeHtml(t('SeerrIssueDescription', 'Описание проблемы'))}<span class="seerr-issue-required">*</span></label>
                            <textarea id="seerr-issue-message" maxlength="2000" rows="5" tabindex="0"
                                placeholder="${escapeHtml(t('SeerrIssueDescriptionPlaceholder', 'Опишите, что происходит и когда появляется проблема…'))}">${escapeHtml(this._message || '')}</textarea>
                            <small class="seerr-issue-field-hint">${escapeHtml(t('SeerrIssueDescriptionHint', 'Чем подробнее описание, тем проще найти причину.'))}</small>
                        </div>
                    </div>
                    <footer class="seerr-issue-menu__actions">
                        <button type="button" class="seerr-issue-cancel" data-issue-cancel="true" tabindex="0">${escapeHtml(t('ButtonBack', 'Отмена'))}</button>
                        <button type="button" class="seerr-issue-submit" data-issue-submit="true"
                            ${this._metadataLoading || !this._mediaId || this._sending ? 'disabled' : ''} tabindex="0">
                            ${escapeHtml(this._sending ? t('Loading', 'Отправка…') : t('SeerrIssueSubmit', 'Отправить обращение'))}
                        </button>
                    </footer>
                </div>
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
        overlay.querySelector('#seerr-issue-season')?.addEventListener('change', (event) => {
            this._problemSeason = Number(event.target.value) || 0;
            this._problemEpisode = 0;
            this._render();
            this.show();
            this._syncFocus();
        });
        overlay.querySelector('#seerr-issue-episode')?.addEventListener('change', (event) => {
            this._problemEpisode = Number(event.target.value) || 0;
        });
        overlay.querySelector('#seerr-issue-message')?.addEventListener('input', (event) => {
            this._message = event.target.value;
        });
    }

    _selectType(type) {
        this._selectedType = type;
        this.$el?.querySelectorAll('[data-issue-type]').forEach((button) => {
            const active = Number(button.getAttribute('data-issue-type')) === type;
            button.classList.toggle('active', active);
            button.setAttribute('aria-checked', active ? 'true' : 'false');
        });
    }

    async _submit() {
        if (this._sending) return;
        const message = this.$el?.querySelector('#seerr-issue-message')?.value?.trim() || '';
        if (!this._tmdbId) {
            toast.show(t('SeerrIssueNoTmdb', 'Для этого элемента не найден TMDB ID.'));
            return;
        }
        if (!this._mediaId) {
            toast.show(t('SeerrIssueMediaNotRegistered', 'Seerr ещё не зарегистрировал этот фильм или сериал.'));
            return;
        }
        if (!message) {
            toast.show(t('SeerrIssueMessageRequired', 'Добавьте описание проблемы.'));
            this.$el?.querySelector('#seerr-issue-message')?.focus();
            return;
        }

        this._sending = true;
        this._message = message;
        this._render();
        this.show();
        this._syncFocus();
        try {
            const { seerr } = await import('../../api/seerrClient.js');
            const user = await seerr.currentUser();
            const permissions = Number(user?.permissions || 0);
            const canCreate = !!(permissions & (2 | 1048576 | 4194304));
            if (!canCreate) {
                throw new Error(t('SeerrIssuePermissionDenied', 'У вашей учётной записи нет права создавать обращения.'));
            }

            await seerr.createIssue({
                mediaId: this._mediaId,
                issueType: this._selectedType,
                message,
                problemSeason: this._problemSeason,
                problemEpisode: this._problemEpisode
            });
            toast.show(t('SeerrIssueSent', 'Сообщение отправлено в Seerr.'));
            this.osd.closeMenu();
        } catch (error) {
            log.warn('Unable to submit Seerr issue', error);
            const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
            if (status === 404) {
                toast.show(t('SeerrIssueProxyNotInstalled', 'Серверный плагин Litefin не поддерживает отправку жалоб. Обновите его и попробуйте снова.'));
            } else if (status === 403) {
                toast.show(t('SeerrIssuePermissionDenied', 'У вашей учётной записи нет права создавать обращения.'));
            } else {
                toast.show(error?.message || t('SeerrIssueSendFailed', 'Не удалось отправить обращение.'));
            }
            this._sending = false;
            this._render();
            this.show();
            this._syncFocus();
        }
    }

    handleKey(key) {
        if (!this.isVisible || !this.$el) return false;
        if (key === 'back') {
            this.osd.closeMenu();
            return true;
        }
        const current = this.osd._cachedOverlayRow[this.osd._currentFocusIndex];
        if (current && current.tagName === 'SELECT' && ['left', 'right', 'up', 'down'].includes(key)) {
            const direction = key === 'left' || key === 'up' ? -1 : 1;
            const next = Math.max(0, Math.min(current.options.length - 1, current.selectedIndex + direction));
            if (next !== current.selectedIndex) {
                current.selectedIndex = next;
                current.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
        }
        const editing = current && (current.tagName === 'TEXTAREA' || current.tagName === 'INPUT');
        if (editing && ['left', 'right', 'up', 'down'].includes(key)) return true;
        if (key === 'enter' && current) {
            if (current.hasAttribute('data-issue-type')) {
                current.click();
                return true;
            }
            if (current.hasAttribute('data-issue-submit')) {
                if (!current.disabled) void this._submit();
                return true;
            }
            if (current.hasAttribute('data-issue-cancel')) {
                this.osd.closeMenu();
                return true;
            }
            if (current.tagName === 'SELECT' || current.tagName === 'TEXTAREA' || current.tagName === 'INPUT') {
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
