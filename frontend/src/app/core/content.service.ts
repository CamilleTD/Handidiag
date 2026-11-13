import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Contact, Content, StaticLinks } from './models';

/** Contenu publié (questionnaire, règles, restitution) et liens statiques. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly data = signal<Content | null>(null);
  private readonly staticLinks = signal<StaticLinks | null>(null);

  readonly content = computed(() => {
    const data = this.data();
    if (!data) throw new Error('Contenu non chargé');
    return data;
  });
  readonly links = computed(() => {
    const links = this.staticLinks();
    if (!links) throw new Error('Liens non chargés');
    return links;
  });
  readonly contacts = computed(
    () => new Map<string, Contact>(this.content().contacts.map((c) => [c.key, c])),
  );

  async load(): Promise<void> {
    const [content, links] = await Promise.all([
      firstValueFrom(this.http.get<Content>('/api/content')),
      firstValueFrom(this.http.get<StaticLinks>('/data/links.json')),
    ]);
    this.data.set(content);
    this.staticLinks.set(links);
  }

  officialUrl(id: string): string | undefined {
    return this.links().official_links.find((l) => l.id === id)?.url;
  }
}
