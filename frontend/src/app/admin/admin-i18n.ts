import { inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import type { LocalizedText } from '../core/models';

/**
 * Traduction des textes de l'administration (public/i18n/admin.<langue>.json).
 * Usage dans un composant : `protected readonly t = adminT();` puis `{{ t('nav.dashboard') }}`.
 */
export function adminT(): (key: string, vars?: Record<string, string | number>) => string {
  const i18n = inject(I18nService);
  return (key, vars) => i18n.t(`admin.${key}`, vars);
}

/** Texte du contenu dans la langue de l'interface (repli sur le français). */
export function adminText(): (value: LocalizedText | null | undefined) => string {
  const i18n = inject(I18nService);
  return (value) => (value ? value[i18n.lang()] || value.fr : '');
}
