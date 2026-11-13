import { signal } from '@angular/core';
import adminEn from '../../public/i18n/admin.en.json';
import adminFr from '../../public/i18n/admin.fr.json';
import { I18nService } from '../app/core/i18n.service';
import type { Lang, LocalizedText } from '../app/core/models';

const ADMIN = { fr: adminFr, en: adminEn };

/** Traduit une clé « admin.… » avec les vrais dictionnaires, comme I18nService.t. */
export function translate(
  lang: Lang,
  path: string,
  vars: Record<string, string | number> = {},
): string {
  const value = path
    .replace(/^admin\./, '')
    .split('.')
    .reduce<unknown>((d, k) => (d as Record<string, unknown> | undefined)?.[k], ADMIN[lang]);
  if (typeof value !== 'string') return path;
  return value.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** I18nService de test : dictionnaires de l'administration chargés d'avance, sans HTTP. */
export function provideTestI18n(lang: Lang = 'fr') {
  const current = signal<Lang>(lang);
  return {
    provide: I18nService,
    useValue: {
      lang: current,
      falc: signal(false),
      t: (path: string, vars?: Record<string, string | number>) => translate(current(), path, vars),
      text: (value: LocalizedText | null | undefined) =>
        value ? value[current()] || value.fr : '',
      setLang: async (l: Lang) => current.set(l),
    } as Partial<I18nService>,
  };
}
