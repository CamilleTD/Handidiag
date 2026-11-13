import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import type { Contact } from '../../core/models';
import { MedalComponent } from '../medal/medal.component';

/** Carte d'interlocuteur (à placer dans une liste <ul class="cards">). */
@Component({
  selector: 'li[appContactCard]',
  imports: [MedalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-card.component.html',
  styleUrl: './contact-card.component.scss',
})
export class ContactCardComponent {
  protected readonly i18n = inject(I18nService);
  readonly contact = input.required<Contact>({ alias: 'appContactCard' });
}
