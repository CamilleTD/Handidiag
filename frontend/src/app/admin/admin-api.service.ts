import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { I18nService } from '../core/i18n.service';
import type {
  Condition,
  Contact,
  ContentPage,
  IconName,
  LocalizedText,
  Question,
  Resource,
  ResourceSection,
} from '../core/models';

export interface Admin {
  username: string;
  must_change_password: boolean;
}

/* ------------------------------------------------------------------ bibliothèques */

export interface BankQuestion extends Question {
  id: number;
  used_in: string[];
}
export interface LibraryRule {
  id: number;
  key: string;
  condition: Condition;
  explanation: LocalizedText | null;
  flags: string[];
  suggestions: string[];
  contacts: string[];
  used_in: string[];
}
export interface TextItemRow {
  id: number;
  position: number;
  key: string;
  text: LocalizedText;
  highlight_confidential?: boolean;
}
export interface ContactRow extends Contact {
  id: number;
  position: number;
}

/* ------------------------------------------------------------------ questionnaires */

/** Verrou de modification d'un questionnaire (null : personne ne le modifie). */
export interface LockInfo {
  by: string;
  until: string;
  mine: boolean;
}
export interface RepublishResult {
  published: string[];
  unchanged: string[];
  locked: { key: string; by: string }[];
}

export interface QuestionnaireRow {
  id: number;
  key: string;
  title: LocalizedText;
  description: LocalizedText | null;
  featured: boolean;
  published: { number: number; published_at: string } | null;
  has_changes: boolean;
  questions: number;
  rules: number;
  outcomes: number;
  lock: LockInfo | null;
}
export interface ItemRow {
  id: number;
  question: string;
  required: boolean;
  show_if: Condition | null;
  auto_answer: string | null;
}
export interface SectionRow {
  id: number;
  title: LocalizedText;
  intro: LocalizedText | null;
  optional: boolean;
  items: ItemRow[];
}
export interface OutcomeRow {
  id: number;
  key: string;
  min_score: number | null;
  icon: IconName;
  title: LocalizedText;
  body: LocalizedText;
  body_falc: LocalizedText | null;
  next_questionnaire: string | null;
  contacts: string[];
}
export interface RuleUsageRow {
  id: number;
  rule: string;
  points: number;
  override_outcome: string | null;
}
export interface QuestionnaireDetail {
  id: number;
  key: string;
  title: LocalizedText;
  description: LocalizedText | null;
  featured: boolean;
  sections: SectionRow[];
  outcomes: OutcomeRow[];
  rules: RuleUsageRow[];
  published: { number: number; published_at: string } | null;
  has_changes: boolean;
}
export interface VersionRow {
  number: number;
  published_at: string;
  published_by: string | null;
}

/* ------------------------------------------------------------------ contenus, statistiques */

export interface ResourceRow extends Resource {
  id: number;
  position: number;
  is_published: boolean;
}
export interface PageRow extends ContentPage {
  id: number;
  position: number;
  is_published: boolean;
}
type Masked = number | string;
export interface Stats {
  k: number;
  disabled: boolean;
  totals: { starts: Masked; completes: Masked; completion_rate: number | null; optional: Masked };
  by_outcome: Record<string, Masked>;
  by_lang: Record<string, Masked>;
  documents: Record<string, Masked>;
  daily: { date: string; start: Masked; complete: Masked }[];
}

/** Listes simples de la bibliothèque et des contenus (CRUD homogène). */
export type Collection =
  'questions' | 'rules' | 'flags' | 'suggestions' | 'contacts' | 'resources' | 'pages';

/** Sans id ni position : ce qu'on envoie pour créer ou modifier. */
export type Payload<T> = Omit<T, 'id' | 'position' | 'used_in'>;

const API = '/api';

