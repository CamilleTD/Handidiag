import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon.component';
import { adminT } from '../../admin-i18n';

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
  templateUrl: './pick-list.component.html',
  styleUrl: './pick-list.component.scss',
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
