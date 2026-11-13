import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { RuleUsageRow } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';
import { describe } from '../conditions';
import { BuilderStore } from './builder.store';

/** Règles utilisées par le questionnaire : ordre, points et résultat imposé y sont propres. */
@Component({
  selector: 'app-rules-tab',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">{{ t('builder.rules_intro') }}</p>
    @if (store.detail(); as d) {
      <ol class="item-list">
        @for (
          usage of d.rules;
          track usage.id;
          let i = $index;
          let first = $first;
          let last = $last
        ) {
          @let rule = ruleOf(usage.rule);
          <li class="item">
            <div>
              <p class="item-title">
                <a [routerLink]="['/admin/library/rules', rule?.id]">{{ usage.rule }}</a>
                @if ((rule?.used_in?.length ?? 0) > 1) {
                  <span class="tag is-sun">{{
                    t('builder.shared', { list: rule!.used_in.join(', ') })
                  }}</span>
                }
              </p>
              @if (rule) {
                <p class="condition-summary">{{ t('rules.if') }} {{ summary(rule.condition) }}</p>
                @if (rule.explanation) {
                  <p>« {{ text(rule.explanation) }} »</p>
                }
              }
              <div class="cond-row">
                <label [for]="'pts-' + usage.id">{{ t('builder.points') }}</label>
                <input
                  [id]="'pts-' + usage.id"
                  class="text-input"
                  type="number"
                  style="width: 5rem"
                  [value]="usage.points"
                  (change)="update(usage, { points: +$any($event.target).value || 0 })"
                />
                <label [for]="'ovr-' + usage.id">{{ t('builder.override') }}</label>
                <select
                  [id]="'ovr-' + usage.id"
                  (change)="update(usage, { override_outcome: $any($event.target).value || null })"
                >
                  <option value="" [selected]="!usage.override_outcome">
                    {{ t('builder.override_none') }}
                  </option>
                  @for (o of d.outcomes; track o.key) {
                    <option [value]="o.key" [selected]="o.key === usage.override_outcome">
                      {{ text(o.title) }}
                    </option>
                  }
                </select>
              </div>
            </div>
            <div class="item-actions">
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_up') + ' : ' + usage.rule"
                [disabled]="first"
                (click)="move(i, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_down') + ' : ' + usage.rule"
                [disabled]="last"
                (click)="move(i, 1)"
              >
                <app-icon name="down" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('builder.remove_rule') + ' : ' + usage.rule"
                (click)="remove(usage)"
              >
                <app-icon name="trash" />
              </button>
            </div>
          </li>
        } @empty {
          <li class="hint">{{ t('builder.no_rules') }}</li>
        }
      </ol>
      <div class="cond-row" style="margin-top: 1rem">
        <label class="sr-only" for="add-rule">{{ t('builder.add_rule') }}</label>
        <select id="add-rule" #pick>
          <option value="">{{ t('builder.pick_rule') }}</option>
          @for (rule of available(); track rule.key) {
            <option [value]="rule.key">
              {{ rule.key }}{{ rule.explanation ? ' — ' + short(text(rule.explanation)) : '' }}
            </option>
          }
        </select>
        <button
          type="button"
          class="btn btn-small"
          [disabled]="store.busy()"
          (click)="add(pick.value); pick.value = ''"
        >
          <app-icon name="plus" /> {{ t('builder.add_rule') }}
        </button>
        <a class="linklike" routerLink="/admin/library/rules/new">{{ t('builder.create_rule') }}</a>
      </div>
      <p class="hint">{{ t('builder.add_rule_hint') }}</p>
    }
  `,
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