/** Erreur renvoyée par l'API : message traduit, plus le code et les paramètres du serveur. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null = null,
    readonly params: Record<string, string | number> = {},
  ) {
    super(message);
  }
}

/** Appels de l'administration. Les erreurs sont converties en message lisible et traduit. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  readonly admin = signal<Admin | null>(null);

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      const detail = error instanceof HttpErrorResponse ? error.error?.detail : null;
      const coded = detail && typeof detail === 'object' && 'code' in detail;
      throw new ApiError(
        this.errorMessage(error),
        coded ? detail.code : null,
        coded ? (detail.params ?? {}) : {},
      );
    }
  }

  /** Message d'erreur dans la langue de l'interface, d'après le code renvoyé par le serveur. */
  errorMessage(error: unknown): string {
    const t = (key: string, vars?: Record<string, string | number>) =>
      this.i18n.t(`admin.${key}`, vars);
    if (!(error instanceof HttpErrorResponse)) return t('errors.unexpected');
    if (error.status === 0) return t('errors.network');
    const detail = error.error?.detail;
    if (detail && typeof detail === 'object' && 'code' in detail) {
      const key = `errors.${detail.code}`;
      const translated = t(key, detail.params ?? {});
      return translated === `admin.${key}` ? detail.message : translated;
    }
    if (typeof detail === 'string') return detail;
    // Erreurs de validation des champs : liste de { loc, msg }
    if (Array.isArray(detail))
      return (
        t('errors.validation') +
        ' ' +
        detail
          .map((d: { loc?: (string | number)[]; msg?: string }) =>
            [d.loc?.filter((l) => l !== 'body').join(' › '), d.msg].filter(Boolean).join(' : '),
          )
          .join(' ; ')
      );
    return t('errors.status', { n: error.status });
  }

  /* -------------------------------------------------------------- session */

  async me(): Promise<Admin | null> {
    try {
      const admin = await firstValueFrom(this.http.get<Admin>(`${API}/auth/me`));
      this.admin.set(admin);
      return admin;
    } catch {
      this.admin.set(null);
      return null;
    }
  }

  async login(username: string, password: string): Promise<Admin> {
    const admin = await this.call(
      this.http.post<Admin>(`${API}/auth/login`, { username, password }),
    );
    this.admin.set(admin);
    return admin;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${API}/auth/logout`, {})).catch(() => undefined);
    this.admin.set(null);
  }

  async changePassword(current: string, next: string): Promise<void> {
    await this.call(this.http.post(`${API}/auth/password`, { current, new: next }));
    this.admin.update((a) => (a ? { ...a, must_change_password: false } : a));
  }

  /* -------------------------------------------------------------- listes simples */

  list<T>(collection: Collection): Promise<T[]> {
    return this.call(this.http.get<T[]>(`${API}/admin/${collection}`));
  }

  create<T>(collection: Collection, body: unknown): Promise<T> {
    return this.call(this.http.post<T>(`${API}/admin/${collection}`, body));
  }

  update<T>(collection: Collection, id: number, body: unknown): Promise<T> {
    return this.call(this.http.put<T>(`${API}/admin/${collection}/${id}`, body));
  }

  remove(collection: Collection, id: number): Promise<unknown> {
    return this.call(this.http.delete(`${API}/admin/${collection}/${id}`));
  }

  reorder(collection: Collection, ids: number[]): Promise<unknown> {
    return this.call(this.http.post(`${API}/admin/${collection}/reorder`, { ids }));
  }

  reorderResources(section: ResourceSection, ids: number[]): Promise<unknown> {
    return this.call(this.http.post(`${API}/admin/resources/reorder/${section}`, { ids }));
  }

  /* -------------------------------------------------------------- questionnaires */

  questionnaires(): Promise<QuestionnaireRow[]> {
    return this.call(this.http.get<QuestionnaireRow[]>(`${API}/admin/questionnaires`));
  }

  createQuestionnaire(body: unknown): Promise<QuestionnaireDetail> {
    return this.call(this.http.post<QuestionnaireDetail>(`${API}/admin/questionnaires`, body));
  }

  reorderQuestionnaires(ids: number[]): Promise<unknown> {
    return this.call(this.http.post(`${API}/admin/questionnaires/reorder`, { ids }));
  }

  /** Appel sur un questionnaire ; la réponse est toujours le brouillon à jour. */
  questionnaire(
    id: number,
    method: 'get' | 'post' | 'put' | 'delete' = 'get',
    path = '',
    body: unknown = {},
  ): Promise<QuestionnaireDetail> {
    const url = `${API}/admin/questionnaires/${id}${path}`;
    const request =
      method === 'get'
        ? this.http.get<QuestionnaireDetail>(url)
        : method === 'delete'
          ? this.http.delete<QuestionnaireDetail>(url)
          : method === 'post'
            ? this.http.post<QuestionnaireDetail>(url, body)
            : this.http.put<QuestionnaireDetail>(url, body);
    return this.call(request);
  }

  deleteQuestionnaire(id: number): Promise<unknown> {
    return this.call(this.http.delete(`${API}/admin/questionnaires/${id}`));
  }

  /** Prend ou renouvelle le verrou de modification ; `force` prend la main sur un autre. */
  lock(id: number, force = false): Promise<LockInfo> {
    return this.call(this.http.post<LockInfo>(`${API}/admin/questionnaires/${id}/lock`, { force }));
  }

  unlock(id: number): Promise<unknown> {
    return this.call(this.http.delete(`${API}/admin/questionnaires/${id}/lock`));
  }

  /** Rend le verrou pendant la fermeture de l'onglet (la requête survit à la page). */
  unlockOnExit(id: number): void {
    void fetch(`${API}/admin/questionnaires/${id}/lock`, {
      method: 'DELETE',
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => undefined);
  }

  /** Republie d'un coup les questionnaires publiés modifiés (tous si `keys` est absent). */
  republish(keys?: string[]): Promise<RepublishResult> {
    return this.call(
      this.http.post<RepublishResult>(`${API}/admin/questionnaires/republish`, { keys }),
    );
  }

  versions(id: number): Promise<VersionRow[]> {
    return this.call(this.http.get<VersionRow[]>(`${API}/admin/questionnaires/${id}/versions`));
  }

  /* -------------------------------------------------------------- statistiques */

  stats(questionnaire: string): Promise<Stats> {
    return this.call(this.http.get<Stats>(`${API}/admin/stats/${questionnaire}`));
  }

  addDemoStats(questionnaire: string): Promise<unknown> {
    return this.call(this.http.post(`${API}/admin/stats/${questionnaire}/demo`, {}));
  }

  resetStats(): Promise<unknown> {
    return this.call(this.http.delete(`${API}/admin/stats`));
  }
}
