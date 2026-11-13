import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import type { Question } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, AdminQuestion, AdminRule } from '../admin-api.service';
import { describe } from '../conditions';

@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>Règles d'orientation</h1>
      <a class="btn btn-primary" routerLink="/admin/rules/new"
        ><app-icon name="plus" /> Nouvelle règle</a
      >
    </div>
    <p class="hint">
      Chaque règle dont la condition est vraie ajoute ses points, ses points d'attention et ses
      pistes. Le total est comparé aux seuils des niveaux ; la première règle qui impose un niveau
      l'emporte.
    </p>
    <div class="toolbar">
      <label class="sr-only" for="r-filter">Filtrer les règles</label>
      <input
        id="r-filter"
        class="text-input"
        type="search"
        placeholder="Filtrer (clé, question, texte)…"
        (input)="filter.set(value($event))"
      />
      <span class="hint">{{ shown().length }} règle(s)</span>
    </div>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    <ol class="item-list">
      @for (rule of shown(); track rule.id) {
        <li class="item">
          <div>
            <p class="item-title">
              <a [routerLink]="['/admin/rules', rule.id]">{{ rule.key }}</a>
            </p>
            <p class="condition-summary">Si {{ summary(rule) }}</p>
            @if (rule.explanation) {
              <p>« {{ rule.explanation.fr }} »</p>
            }
            <div class="item-meta">
              @if (rule.points) {
                <span class="tag">{{ rule.points > 0 ? '+' : '' }}{{ rule.points }} pt</span>
              }
              @if (rule.override_level) {
                <span class="tag is-sun">Impose « {{ rule.override_level }} »</span>
              }
              @if (rule.pole_outcome) {
                <span class="tag is-sun">Pôle : {{ rule.pole_outcome }}</span>
              }
              @if (rule.flags.length) {
                <span class="tag is-quiet">{{ rule.flags.length }} point(s) d'attention</span>
              }
              @if (rule.suggestions.length) {
                <span class="tag is-quiet">{{ rule.suggestions.length }} piste(s)</span>
              }
            </div>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="'Monter ' + rule.key"
              [disabled]="busy() || !!filter() || rule.id === rules()[0]?.id"
              (click)="move(rule, -1)"
            >
              <app-icon name="up" />
            </button>
            <button
              type="button"
              class="btn btn-small btn-quiet"
              [attr.aria-label]="'Descendre ' + rule.key"
              [disabled]="busy() || !!filter() || rule.id === rules().at(-1)?.id"
              (click)="move(rule, 1)"
            >
              <app-icon name="down" />
            </button>
          </div>
        </li>
      }
    </ol>
  `,
})
export class RulesPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected readonly rules = signal<AdminRule[]>([]);
  private readonly questions = signal<Question[]>([]);
  protected readonly filter = signal('');
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  protected readonly shown = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    if (!needle) return this.rules();
    return this.rules().filter((r) =>
      [r.key, r.explanation?.fr ?? '', JSON.stringify(r.condition)].some((t) =>
        t.toLowerCase().includes(needle),
      ),
    );
  });

  constructor() {
    void this.load();
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected summary(rule: AdminRule): string {
    return describe(rule.condition, this.questions());
  }

  protected async move(rule: AdminRule, delta: number): Promise<void> {
    const list = [...this.rules()];
    const index = list.findIndex((r) => r.id === rule.id);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.busy.set(true);
    try {
      await this.api.reorder(
        'rules',
        list.map((r) => r.id),
      );
      this.rules.set(list);
      this.failed.set(false);
      this.message.set(`« ${rule.key} » déplacée.`);
      void this.content.load();
    } catch (error) {
      this.failed.set(true);
      this.message.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const [rules, questions] = await Promise.all([
        this.api.list<AdminRule>('rules'),
        this.api.list<AdminQuestion>('questions'),
      ]);
      this.rules.set(rules);
      this.questions.set(questions);
    } catch (error) {
      this.failed.set(true);
      this.message.set((error as Error).message);
    }
  }
}
