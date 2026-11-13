import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Contact, Content, Resource, ResourceSection } from './models';

/** Contenu publié : questionnaire, règles, restitution, ressources et pages. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly data = signal<Content | null>(null);

  readonly content = computed(() => {
    const data = this.data();
    if (!data) throw new Error('Contenu non chargé');
    return data;
  });
  readonly contacts = computed(
    () => new Map<string, Contact>(this.content().contacts.map((c) => [c.key, c])),
  );

  async load(): Promise<void> {
    this.data.set(await firstValueFrom(this.http.get<Content>('/api/content')));
  }

  resources(section: ResourceSection): Resource[] {
    return this.content().resources.filter((r) => r.section === section);
  }
}
