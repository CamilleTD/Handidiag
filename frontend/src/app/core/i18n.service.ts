import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Lang, LocalizedText } from './models';
import { PreferencesService } from './preferences.service';

type Dictionary = Record<string, unknown>;

/**
 * Textes de l'interface (public/i18n/<langue>.json) et textes du contenu ({fr, en}).
 * En mode « textes simplifiés », la variante FALC est utilisée quand elle existe.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly prefs = inject(PreferencesService);
  private readonly dictionaries = signal<Partial<Record<Lang, Dictionary>>>({});

  readonly lang = computed(() => this.prefs.value().lang);
  readonly falc = computed(() => this.prefs.value().falc);

  /** Charge le français (langue de repli) et la langue demandée. */
  async load(lang: Lang = this.lang()): Promise<void> {
    const wanted: Lang[] = lang === 'fr' ? ['fr'] : ['fr', lang];
    const missing = wanted.filter((l) => !this.dictionaries()[l]);
    const loaded = await Promise.all(
      missing.map((l) => firstValueFrom(this.http.get<Dictionary>(`/i18n/${l}.json`))),
    );
    this.dictionaries.update((d) => {
      const next = { ...d };
      missing.forEach((l, i) => (next[l] = loaded[i]));
      return next;
    });
  }

  async setLang(lang: Lang): Promise<void> {
    await this.load(lang);
    this.prefs.update({ lang, voice: '' });
  }

  find(path: string): unknown {
    const dictionaries = this.dictionaries();
    const languages: Lang[] = this.lang() === 'fr' ? ['fr'] : [this.lang(), 'fr'];
    for (const lang of languages) {
      const dictionary = dictionaries[lang];
      if (!dictionary) continue;
      if (this.falc()) {
        const simple = lookup(dictionary, path.replace(/([^.]+)$/, '$1_falc'));
        if (simple !== undefined) return simple;
      }
      const value = lookup(dictionary, path);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  t(path: string, vars: Record<string, string | number> = {}): string {
    const value = this.find(path);
    if (typeof value !== 'string') return path;
    return value.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in vars ? String(vars[key]) : match,
    );
  }

  list(path: string): string[] {
    const value = this.find(path);
    return Array.isArray(value) ? (value as string[]) : [];
  }

  steps(path: string): { title: string; text: string }[] {
    const value = this.find(path);
    return Array.isArray(value) ? (value as { title: string; text: string }[]) : [];
  }

  /** Texte du contenu dans la langue active (variante simplifiée si demandée et disponible). */
  text(value: LocalizedText | null | undefined, simple?: LocalizedText | null): string {
    const chosen = this.falc() && simple ? simple : value;
    if (!chosen) return '';
    return chosen[this.lang()] || chosen.fr;
  }
}

function lookup(dictionary: unknown, path: string): unknown {
  let value = dictionary;
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Dictionary)[key];
  }
  return value;
}
