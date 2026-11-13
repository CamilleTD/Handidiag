import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTestI18n } from '../../../testing/i18n';
import { ContentService } from '../../core/content.service';
import { AdminApi, ApiError, QuestionnaireDetail } from '../admin-api.service';
import { BuilderStore, LOCK_HEARTBEAT_MS } from './builder.store';

const detail = (title = 'RQTH'): QuestionnaireDetail => ({
  id: 7,
  key: 'rqth',
  title: { fr: title, en: '' },
  description: null,
  featured: false,
  sections: [],
  outcomes: [],
  rules: [],
  published: null,
  has_changes: true,
});
const locked = (user: string) =>
  new ApiError(`${user} est en train de modifier ce questionnaire.`, 'questionnaire_locked', {
    user,
  });

describe('BuilderStore : verrou de modification', () => {
  let store: BuilderStore;
  let api: {
    lock: ReturnType<typeof vi.fn>;
    unlock: ReturnType<typeof vi.fn>;
    unlockOnExit: ReturnType<typeof vi.fn>;
    questionnaire: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      lock: vi.fn().mockResolvedValue({ by: 'admin', until: '', mine: true }),
      unlock: vi.fn().mockResolvedValue(undefined),
      unlockOnExit: vi.fn(),
      questionnaire: vi.fn().mockResolvedValue(detail()),
    };
    TestBed.configureTestingModule({
      providers: [
        BuilderStore,
        provideTestI18n('fr'),
        { provide: AdminApi, useValue: api },
        { provide: ContentService, useValue: { load: vi.fn() } },
        { provide: LOCK_HEARTBEAT_MS, useValue: 1000 },
      ],
    });
    store = TestBed.inject(BuilderStore);
    store.detail.set(detail());
  });

  afterEach(() => {
    store.release();
    vi.useRealTimers();
  });

  it('prend le verrou à l’ouverture puis le renouvelle régulièrement', async () => {
    await store.startEditing(7);
    expect(api.lock).toHaveBeenCalledWith(7, false);
    expect(store.readOnly()).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    expect(api.lock).toHaveBeenCalledTimes(4);
  });

  it('passe en lecture seule si quelqu’un d’autre modifie', async () => {
    api.lock.mockRejectedValue(locked('camille'));
    await store.startEditing(7);
    expect(store.readOnly()).toBe(true);
    expect(store.lockedBy()).toBe('camille');
    // Pas de message d'erreur à l'ouverture : le bandeau suffit
    expect(store.failed()).toBe(false);
  });

  it('en lecture seule, suit les modifications de l’autre puis reprend la main quand il part', async () => {
    api.lock.mockRejectedValue(locked('camille'));
    await store.startEditing(7);

    api.questionnaire.mockResolvedValue(detail('Titre changé par camille'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.detail()?.title.fr).toBe('Titre changé par camille');
    expect(store.readOnly()).toBe(true);

    api.lock.mockResolvedValue({ by: 'admin', until: '', mine: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.readOnly()).toBe(false);
    expect(store.message()).toBe(
      'Le questionnaire est libre : vous pouvez de nouveau le modifier.',
    );
  });

  it('prévient quand quelqu’un prend la main pendant qu’on modifie', async () => {
    await store.startEditing(7);
    api.lock.mockRejectedValue(locked('camille'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.readOnly()).toBe(true);
    expect(store.failed()).toBe(true);
    expect(store.message()).toBe('camille a pris la main : vous êtes en lecture seule.');
  });

  it('une erreur réseau ne fait pas passer en lecture seule', async () => {
    await store.startEditing(7);
    api.lock.mockRejectedValue(new ApiError('Serveur injoignable.'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.readOnly()).toBe(false);
  });

  it('« Prendre la main » force le verrou', async () => {
    api.lock.mockRejectedValueOnce(locked('camille'));
    await store.startEditing(7);
    await store.takeOver();
    expect(api.lock).toHaveBeenLastCalledWith(7, true);
    expect(store.readOnly()).toBe(false);
  });

  it('une modification refusée pour cause de verrou passe en lecture seule', async () => {
    await store.startEditing(7);
    api.questionnaire.mockRejectedValue(locked('camille'));
    const accepted = await store.change('post', '/sections', { title: { fr: 'x' } });
    expect(accepted).toBe(false);
    expect(store.lockedBy()).toBe('camille');
  });

  it('rend le verrou en quittant et arrête les renouvellements', async () => {
    await store.startEditing(7);
    store.ngOnDestroy();
    expect(api.unlock).toHaveBeenCalledWith(7);
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.lock).toHaveBeenCalledTimes(1);
  });

  it('ne rend pas un verrou qu’on ne tient pas', async () => {
    api.lock.mockRejectedValue(locked('camille'));
    await store.startEditing(7);
    store.ngOnDestroy();
    store.releaseOnExit();
    expect(api.unlock).not.toHaveBeenCalled();
    expect(api.unlockOnExit).not.toHaveBeenCalled();
  });

  it('rend le verrou à la fermeture de l’onglet', async () => {
    await store.startEditing(7);
    store.releaseOnExit();
    expect(api.unlockOnExit).toHaveBeenCalledWith(7);
  });
});
