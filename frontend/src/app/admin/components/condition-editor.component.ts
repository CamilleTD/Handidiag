import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { Condition, Question } from '../../core/models';
import { adminT, adminText } from '../admin-i18n';
import { LeafOperator, OPERATORS, describe, emptyLeaf, leafOperator } from '../conditions';

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
      <div class="cond" role="group" [attr.aria-label]="t('cond.group')">
        <div class="cond-row">
          <label class="sr-only" [for]="id + '-group'">{{ t('cond.group_type') }}</label>
          <select [id]="id + '-group'" (change)="setGroup(value($event))">
            <option value="all" [selected]="'all' in c">{{ t('cond.group_all') }}</option>
            <option value="any" [selected]="'any' in c">{{ t('cond.group_any') }}</option>
          </select>
          <button type="button" class="btn btn-small btn-quiet" (click)="negate()">
            {{ t('cond.negate') }}
          </button>
          @if (removable()) {
            <button type="button" class="btn btn-small btn-quiet" (click)="remove.emit()">
              {{ t('cond.remove_group') }}
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
          <button type="button" class="btn btn-small" (click)="addChild(false)">
            + {{ t('cond.add_criterion') }}
          </button>
          <button type="button" class="btn btn-small" (click)="addChild(true)">
            + {{ t('cond.add_group') }}
          </button>
        </div>
      </div>
    } @else if ('not' in c) {
      <div class="cond cond-not" role="group" [attr.aria-label]="t('cond.negation')">
        <div class="cond-row">
          <strong>{{ t('cond.not_word') }} :</strong>
          <button type="button" class="btn btn-small btn-quiet" (click)="condition.set(c.not)">
            {{ t('cond.remove_not') }}
          </button>
          @if (removable()) {
            <button type="button" class="btn btn-small btn-quiet" (click)="remove.emit()">
              {{ t('common.delete') }}
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
      <div class="cond" role="group" [attr.aria-label]="summary()">
        <div class="cond-row">
          <label class="sr-only" [for]="id + '-q'">{{ t('cond.question') }}</label>
          <select [id]="id + '-q'" (change)="setQuestion(value($event))">
            @if (!question()) {
              <option value="" selected>{{ t('cond.unknown_question', { q: $any(c).q }) }}</option>
            }
            @for (q of questions(); track q.key) {
              <option [value]="q.key" [selected]="q.key === question()?.key">
                {{ q.key }} — {{ short(text(q.text)) }}
              </option>
            }
          </select>
          <label class="sr-only" [for]="id + '-op'">{{ t('cond.operator') }}</label>
          <select [id]="id + '-op'" (change)="setOperator($any(value($event)))">
            @for (op of operators; track op) {
              <option [value]="op" [selected]="op === operator()">{{ t('cond.op_' + op) }}</option>
            }
          </select>
          @if (operator() === 'countAtLeast') {
            <label class="sr-only" [for]="id + '-n'">{{ t('cond.minimum') }}</label>
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
            <label class="sr-only" [for]="id + '-ans'">{{ t('cond.op_answered') }}</label>
            <select [id]="id + '-ans'" (change)="setAnswered(value($event) === 'true')">
              <option value="true" [selected]="$any(c).answered">{{ t('cond.answered') }}</option>
              <option value="false" [selected]="!$any(c).answered">
                {{ t('cond.not_answered') }}
              </option>
            </select>
          }
          <button type="button" class="btn btn-small btn-quiet" (click)="negate()">
            {{ t('cond.negate') }}
          </button>
          <button type="button" class="btn btn-small btn-quiet" (click)="wrapInGroup()">
            {{ t('cond.wrap') }}
          </button>
          @if (removable()) {
            <button type="button" class="btn btn-small btn-quiet" (click)="remove.emit()">
              {{ t('common.delete') }}
            </button>
          }
        </div>
        @if (operator() !== 'answered' && question(); as q) {
          <fieldset class="cond-options">
            <legend class="sr-only">{{ t('cond.options') }}</legend>
            @if (operator() === 'countAtLeast') {
              <p class="hint">{{ t('cond.count_hint') }}</p>
            }
            @for (option of q.options; track option.key) {
              <label class="check">
                <input
                  type="checkbox"
                  [checked]="chosen().includes(option.key)"
                  (change)="toggle(option.key, $event)"
                />
                <span>{{ text(option.label) }}</span>
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
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly id = `ce-${nextId++}`;
  protected readonly operators = OPERATORS;

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
  protected readonly summary = computed(() =>
    describe(this.condition(), this.questions(), this.t, this.text),
  );

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected short(value: string): string {
    return value.length > 60 ? `${value.slice(0, 57)}…` : value;
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
    const current = this.condition();
    const q = 'q' in current ? current.q : '';
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
