import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/content.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AdminApi, PageRow } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';

@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-pages.page.html',
  styleUrl: './content-pages.page.scss',
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
