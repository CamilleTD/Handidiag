import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  Condition,
  Contact,
  ContentPage,
  Level,
  LocalizedText,
  Question,
  Resource,
  ResourceSection,
  Rule,
} from '../core/models';

export interface Admin {
  username: string;
  must_change_password: boolean;
}
export interface AdminQuestion extends Question {
  id: number;
  position: number;
}
export interface AdminRule extends Rule {
  id: number;
  position: number;
}
export interface AdminLevel extends Level {
  id: number;
  position: number;
}
export interface AdminTextItem {
  id: number;
  position: number;
  key: string;
  text: LocalizedText;
}
export interface AdminContact extends Contact {
  id: number;
  position: number;
  profiles: string[];
}
export interface PoleOutcome {
  key: 'followed' | 'suggest' | 'maybe' | 'none' | 'declined';
  title: LocalizedText;
  body: LocalizedText;
}
type Masked = number | string;
export interface Stats {
  k: number;
  disabled: boolean;
  totals: { starts: Masked; completes: Masked; completion_rate: number | null; deep: Masked };
  by_level: Record<string, Masked>;
  by_profile: Record<string, Masked>;
  by_lang: Record<string, Masked>;
  documents: Record<string, Masked>;
  daily: { date: string; start: Masked; complete: Masked }[];
}

export interface AdminResource extends Resource {
  id: number;
  position: number;
  is_published: boolean;
}
export interface AdminPage extends ContentPage {
  id: number;
  position: number;
  is_published: boolean;
}

export type Collection =
  'questions' | 'rules' | 'levels' | 'flags' | 'suggestions' | 'contacts' | 'resources' | 'pages';
export type Payload<T> = Omit<T, 'id' | 'position' | 'updated_at'>;
export type { Condition };

const API = '/api';

/** Appels de l'administration. Les erreurs sont converties en message lisible. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  readonly admin = signal<Admin | null>(null);

  private async call<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  }

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
      firstValueFrom(this.http.post<Admin>(`${API}/auth/login`, { username, password })),
    );
    this.admin.set(admin);
    return admin;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${API}/auth/logout`, {})).catch(() => undefined);
    this.admin.set(null);
  }

  async changePassword(current: string, next: string): Promise<void> {
    await this.call(firstValueFrom(this.http.post(`${API}/auth/password`, { current, new: next })));
    this.admin.update((a) => (a ? { ...a, must_change_password: false } : a));
  }

  list<T>(collection: Collection): Promise<T[]> {
    return this.call(firstValueFrom(this.http.get<T[]>(`${API}/admin/${collection}`)));
  }

  create<T>(collection: Collection, body: unknown): Promise<T> {
    return this.call(firstValueFrom(this.http.post<T>(`${API}/admin/${collection}`, body)));
  }

  update<T>(collection: Collection, id: number, body: unknown): Promise<T> {
    return this.call(firstValueFrom(this.http.put<T>(`${API}/admin/${collection}/${id}`, body)));
  }

  remove(collection: Collection, id: number): Promise<unknown> {
    return this.call(firstValueFrom(this.http.delete(`${API}/admin/${collection}/${id}`)));
  }

  reorder(collection: Collection, ids: number[]): Promise<unknown> {
    return this.call(firstValueFrom(this.http.post(`${API}/admin/${collection}/reorder`, { ids })));
  }

  /** Les ressources se réordonnent rubrique par rubrique. */
  reorderResources(section: ResourceSection, ids: number[]): Promise<unknown> {
    return this.call(
      firstValueFrom(this.http.post(`${API}/admin/resources/reorder/${section}`, { ids })),
    );
  }

  poleOutcomes(): Promise<PoleOutcome[]> {
    return this.call(firstValueFrom(this.http.get<PoleOutcome[]>(`${API}/admin/pole-outcomes`)));
  }

  savePoleOutcome(outcome: PoleOutcome): Promise<PoleOutcome> {
    const { key, ...body } = outcome;
    return this.call(
      firstValueFrom(this.http.put<PoleOutcome>(`${API}/admin/pole-outcomes/${key}`, body)),
    );
  }

  profileContacts(): Promise<Record<string, string[]>> {
    return this.call(
      firstValueFrom(this.http.get<Record<string, string[]>>(`${API}/admin/profile-contacts`)),
    );
  }

  orderProfileContacts(profile: string, keys: string[]): Promise<unknown> {
    return this.call(
      firstValueFrom(this.http.put(`${API}/admin/profile-contacts/${profile}`, keys)),
    );
  }

  stats(): Promise<Stats> {
    return this.call(firstValueFrom(this.http.get<Stats>(`${API}/admin/stats`)));
  }

  addDemoStats(): Promise<unknown> {
    return this.call(firstValueFrom(this.http.post(`${API}/admin/stats/demo`, {})));
  }

  resetStats(): Promise<unknown> {
    return this.call(firstValueFrom(this.http.delete(`${API}/admin/stats`)));
  }
}

function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Erreur inattendue.';
  if (error.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';
  const detail = error.error?.detail;
  if (typeof detail === 'string') return detail;
  // Erreurs de validation Pydantic : liste de { loc, msg }
  if (Array.isArray(detail))
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) =>
        [d.loc?.filter((l) => l !== 'body').join(' › '), d.msg].filter(Boolean).join(' : '),
      )
      .join(' ; ');
  return `Erreur ${error.status}.`;
}
