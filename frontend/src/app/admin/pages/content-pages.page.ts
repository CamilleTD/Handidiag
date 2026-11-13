import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, AdminPage } from '../admin-api.service';

@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>Pages « S'informer »</h1>
      <a class="btn btn-primary" routerLink="/admin/pages/new"
        ><app-icon name="plus" /> Nouvelle page</a
      >
    </div>
    <p class="hint">L'ordre ci-dessous est celui du menu de la rubrique « S'informer ».</p>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    <ol class="item-list">
      @for (page of pages(); track page.id; let first = $first; let last = $last) {
        <li class="item">
          <div>
            <p class="item-title">
              <a [routerLink]="['/admin/pages', page.id]">{{ page.title.fr }}</a>
            </p>
            <div class="item-meta">
              <span class="key">/info/{{ page.slug }}</span>
              <span class="tag is-quiet">{{ page.blocks.length }} bloc(s)</span>
              @if (!page.is_published) {
                <span class="tag is-sun">Brouillon</span>
              }
              @if (!page.title.en) {
                <span class="tag is-sun">Anglais manquant</span>
              }
            </div>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="'Monter ' + page.slug"
              [disabled]="busy() || first"
              (click)="move(page, -1)"
            >
              <app-icon name="up" />
            </button>
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="'Descendre ' + page.slug"
              [disabled]="busy() || last"
              (click)="move(page, 1)"
            >
              <app-icon name="down" />
            </button>
          </div>
        </li>
      }
    </ol>
  `,
})
export class ContentPagesPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected readonly pages = signal<AdminPage[]>([]);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    this.api.list<AdminPage>('pages').then(
      (pages) => this.pages.set(pages),
      (error: Error) => this.fail(error),
    );
  }

  protected async move(page: AdminPage, delta: number): Promise<void> {
    const list = [...this.pages()];
    const index = list.findIndex((p) => p.id === page.id);
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this.busy.set(true);
    try {
      await this.api.reorder(
        'pages',
        list.map((p) => p.id),
      );
      this.pages.set(list);
      this.failed.set(false);
      this.message.set(`« ${page.title.fr} » déplacée.`);
      void this.content.load();
    } catch (error) {
      this.fail(error as Error);
    } finally {
      this.busy.set(false);
    }
  }

  private fail(error: Error): void {
    this.failed.set(true);
    this.message.set(error.message);
  }
}
