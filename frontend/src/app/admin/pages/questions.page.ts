import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, AdminQuestion } from '../admin-api.service';
import { describe } from '../conditions';

@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>Questions</h1>
      <a class="btn btn-primary" routerLink="/admin/questions/new"
        ><app-icon name="plus" /> Nouvelle question</a
      >
    </div>
    <p class="hint">
      L'ordre ci-dessous est l'ordre du parcours. Une question n'est posée que si sa condition
      d'affichage est vraie. Les questions complémentaires sont proposées après les essentielles.
    </p>
    <div class="toolbar">
      <label class="sr-only" for="q-filter">Filtrer les questions</label>
      <input
        id="q-filter"
        class="text-input"
        type="search"
        placeholder="Filtrer (clé ou texte)…"
        (input)="filter.set(value($event))"
      />
    </div>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    @for (group of groups(); track group.title) {
      <h2 class="group-title">{{ group.title }} ({{ group.items.length }})</h2>
      <ol class="item-list">
        @for (q of group.items; track q.id) {
          <li class="item">
            <div>
              <p class="item-title">
                <a [routerLink]="['/admin/questions', q.id]">{{ q.text.fr }}</a>
              </p>
              <div class="item-meta">
                <span class="key">{{ q.key }}</span>
                <span class="tag is-quiet">{{
                  q.kind === 'single' ? 'Choix unique' : 'Choix multiple'
                }}</span>
                <span class="tag is-quiet">{{ q.options.length }} réponses</span>
                @if (q.step) {
                  <span class="tag is-sun">Étape {{ q.step }}</span>
                }
                @if (q.hidden) {
                  <span class="tag is-sun">Masquée : « {{ q.auto_answer }} »</span>
                }
                @if (!q.text.en) {
                  <span class="tag is-sun">Anglais manquant</span>
                }
              </div>
              @if (q.show_if) {
                <p class="condition-summary">Si {{ summary(q) }}</p>
              }
            </div>
            <div class="item-actions">
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Monter ' + q.key"
                [disabled]="busy() || isFirst(q)"
                (click)="move(q, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Descendre ' + q.key"
                [disabled]="busy() || isLast(q)"
                (click)="move(q, 1)"
              >
                <app-icon name="down" />
              </button>
            </div>
          </li>
        }
      </ol>
    }
  `,
})
export class QuestionsPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected readonly questions = signal<AdminQuestion[]>([]);
  protected readonly filter = signal('');
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  protected readonly groups = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    const shown = this.questions().filter(
      (q) =>
        !needle || q.key.toLowerCase().includes(needle) || q.text.fr.toLowerCase().includes(needle),
    );
    return [
      { title: 'Questions essentielles', items: shown.filter((q) => q.phase === 'core') },
      { title: 'Questions complémentaires', items: shown.filter((q) => q.phase === 'deep') },
    ];
  });

  constructor() {
    void this.load();
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected summary(q: AdminQuestion): string {
    return describe(q.show_if, this.questions());
  }

  protected isFirst(q: AdminQuestion): boolean {
    return this.questions()[0]?.id === q.id;
  }

  protected isLast(q: AdminQuestion): boolean {
    return this.questions().at(-1)?.id === q.id;
  }

  protected async move(question: AdminQuestion, delta: number): Promise<void> {
    const list = [...this.questions()];
    const index = list.findIndex((q) => q.id === question.id);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.busy.set(true);
    try {
      await this.api.reorder(
        'questions',
        list.map((q) => q.id),
      );
      this.questions.set(list);
      this.failed.set(false);
      this.message.set(`« ${question.key} » déplacée.`);
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
      this.questions.set(await this.api.list<AdminQuestion>('questions'));
    } catch (error) {
      this.failed.set(true);
      this.message.set((error as Error).message);
    }
  }
}
