import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { LocalizedText } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, QuestionnaireRow } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';
import { LocalizedFieldComponent } from '../components/localized-field.component';

/** Banque de questionnaires : liste, ordre sur l'accueil, création. */
@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>{{ t('questionnaires.title') }}</h1>
      @if (!creating()) {
        <button type="button" class="btn btn-primary" (click)="creating.set(true)">
          <app-icon name="plus" /> {{ t('questionnaires.new') }}
        </button>
      }
    </div>
    <p class="hint">{{ t('questionnaires.intro') }}</p>

    @if (creating()) {
      <form class="form-section" (submit)="$event.preventDefault(); create()" novalidate>
        <h2>{{ t('questionnaires.new') }}</h2>
        <div class="form-grid">
          <div class="field">
            <label for="qn-key">{{ t('common.key') }}</label>
            <input
              id="qn-key"
              class="text-input key"
              aria-describedby="qn-key-hint"
              [value]="key()"
              (input)="key.set($any($event.target).value)"
            />
            <p id="qn-key-hint" class="hint">{{ t('questionnaires.key_hint') }}</p>
          </div>
          <app-localized-field
            [label]="t('questionnaires.name')"
            [required]="true"
            [value]="title()"
            (valueChange)="title.set($event)"
          />
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            {{ t('questionnaires.create') }}
          </button>
          <button type="button" class="btn btn-quiet" (click)="creating.set(false)">
            {{ t('common.cancel') }}
          </button>
        </div>
      </form>
    }

    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    <ol class="item-list">
      @for (q of rows(); track q.id; let i = $index; let first = $first; let last = $last) {
        <li class="item">
          <div>
            <p class="item-title">
              <a [routerLink]="['/admin/questionnaires', q.id]">{{ text(q.title) }}</a>
            </p>
            @if (q.description) {
              <p>{{ text(q.description) }}</p>
            }
            <div class="item-meta">
              <span class="key">{{ q.key }}</span>
              @if (q.featured) {
                <span class="tag">{{ t('questionnaires.featured') }}</span>
              }
              @if (q.published; as p) {
                <span class="tag is-quiet">{{ t('builder.published_v', { n: p.number }) }}</span>
              } @else {
                <span class="tag is-sun">{{ t('builder.not_published') }}</span>
              }
              @if (q.has_changes && q.published) {
                <span class="tag is-sun">{{ t('builder.unpublished_changes') }}</span>
              }
              <span class="tag is-quiet">{{
                t('questionnaires.stats', { q: q.questions, r: q.rules, o: q.outcomes })
              }}</span>
            </div>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="t('common.move_up') + ' : ' + q.key"
              [disabled]="busy() || first"
              (click)="move(i, -1)"
            >
              <app-icon name="up" />
            </button>
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="t('common.move_down') + ' : ' + q.key"
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
export class QuestionnairesPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly rows = signal<QuestionnaireRow[]>([]);
  protected readonly creating = signal(false);
  protected readonly key = signal('');
  protected readonly title = signal<LocalizedText | null>(null);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.rows.set(await this.api.questionnaires());
    } catch (error) {
      this.fail(error);
    }
  }

  protected async create(): Promise<void> {
    this.busy.set(true);
    try {
      const created = await this.api.createQuestionnaire({ key: this.key(), title: this.title() });
      void this.router.navigate(['/admin/questionnaires', created.id]);
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }

  protected async move(index: number, delta: number): Promise<void> {
    const list = [...this.rows()];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this.busy.set(true);
    try {
      await this.api.reorderQuestionnaires(list.map((q) => q.id));
      this.rows.set(list);
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
