import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { LocalizedText } from '../../../core/models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AdminApi, VersionRow } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';
import { BuilderStore } from '../builder.store';
import { ContentTabComponent } from '../content-tab/content-tab.component';
import { OutcomesTabComponent } from '../outcomes-tab/outcomes-tab.component';
import { RulesTabComponent } from '../rules-tab/rules-tab.component';

type Tab = 'content' | 'outcomes' | 'rules' | 'settings';

/** Constructeur d'un questionnaire : brouillon, aperçu, publication et versions. */
@Component({
  imports: [
    RouterLink,
    IconComponent,
    LocalizedFieldComponent,
    ContentTabComponent,
    OutcomesTabComponent,
    RulesTabComponent,
  ],
  providers: [BuilderStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './builder.page.html',
  styleUrl: './builder.page.scss',
})
export class BuilderPage {
  protected readonly store = inject(BuilderStore);
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  protected readonly text = adminText();
  readonly id = input.required<string>();

  protected readonly tabs: Tab[] = ['content', 'outcomes', 'rules', 'settings'];
  protected readonly tab = signal<Tab>('content');
  protected readonly confirmPublish = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly versions = signal<VersionRow[]>([]);
  protected readonly settings = signal<{
    title: LocalizedText | null;
    description: LocalizedText | null;
    featured: boolean;
  }>({ title: null, description: null, featured: false });

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(async () => {
        await this.store.load(id);
        this.syncSettings();
        await this.loadVersions();
        if (this.store.detail()) await this.store.startEditing(id);
      });
    });
  }

  /** Onglet fermé ou rechargé : rendre le verrou tout de suite plutôt qu'à son expiration. */
  @HostListener('window:pagehide')
  protected onPageHide(): void {
    this.store.releaseOnExit();
  }

  private syncSettings(): void {
    const d = this.store.detail();
    if (d) this.settings.set({ title: d.title, description: d.description, featured: d.featured });
  }

  private async loadVersions(): Promise<void> {
    const d = this.store.detail();
    if (d) this.versions.set(await this.api.versions(d.id).catch(() => []));
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleString(this.t('locale'), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected step(delta: number): void {
    const index = this.tabs.indexOf(this.tab());
    const next = this.tabs[(index + delta + this.tabs.length) % this.tabs.length];
    this.tab.set(next);
    queueMicrotask(() => document.getElementById(`tab-${next}`)?.focus());
  }

  protected async publish(): Promise<void> {
    this.confirmPublish.set(false);
    if (await this.store.change('post', '/publish', {}, this.t('builder.published_ok')))
      await this.loadVersions();
  }

  protected async unpublish(): Promise<void> {
    await this.store.change('post', '/unpublish', {}, this.t('builder.unpublished_ok'));
  }

  protected async restore(number: number): Promise<void> {
    await this.store.change(
      'post',
      `/versions/${number}/restore`,
      {},
      this.t('builder.restored', { n: number }),
    );
  }

  protected async saveSettings(): Promise<void> {
    const d = this.store.detail();
    if (!d) return;
    await this.store.change('put', '', { key: d.key, ...this.settings() });
    this.syncSettings();
  }

  protected async remove(): Promise<void> {
    const d = this.store.detail();
    if (!d) return;
    try {
      await this.api.deleteQuestionnaire(d.id);
      void this.router.navigateByUrl('/admin/questionnaires');
    } catch (error) {
      this.store.failed.set(true);
      this.store.message.set((error as Error).message);
    }
  }
}
