import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ContentService } from '../../core/content.service';
import { I18nService } from '../../core/i18n.service';
import type { ContentPage } from '../../core/models';
import { PageTitleStrategy } from '../../core/page-title.strategy';
import { IconComponent } from '../../shared/icon.component';

/** Rubrique « S'informer » : pages thématiques rédigées dans l'administration. */
@Component({
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info.page.html',
})
export class InfoPage {
  protected readonly i18n = inject(I18nService);
  protected readonly content = inject(ContentService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly titles = inject(PageTitleStrategy);

  readonly slug = input<string>();
  protected readonly page = signal<ContentPage | null>(null);
  protected readonly missing = signal(false);
  protected readonly pages = computed(() => this.content.content().pages);

  constructor() {
    effect(() => {
      const slug = this.slug();
      const first = this.pages()[0]?.slug;
      if (!slug) {
        if (first) void this.router.navigate(['/info', first], { replaceUrl: true });
        else this.missing.set(true);
        return;
      }
      void this.load(slug);
    });
    effect(() => {
      const page = this.page();
      if (page) this.titles.prefix.set(this.i18n.text(page.title));
    });
  }

  private async load(slug: string): Promise<void> {
    this.missing.set(false);
    try {
      this.page.set(await firstValueFrom(this.http.get<ContentPage>(`/api/pages/${slug}`)));
    } catch {
      this.page.set(null);
      this.missing.set(true);
    }
  }
}
