import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { ReadPart, VoiceService } from '../core/voice.service';
import { IconComponent } from './icon.component';

/** Bouton « Lire à voix haute » / « Arrêter la lecture ». Absent si le navigateur ne sait pas lire. */
@Component({
  selector: 'app-read-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (voice.available) {
      <p class="read-row">
        <button
          type="button"
          class="btn btn-quiet btn-small"
          [attr.aria-pressed]="reading()"
          (click)="toggle()"
        >
          <app-icon [name]="reading() ? 'stop' : 'speaker'" />
          {{ i18n.t(reading() ? 'quiz.stop_reading' : label()) }}
        </button>
      </p>
    }
  `,
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
