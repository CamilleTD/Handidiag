import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { AdminApi, PoleOutcome } from '../admin-api.service';
import { LocalizedFieldComponent } from '../components/localized-field.component';

const DESCRIPTIONS: Record<PoleOutcome['key'], string> = {
  followed: 'La personne est déjà suivie par le pôle handicap.',
  suggest: 'Une règle indique que le pôle peut aider (prioritaire sur « maybe »).',
  maybe: 'Une règle indique que cela vaut la peine d’en parler au pôle.',
  none: 'La personne a regardé si le pôle pouvait l’aider, sans signal particulier.',
  declined: 'La personne n’a pas souhaité regarder si le pôle pouvait l’aider.',
};

/** Messages de la section « Le pôle handicap de l'école » de la restitution. */
@Component({
  selector: 'app-pole-editor',
  imports: [LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">
      Un seul message est affiché, choisi d'après les réponses à l'étape « pôle handicap » et les
      règles.
    </p>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    @for (outcome of outcomes(); track outcome.key; let i = $index) {
      <form class="form-section" (submit)="$event.preventDefault(); save(i)" novalidate>
        <h2>{{ outcome.key }}</h2>
        <p class="hint">{{ descriptions[outcome.key] }}</p>
        <div class="form-grid">
          <app-localized-field
            label="Titre"
            [required]="true"
            [value]="outcome.title"
            (valueChange)="patch(i, { title: $event! })"
          />
          <app-localized-field
            label="Message"
            [required]="true"
            [multiline]="true"
            [value]="outcome.body"
            (valueChange)="patch(i, { body: $event! })"
          />
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    }
  `,
})
export class PoleEditor implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected readonly descriptions = DESCRIPTIONS;
  protected readonly outcomes = signal<PoleOutcome[]>([]);
  protected readonly message = signal('');
  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    const order = Object.keys(DESCRIPTIONS);
    try {
      const outcomes = await this.api.poleOutcomes();
      this.outcomes.set(outcomes.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)));
    } catch (error) {
      this.fail(error);
    }
  }

  protected patch(index: number, change: Partial<PoleOutcome>): void {
    this.outcomes.update((list) => list.map((o, i) => (i === index ? { ...o, ...change } : o)));
  }

  protected async save(index: number): Promise<void> {
    try {
      await this.api.savePoleOutcome(this.outcomes()[index]);
      this.failed.set(false);
      this.message.set(`Message « ${this.outcomes()[index].key} » enregistré.`);
      void this.content.load();
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
