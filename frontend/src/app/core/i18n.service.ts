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

  /** Dictionnaires complémentaires chargés à la demande (ex. « admin »). */
  private readonly namespaces = new Set<string>();

  /** Charge le français (langue de repli), la langue demandée et les dictionnaires ouverts. */
  async load(lang: Lang = this.lang()): Promise<void> {
    const wanted: Lang[] = lang === 'fr' ? ['fr'] : ['fr', lang];
    const loaded = await Promise.all(
      wanted.map(async (l) => {
        const current = this.dictionaries()[l];
        const base = current ?? (await this.fetch(`/i18n/${l}.json`));
        const extra: Dictionary = {};
        for (const ns of this.namespaces)
          if (!base[ns]) extra[ns] = await this.fetch(`/i18n/${ns}.${l}.json`);
        return [l, { ...base, ...extra }] as const;
      }),
    );
    this.dictionaries.update((d) => ({ ...d, ...Object.fromEntries(loaded) }));
  }

  /** Ajoute un dictionnaire (fichiers /i18n/<nom>.<langue>.json) sous la clé <nom>. */
  async loadNamespace(name: string): Promise<void> {
    this.namespaces.add(name);
    await this.load();
  }

  private fetch(url: string): Promise<Dictionary> {
    return firstValueFrom(this.http.get<Dictionary>(url));
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
