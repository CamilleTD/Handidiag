import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import type { Lang } from '../../core/models';
import {
  Font,
  PROFILES,
  PreferencesService,
  SIZE_MAX,
  SIZE_MIN,
  SIZE_STEP,
  Theme,
} from '../../core/preferences.service';
import { VoiceService } from '../../core/voice.service';

@Component({
  templateUrl: './settings.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'leave()' },
})
export class SettingsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly prefs = inject(PreferencesService);
  protected readonly voice = inject(VoiceService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  /** Navigation interne précédente : « Retour » ramène là où l'on était (questionnaire compris). */
  private readonly cameFromApp = !!this.router.lastSuccessfulNavigation()?.previousNavigation;

  protected readonly SIZE_MIN = SIZE_MIN;
  protected readonly SIZE_MAX = SIZE_MAX;
  protected readonly profiles = Object.keys(PROFILES) as (keyof typeof PROFILES)[];
  protected readonly themes: Theme[] = ['auto', 'light', 'dark', 'contrast'];
  protected readonly fonts: Font[] = ['system', 'atkinson', 'dyslexic', 'lexend'];
  protected readonly announcement = signal('');
  protected readonly voices = computed(() =>
    this.voice.voices().filter((v) => v.lang.toLowerCase().startsWith(this.i18n.lang())),
  );
  protected readonly rate = computed(
    () =>
      `${Math.round(this.prefs.value().rate * 100) / 100}`.replace(
        '.',
        this.i18n.lang() === 'fr' ? ',' : '.',
      ) + '×',
  );

  protected leave(): void {
    if (this.cameFromApp) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  protected applyProfile(name: keyof typeof PROFILES): void {
    this.prefs.applyProfile(name);
    this.announce(this.i18n.t('ui.profile_applied', { name: this.i18n.t(`ui.profile_${name}`) }));
  }

  protected resetDisplay(): void {
    this.prefs.resetDisplay();
    this.announce(this.i18n.t('ui.profile_reset_done'));
  }

  protected setLang(lang: string): void {
    this.voice.stop();
    void this.i18n.setLang(lang as Lang);
  }

  protected resize(delta: number | null): void {
    const size = delta === null ? 100 : this.prefs.value().size + delta * SIZE_STEP;
    this.prefs.update({ size });
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  private announce(message: string): void {
    // Vidé puis rempli pour que les lecteurs d'écran annoncent aussi un message identique
    this.announcement.set('');
    setTimeout(() => this.announcement.set(message), 50);
  }
}
