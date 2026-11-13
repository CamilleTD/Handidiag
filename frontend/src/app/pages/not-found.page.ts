import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';

@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrow">
      <h1>{{ i18n.t('pages.not_found') }}</h1>
      <p>{{ i18n.t('ui.not_found_text') }}</p>
      <p>
        <a class="btn btn-primary" routerLink="/">{{ i18n.t('ui.nav_home') }}</a>
      </p>
    </div>
  `,
})
export class NotFoundPage {
  protected readonly i18n = inject(I18nService);
}
