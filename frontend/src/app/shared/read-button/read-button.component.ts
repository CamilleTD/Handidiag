import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { ReadPart, VoiceService } from '../../core/voice.service';
import { IconComponent } from '../icon/icon.component';

/** Bouton « Lire à voix haute » / « Arrêter la lecture ». Absent si le navigateur ne sait pas lire. */
@Component({
  selector: 'app-read-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './read-button.component.html',
  styleUrl: './read-button.component.scss',
})
export class ReadButtonComponent {
  protected readonly voice = inject(VoiceService);
  protected readonly i18n = inject(I18nService);
  /** Identifiant unique de la lecture (un seul passage lu à la fois). */
  readonly id = input.required<string>();
  readonly label = input('ui.read_page');
  readonly parts = input.required<() => ReadPart[]>();
  /** Le texte reflète des réponses personnelles : voix locale par défaut. */
  readonly allowOnline = input(true);
  protected readonly reading = computed(() => this.voice.active() === this.id());

  protected toggle(): void {
    this.voice.toggle(this.id(), this.parts()(), this.allowOnline());
  }
}
