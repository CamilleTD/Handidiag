import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { adminT } from '../admin-i18n';

export interface PickItem {
  key: string;
  label: string;
}

let nextId = 0;

/**
 * Choix de plusieurs éléments d'une bibliothèque (points d'attention, pistes, interlocuteurs).
 * Avec `ordered`, les éléments choisis s'affichent dans leur ordre, modifiable.
 */
@Component({
  selector: 'app-pick-list',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form-section" [attr.aria-labelledby]="id">
      <h2 [id]="id">{{ label() }} ({{ selected().length }})</h2>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
      @if (ordered() && selected().length) {
        <ol class="chosen-list">
          @for (
            key of selected();
            track key;
            let i = $index;
            let first = $first;
            let last = $last
          ) {
            <li>
              <span
                >{{ labelOf(key) }} <small class="key">{{ key }}</small></span
              >
              <span class="item-actions">
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="t('common.move_up') + ' : ' + labelOf(key)"
                  [disabled]="first"
                  (click)="move(i, -1)"
                >
                  <app-icon name="up" />
                </button>
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="t('common.move_down') + ' : ' + labelOf(key)"
                  [disabled]="last"
                  (click)="move(i, 1)"
                >
                  <app-icon name="down" />
                </button>
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="t('common.remove') + ' : ' + labelOf(key)"
                  (click)="toggle(key, false)"
                >
                  <app-icon name="trash" />
                </button>
              </span>
            </li>
          }
        </ol>
      }
      <label class="sr-only" [for]="id + '-filter'">{{ t('common.filter') }}</label>
      <input
        [id]="id + '-filter'"
        class="text-input"
        type="search"
        [placeholder]="t('common.filter_placeholder')"
        (input)="filter.set($any($event.target).value)"
      />
      <div class="pick-list">
        @for (item of shown(); track item.key) {
          <label class="check">
            <input
              type="checkbox"
              [checked]="selected().includes(item.key)"
              (change)="toggle(item.key, $any($event.target).checked)"
            />
            <span
              >{{ item.label }} <small class="key">{{ item.key }}</small></span
            >
          </label>
        } @empty {
          <p class="hint">{{ t('common.nothing_found') }}</p>
        }
      </div>
    </section>
  `,
})
export class PickListComponent {
  readonly items = input.required<PickItem[]>();
  readonly selected = model<string[]>([]);
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly ordered = input(false);
  protected readonly t = adminT();
  protected readonly id = `pl-${nextId++}`;
  protected readonly filter = signal('');
  protected readonly shown = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    return this.items().filter(
      (i) =>
        !needle || i.key.toLowerCase().includes(needle) || i.label.toLowerCase().includes(needle),
    );
  });

  protected labelOf(key: string): string {
    return this.items().find((i) => i.key === key)?.label ?? key;
  }

  protected toggle(key: string, checked: boolean): void {
    const current = this.selected().filter((k) => k !== key);
    this.selected.set(checked ? [...current, key] : current);
  }

  protected move(index: number, delta: number): void {
    const list = [...this.selected()];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this.selected.set(list);
  }
}
