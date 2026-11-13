import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTestI18n, translate } from '../../../../testing/i18n';
import { AdminApi } from '../../admin-api.service';
import { RepublishPanelComponent, summary } from './republish-panel.component';

const t = (key: string, vars?: Record<string, string | number>) =>
  translate('fr', `admin.${key}`, vars);

describe('compte rendu de republication', () => {
  it('liste les questionnaires republiés et ceux laissés de côté', () => {
    expect(
      summary(
        { published: ['rqth'], unchanged: ['pole'], locked: [{ key: 'stage', by: 'camille' }] },
        t,
      ),
    ).toBe('Republiés : rqth. Non republiés car en cours de modification : stage (camille).');
  });

  it('dit quand il n’y avait rien à faire', () => {
    expect(summary({ published: [], unchanged: ['rqth'], locked: [] }, t)).toBe(
      'Aucun questionnaire publié à mettre à jour.',
    );
  });
});

describe('RepublishPanelComponent', () => {
  const republish = vi.fn();

  beforeEach(() => {
    republish.mockReset();
    TestBed.configureTestingModule({
      providers: [provideTestI18n('fr'), { provide: AdminApi, useValue: { republish } }],
    });
  });

  function render(keys: string[]) {
    const fixture = TestBed.createComponent(RepublishPanelComponent);
    fixture.componentRef.setInput('keys', keys);
    fixture.detectChanges();
    return fixture;
  }

  it('republie d’un clic les questionnaires concernés', async () => {
    republish.mockResolvedValue({ published: ['rqth', 'pole'], unchanged: [], locked: [] });
    const fixture = render(['rqth', 'pole']);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Questionnaires publiés concernés : rqth, pole.');

    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    element.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(republish).toHaveBeenCalledWith(['rqth', 'pole']);
    expect(done).toHaveBeenCalled();
    const status = element.querySelector('[role=status]')!;
    expect(status.textContent).toContain('Republiés : rqth, pole.');
    expect(status.classList).not.toContain('is-error');
  });

  it('affiche l’erreur du serveur', async () => {
    republish.mockRejectedValue(new Error('« pole » ne peut pas être publié en l’état.'));
    const fixture = render(['pole']);
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    const status: HTMLElement = fixture.nativeElement.querySelector('[role=status]');
    expect(status.textContent).toContain('ne peut pas être publié');
    expect(status.classList).toContain('is-error');
  });
});
