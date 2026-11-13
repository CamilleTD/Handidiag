import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { RuleUsageRow } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';
import { describe } from '../../conditions';
import { BuilderStore } from '../builder.store';

/** Règles utilisées par le questionnaire : ordre, points et résultat imposé y sont propres. */
@Component({
  selector: 'app-rules-tab',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules-tab.component.html',
  styleUrl: './rules-tab.component.scss',
})
export class RulesTabComponent {
  protected readonly store = inject(BuilderStore);
  protected readonly t = adminT();
  protected readonly text = adminText();

  /** Règles de la bibliothèque dont toutes les questions sont dans ce questionnaire. */
  protected readonly available = computed(() => {
    const used = new Set(this.store.detail()?.rules.map((u) => u.rule));
    const placed = new Set(this.store.placed().map((q) => q.key));
    const cites = (c: unknown): string[] =>
      !c || typeof c !== 'object'
        ? []
        : [
            ...(('q' in c ? [String((c as { q: string }).q)] : []) as string[]),
            ...Object.values(c).flatMap((v) => (Array.isArray(v) ? v.flatMap(cites) : cites(v))),
          ];
    return this.store
      .rules()
      .filter((r) => !used.has(r.key) && cites(r.condition).every((q) => placed.has(q)));
  });

  protected ruleOf(key: string) {
    return this.store.rules().find((r) => r.key === key);
  }

  protected summary(condition: Parameters<typeof describe>[0]): string {
    return describe(condition, this.store.bank(), this.t, this.text);
  }

  protected short(value: string): string {
    return value.length > 60 ? `${value.slice(0, 57)}…` : value;
  }

  protected async add(key: string): Promise<void> {
    if (key) await this.store.change('post', '/rules', { rule: key });
  }

  protected async update(usage: RuleUsageRow, change: Partial<RuleUsageRow>): Promise<void> {
    await this.store.change('put', `/rules/${usage.id}`, { ...usage, ...change });
  }

  protected async remove(usage: RuleUsageRow): Promise<void> {
    await this.store.change('delete', `/rules/${usage.id}`);
  }

  protected async move(index: number, delta: number): Promise<void> {
    const ids = this.store.detail()!.rules.map((u) => u.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await this.store.change('post', '/rules/reorder', { ids });
  }
}
