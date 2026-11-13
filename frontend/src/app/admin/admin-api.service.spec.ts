import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideTestI18n } from '../../testing/i18n';
import { AdminApi, ApiError } from './admin-api.service';

describe('AdminApi', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestI18n('fr')],
    });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  const failure = (status: number, detail: unknown) =>
    new HttpErrorResponse({ status, error: detail === undefined ? null : { detail } });

  describe('messages d’erreur', () => {
    it('traduit le code renvoyé par le serveur, avec ses paramètres', () => {
      const error = failure(409, {
        code: 'questionnaire_locked',
        message: 'camille est en train de modifier ce questionnaire.',
        params: { user: 'camille' },
      });
      expect(api.errorMessage(error)).toBe('camille est en train de modifier ce questionnaire.');
    });

    it('garde le message du serveur pour un code inconnu de l’interface', () => {
      const error = failure(422, { code: 'brand_new', message: 'Message du serveur', params: {} });
      expect(api.errorMessage(error)).toBe('Message du serveur');
    });

    it('signale un serveur injoignable', () => {
      expect(api.errorMessage(failure(0, undefined))).toBe(
        'Serveur injoignable. Vérifiez votre connexion.',
      );
    });

    it('liste les champs refusés par la validation', () => {
      const error = failure(422, [
        { loc: ['body', 'title', 'fr'], msg: 'Field required' },
        { loc: ['body', 'key'], msg: 'String too short' },
      ]);
      const message = api.errorMessage(error);
      expect(message).toContain('title › fr : Field required');
      expect(message).toContain('key : String too short');
    });

    it('donne le statut HTTP en dernier recours', () => {
      expect(api.errorMessage(failure(500, undefined))).toBe('Erreur 500.');
    });
  });

  describe('verrou et republication', () => {
    it('transmet le code et les paramètres de l’erreur (ApiError)', async () => {
      const call = api.lock(7);
      const request = http.expectOne('/api/admin/questionnaires/7/lock');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ force: false });
      request.flush(
        { detail: { code: 'questionnaire_locked', message: '…', params: { user: 'camille' } } },
        { status: 409, statusText: 'Conflict' },
      );
      const error = await call.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('questionnaire_locked');
      expect((error as ApiError).params).toEqual({ user: 'camille' });
    });

    it('prend la main avec force', async () => {
      const call = api.lock(7, true);
      const request = http.expectOne('/api/admin/questionnaires/7/lock');
      expect(request.request.body).toEqual({ force: true });
      request.flush({ by: 'admin', until: '2026-11-13T12:00:00Z', mine: true });
      expect((await call).mine).toBe(true);
    });

    it('rend le verrou', async () => {
      const call = api.unlock(7);
      const request = http.expectOne('/api/admin/questionnaires/7/lock');
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await call;
    });

    it('republie les questionnaires demandés', async () => {
      const call = api.republish(['rqth']);
      const request = http.expectOne('/api/admin/questionnaires/republish');
      expect(request.request.body).toEqual({ keys: ['rqth'] });
      request.flush({ published: ['rqth'], unchanged: [], locked: [] });
      expect((await call).published).toEqual(['rqth']);
    });
  });
});
