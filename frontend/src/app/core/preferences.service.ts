import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import type { Lang } from './models';

export type Theme = 'auto' | 'light' | 'dark' | 'contrast';
export type Font = 'system' | 'atkinson' | 'dyslexic' | 'lexend';

export interface Preferences {
  lang: Lang;
  theme: Theme;
  font: Font;
  size: number;
  falc: boolean;
  dys: boolean;
  ruler: boolean;
  voice: string;
  rate: number;
  remember: boolean;
}

export const SIZE_MIN = 50;
export const SIZE_MAX = 300;
export const SIZE_STEP = 10;
const STORE_KEY = 'hd-prefs';
const THEMES: Theme[] = ['auto', 'light', 'dark', 'contrast'];
const FONTS: Font[] = ['system', 'atkinson', 'dyslexic', 'lexend'];

type DisplayPreferences = Pick<Preferences, 'font' | 'size' | 'theme' | 'dys' | 'ruler' | 'falc'>;
const DISPLAY_DEFAULTS: DisplayPreferences = {
  font: 'system',
  size: 100,
  theme: 'auto',
  dys: false,
  ruler: false,
  falc: false,
};

/** Profils rapides : un clic règle plusieurs options à la fois. */
export const PROFILES: Record<'dys' | 'adhd' | 'lowvision', Partial<DisplayPreferences>> = {
  dys: { font: 'dyslexic', dys: true, size: 110 },
  adhd: { font: 'lexend', dys: true, falc: true, ruler: true, size: 105 },
  lowvision: { font: 'atkinson', size: 150, theme: 'contrast' },
};

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const value = Number(n);
  return Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : fallback;
};

/** Réglages d'affichage. Ils ne sont mémorisés (localStorage) que si la personne le demande. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly document = inject(DOCUMENT);
  readonly value = signal<Preferences>(this.initial());

  constructor() {
    effect(() => {
      const p = this.value();
      const root = this.document.documentElement;
      root.lang = p.lang;
      root.dataset['theme'] = p.theme;
      root.dataset['font'] = p.font;
      root.style.setProperty('--fs', String(p.size));
      root.classList.toggle('dys', p.dys);
      this.persist(p);
    });
  }

  update(change: Partial<Preferences>): void {
    this.value.update((p) => this.sanitize({ ...p, ...change }));
  }

  applyProfile(name: keyof typeof PROFILES): void {
    this.update({ ...DISPLAY_DEFAULTS, ...PROFILES[name] });
  }

  resetDisplay(): void {
    this.update(DISPLAY_DEFAULTS);
  }

  private initial(): Preferences {
    const detected: Lang = (navigator.language || 'fr').startsWith('en') ? 'en' : 'fr';
    const defaults: Preferences = {
      lang: detected,
      ...DISPLAY_DEFAULTS,
      voice: '',
      rate: 0.95,
      remember: false,
    };
    try {
      const stored = localStorage.getItem(STORE_KEY);
      return stored ? this.sanitize({ ...defaults, ...JSON.parse(stored) }) : defaults;
    } catch {
      return defaults;
    }
  }

  private sanitize(p: Preferences): Preferences {
    return {
      lang: p.lang === 'en' ? 'en' : 'fr',
      theme: THEMES.includes(p.theme) ? p.theme : 'auto',
      font: FONTS.includes(p.font) ? p.font : 'system',
      size: Math.round(clamp(p.size, SIZE_MIN, SIZE_MAX, 100) / SIZE_STEP) * SIZE_STEP,
      falc: p.falc === true,
      dys: p.dys === true,
      ruler: p.ruler === true,
      voice: typeof p.voice === 'string' ? p.voice.slice(0, 200) : '',
      rate: clamp(p.rate, 0.6, 1.4, 0.95),
      remember: p.remember === true,
    };
  }

  private persist(p: Preferences): void {
    try {
      if (p.remember) localStorage.setItem(STORE_KEY, JSON.stringify(p));
      else localStorage.removeItem(STORE_KEY);
    } catch {
      /* stockage indisponible : les réglages restent valables pour cette visite */
    }
  }
}
