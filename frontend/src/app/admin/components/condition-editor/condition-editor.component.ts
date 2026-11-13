import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { Condition, Question } from '../../../core/models';
import { adminT, adminText } from '../../admin-i18n';
import { LeafOperator, OPERATORS, describe, emptyLeaf, leafOperator } from '../../conditions';

let nextId = 0;

/**
 * Éditeur visuel et récursif d'une condition : groupes ET / OU, négation, critères sur une question.
 */
@Component({
  selector: 'app-condition-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './condition-editor.component.html',
  styleUrl: './condition-editor.component.scss',
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
