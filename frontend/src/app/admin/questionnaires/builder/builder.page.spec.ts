import { CUSTOM_ELEMENTS_SCHEMA, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTestI18n } from '../../../../testing/i18n';
import { AdminApi, QuestionnaireDetail } from '../../admin-api.service';
import { BuilderStore } from '../builder.store';
import { BuilderPage } from './builder.page';

const detail: QuestionnaireDetail = {
  id: 7,
  key: 'rqth',
  title: { fr: 'RQTH', en: '' },
  description: null,
  featured: false,
  sections: [],
  outcomes: [],
  rules: [],
  published: null,
  has_changes: true,
};

/** Store minimal : on teste ici l'affichage, la logique du verrou est testée dans le store. */
function fakeStore() {
  const lockedBy = signal<string | null>(null);
  return {
    detail: signal<QuestionnaireDetail | null>(detail),
    message: signal(''),
    failed: signal(false),
    busy: signal(false),
    lockedBy,
    readOnly: computed(() => lockedBy() !== null),
    load: vi.fn().mockResolvedValue(undefined),
    startEditing: vi.fn().mockResolvedValue(undefined),
    takeOver: vi.fn().mockResolvedValue(undefined),
    releaseOnExit: vi.fn(),
    change: vi.fn(),
  };
}

describe('BuilderPage : lecture seule', () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(() => {
    store = fakeStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTestI18n('fr'),
        { provide: AdminApi, useValue: { versions: vi.fn().mockResolvedValue([]) } },
      ],
    });
    // Les onglets ont leurs propres dépendances : remplacés par des éléments vides
    TestBed.overrideComponent(BuilderPage, {
      set: {
        providers: [{ provide: BuilderStore, useValue: store }],
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(BuilderPage);
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('prend le verrou à l’ouverture', async () => {
    await render();
    expect(store.load).toHaveBeenCalledWith(7);
    await vi.waitFor(() => expect(store.startEditing).toHaveBeenCalledWith(7));
  });

  it('modifiable : pas de bandeau, champs actifs', async () => {
    const { element } = await render();
    expect(element.querySelector('.lock-banner')).toBeNull();
    expect(element.querySelector<HTMLFieldSetElement>('fieldset.bare')!.disabled).toBe(false);
  });

  it('verrouillé par un autre : bandeau, tout désactivé, possibilité de prendre la main', async () => {
    store.lockedBy.set('camille');
    const { element } = await render();
    const banner = element.querySelector('.lock-banner')!;
    expect(banner.textContent).toContain(
      'camille est en train de modifier ce questionnaire : vous êtes en lecture seule.',
    );
    expect(element.querySelector<HTMLFieldSetElement>('fieldset.bare')!.disabled).toBe(true);
    const publish = [...element.querySelectorAll<HTMLButtonElement>('.publish-bar button')].find(
      (b) => b.textContent!.includes('Publier'),
    )!;
    expect(publish.disabled).toBe(true);

    banner.querySelector('button')!.click();
    expect(store.takeOver).toHaveBeenCalled();
  });

  it('rend le verrou quand l’onglet se ferme', async () => {
    await render();
    window.dispatchEvent(new Event('pagehide'));
    expect(store.releaseOnExit).toHaveBeenCalled();
  });
});
