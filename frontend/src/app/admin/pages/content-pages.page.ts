import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, PageRow } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';

@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>{{ t('pages.title') }}</h1>
      <a class="btn btn-primary" routerLink="/admin/pages/new">
        <app-icon name="plus" /> {{ t('pages.new') }}
      </a>
    </div>
    <p class="hint">{{ t('pages.intro') }}</p>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    <ol class="item-list">
      @for (page of pages(); track page.id; let i = $index; let first = $first; let last = $last) {
        <li class="item">
          <div>
            <p class="item-title">
              <a [routerLink]="['/admin/pages', page.id]">{{ text(page.title) }}</a>
            </p>
            <div class="item-meta">
              <span class="key">/info/{{ page.slug }}</span>
              <span class="tag is-quiet">{{ t('pages.n_blocks', { n: page.blocks.length }) }}</span>
              @if (!page.is_published) {
                <span class="tag is-sun">{{ t('pages.draft') }}</span>
              }
              @if (!page.title.en) {
                <span class="tag is-sun">{{ t('common.missing_en') }}</span>
              }
            </div>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="t('common.move_up') + ' : ' + page.slug"
              [disabled]="busy() || first"
              (click)="move(i, -1)"
            >
              <app-icon name="up" />
            </button>
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="t('common.move_down') + ' : ' + page.slug"
              [disabled]="busy() || last"
              (click)="move(i, 1)"
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
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly pages = signal<PageRow[]>([]);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    this.api.list<PageRow>('pages').then(
      (pages) => this.pages.set(pages),
      (error: Error) => this.fail(error),
    );
  }

  protected async move(index: number, delta: number): Promise<void> {
    const list = [...this.pages()];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this.busy.set(true);
    try {
      await this.api.reorder(
        'pages',
        list.map((p) => p.id),
      );
      this.pages.set(list);
      this.failed.set(false);
      this.message.set(this.t('common.moved', { key: list[index + delta].slug }));
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
