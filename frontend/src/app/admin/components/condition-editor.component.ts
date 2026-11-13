import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import type { Condition, Question } from '../../core/models';
import { LeafOperator, OPERATOR_LABELS, describe, emptyLeaf, leafOperator } from '../conditions';

let nextId = 0;

/**
 * Éditeur visuel et récursif d'une condition : groupes ET / OU, négation, critères sur une question.
 */
@Component({
  selector: 'app-condition-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = condition();
    @if ('all' in c || 'any' in c) {
      <div
        class="cond"
        role="group"
        [attr.aria-label]="'Groupe : ' + ('all' in c ? 'toutes' : 'au moins une')"
      >
        <div class="cond-row">
          <label class="sr-only" [for]="id + '-group'">Type de groupe</label>
          <select
            [id]="id + '-group'"
            [value]="'all' in c ? 'all' : 'any'"
            (change)="setGroup(value($event))"
          >
            <option value="all">Toutes ces conditions (ET)</option>
            <option value="any">Au moins une de ces conditions (OU)</option>
          </select>
          <button type="button" class="btn btn-small btn-quiet" (click)="negate()">
            Inverser (NON)
          </button>
          @if (removable()) {
            <button type="button" class="btn btn-small btn-quiet" (click)="remove.emit()">
              Supprimer le groupe
            </button>
          }
        </div>
        <div class="cond-children">
          @for (child of children(); track $index) {
            <app-condition-editor
              [condition]="child"
              (conditionChange)="replaceChild($index, $event)"
              [questions]="questions()"
              [removable]="children().length > 1"
              (remove)="removeChild($index)"
            />
          }
        </div>
        <div class="cond-row">
          <button type="button" class="btn btn-small" (click)="addChild(false)">+ Critère</button>
          <button type="button" class="btn btn-small" (click)="addChild(true)">+ Groupe</button>
        </div>
      </div>
    } @else if ('not' in c) {
      <div class="cond cond-not" role="group" aria-label="Négation">
        <div class="cond-row">
          <strong>NON :</strong>
          <button type="button" class="btn btn-small btn-quiet" (click)="condition.set(c.not)">
            Retirer le NON
          </button>
          @if (removable()) {
            <button type="button" class="btn btn-small btn-quiet" (click)="remove.emit()">
              Supprimer
            </button>
          }
        </div>
        <app-condition-editor
          [condition]="c.not"
          (conditionChange)="condition.set({ not: $event })"
          [questions]="questions()"
        />
      </div>
    } @else {
      <div class="cond" role="group" [attr.aria-label]="'Critère : ' + summary()">
        <div class="cond-row">
          <label class="sr-only" [for]="id + '-q'">Question</label>
          <select [id]="id + '-q'" (change)="setQuestion(value($event))">
            @if (!question()) {
              <option value="" selected>— question inconnue : {{ $any(c).q }} —</option>
            }
            @for (q of questions(); track q.key) {
              <option [value]="q.key" [selected]="q.key === question()?.key">
                {{ q.key }} — {{ short(q.text.fr) }}
              </option>
            }
          </select>
          <label class="sr-only" [for]="id + '-op'">Opérateur</label>
          <select [id]="id + '-op'" (change)="setOperator($any(value($event)))">
            @for (op of operators; track op) {
              <option [value]="op" [selected]="op === operator()">{{ labels[op] }}</option>
            }
          </select>
          @if (operator() === 'countAtLeast') {
            <label class="sr-only" [for]="id + '-n'">Nombre minimal</label>
            <input
              [id]="id + '-n'"
              type="number"
              min="1"
              class="text-input"
              [value]="$any(c).countAtLeast"
              (input)="setCount(value($event))"
            />
          }
          @if (operator() === 'answered') {
            <label class="sr-only" [for]="id + '-ans'">Répondue ?</label>
            <select [id]="id + '-ans'" (change)="setAnswered(value($event) === 'true')">
              <option value="true" [selected]="$any(c).answered">répondue</option>
              <option value="false" [selected]="!$any(c).answered">non répondue</option>
            </select>
          }
          <button type="button" class="btn btn-small btn-quiet" (click)="negate()">
            Inverser (NON)
          </button>
          <button type="button" class="btn btn-small btn-quiet" (click)="wrapInGroup()">
            Grouper
          </button>
          @if (removable()) {
            <button type="button" class="btn btn-small btn-quiet" (click)="remove.emit()">
              Supprimer
            </button>
          }
        </div>
        @if (operator() !== 'answered' && question(); as q) {
          <fieldset class="cond-options">
            <legend class="sr-only">Réponses concernées</legend>
            @if (operator() === 'countAtLeast') {
              <p class="hint">Réponses comptées (aucune cochée : toutes les réponses) :</p>
            }
            @for (option of q.options; track option.key) {
              <label class="check">
                <input
                  type="checkbox"
                  [checked]="chosen().includes(option.key)"
                  (change)="toggle(option.key, $event)"
                />
                <span>{{ option.label.fr }}</span>
              </label>
            }
          </fieldset>
        }
      </div>
    }
  `,
})
export class ConditionEditorComponent {
  readonly condition = model.required<Condition>();
  readonly questions = input.required<Question[]>();
  readonly removable = input(false);
  readonly remove = output();
  protected readonly id = `ce-${nextId++}`;
  protected readonly labels = OPERATOR_LABELS;
  protected readonly operators = Object.keys(OPERATOR_LABELS) as LeafOperator[];

  protected readonly children = computed(() => {
    const c = this.condition();
    return 'all' in c ? c.all : 'any' in c ? c.any : [];
  });
  protected readonly operator = computed(() => leafOperator(this.condition()));
  protected readonly question = computed(() => {
    const c = this.condition();
    return 'q' in c ? this.questions().find((q) => q.key === c.q) : undefined;
  });
  protected readonly chosen = computed<string[]>(() => {
    const c = this.condition();
    if ('in' in c) return c.in;
    if ('hasAny' in c) return c.hasAny;
    if ('countAtLeast' in c) return c.among ?? [];
    return [];
  });
  protected readonly summary = computed(() => describe(this.condition(), this.questions()));

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected short(text: string): string {
    return text.length > 60 ? `${text.slice(0, 57)}…` : text;
  }

  protected setGroup(kind: string): void {
    const children = this.children();
    this.condition.set(kind === 'all' ? { all: children } : { any: children });
  }

  protected replaceChild(index: number, child: Condition): void {
    this.setChildren(this.children().map((c, i) => (i === index ? child : c)));
  }

  protected removeChild(index: number): void {
    this.setChildren(this.children().filter((_, i) => i !== index));
  }

  protected addChild(group: boolean): void {
    const leaf = emptyLeaf(this.questions());
    this.setChildren([...this.children(), group ? { all: [leaf] } : leaf]);
  }

  private setChildren(children: Condition[]): void {
    this.condition.set('all' in this.condition() ? { all: children } : { any: children });
  }

  protected negate(): void {
    this.condition.set({ not: this.condition() });
  }

  protected wrapInGroup(): void {
    this.condition.set({ all: [this.condition()] });
  }

  protected setQuestion(key: string): void {
    const question = this.questions().find((q) => q.key === key);
    if (!question) return;
    const first = question.options[0] ? [question.options[0].key] : [];
    this.condition.set(
      this.operator() === 'answered' ? { q: key, answered: true } : { q: key, in: first },
    );
  }

  protected setOperator(op: LeafOperator): void {
    const q =
      this.question()?.key ??
      ('q' in this.condition() ? (this.condition() as { q: string }).q : '');
    const chosen = this.chosen().length
      ? this.chosen()
      : (this.question()
          ?.options.slice(0, 1)
          .map((o) => o.key) ?? []);
    const next: Record<LeafOperator, Condition> = {
      in: { q, in: chosen },
      hasAny: { q, hasAny: chosen },
      countAtLeast: { q, countAtLeast: 1 },
      answered: { q, answered: true },
    };
    this.condition.set(next[op]);
  }

  protected setCount(raw: string): void {
    const c = this.condition();
    if (!('countAtLeast' in c)) return;
    this.condition.set({ ...c, countAtLeast: Math.max(1, Math.round(Number(raw)) || 1) });
  }

  protected setAnswered(answered: boolean): void {
    const c = this.condition();
    if ('q' in c) this.condition.set({ q: c.q, answered });
  }

  protected toggle(option: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.chosen();
    const keys = checked ? [...current, option] : current.filter((k) => k !== option);
    const c = this.condition();
    if ('in' in c) this.condition.set({ q: c.q, in: keys });
    else if ('hasAny' in c) this.condition.set({ q: c.q, hasAny: keys });
    else if ('countAtLeast' in c)
      this.condition.set(
        keys.length
          ? { q: c.q, countAtLeast: c.countAtLeast, among: keys }
          : { q: c.q, countAtLeast: c.countAtLeast },
      );
  }
}
