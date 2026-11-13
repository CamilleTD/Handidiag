import { describe, expect, it } from 'vitest';
import adminEn from '../../../public/i18n/admin.en.json';
import adminFr from '../../../public/i18n/admin.fr.json';
import en from '../../../public/i18n/en.json';
import fr from '../../../public/i18n/fr.json';

/** Chemins de toutes les feuilles d'un dictionnaire (ex. « admin.nav.dashboard »). */
function keys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('dictionnaires', () => {
  it('l’interface publique a les mêmes textes en français et en anglais', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('l’administration a les mêmes textes en français et en anglais', () => {
    expect(keys(adminEn).sort()).toEqual(keys(adminFr).sort());
  });

  it('les variables {…} sont les mêmes dans les deux langues', () => {
    const vars = (s: unknown) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const lookup = (dict: unknown, path: string) =>
      path.split('.').reduce<unknown>((d, k) => (d as Record<string, unknown>)?.[k], dict);
    for (const [frDict, enDict] of [
      [fr, en],
      [adminFr, adminEn],
    ]) {
      for (const path of keys(frDict))
        expect(vars(lookup(enDict, path)), path).toEqual(vars(lookup(frDict, path)));
    }
  });
});
