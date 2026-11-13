import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Content, Resource, ResourceSection } from './models';

/** Contenu publié : liste des questionnaires, ressources, pages, interlocuteurs de l'école. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly data = signal<Content | null>(null);

  readonly content = computed(() => {
    const data = this.data();
    if (!data) throw new Error('Contenu non chargé');
    return data;
  });
  /** Questionnaire mis en avant sur l'accueil (à défaut, le premier publié). */
  readonly featured = computed(
    () => this.content().questionnaires.find((q) => q.featured) ?? this.content().questionnaires[0],
  );

  async load(): Promise<void> {
    this.data.set(await firstValueFrom(this.http.get<Content>('/api/content')));
  }

  resources(section: ResourceSection): Resource[] {
    return this.content().resources.filter((r) => r.section === section);
  }
}
