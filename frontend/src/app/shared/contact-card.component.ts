import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import type { Contact } from '../core/models';
import { MedalComponent } from './icon.component';

/** Carte d'interlocuteur (à placer dans une liste <ul class="cards">). */
@Component({
  selector: 'li[appContactCard]',
  imports: [MedalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = contact();
    <app-medal [name]="c.icon" />
    @if (c.is_confidential) {
      <span class="badge">{{ i18n.t('result.secret_badge') }}</span>
    }
    <h3>{{ i18n.text(c.name) }}</h3>
    <p>{{ i18n.text(c.role) }}</p>
    @if (c.email) {
      <p>
        {{ i18n.t('quiz.email_label') }} : <a [href]="'mailto:' + c.email">{{ c.email }}</a>
      </p>
    }
    @if (c.link_url) {
      <p>
        <a [href]="c.link_url" target="_blank" rel="noopener noreferrer">
          {{ i18n.text(c.link_label) || c.link_url }}
          <span class="sr-only"> {{ i18n.t('ui.new_tab') }}</span>
        </a>
      </p>
    }
  `,
})
export class ContactCardComponent {
  protected readonly i18n = inject(I18nService);
  readonly contact = input.required<Contact>({ alias: 'appContactCard' });
}
