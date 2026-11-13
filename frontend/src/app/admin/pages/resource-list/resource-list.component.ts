import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ResourceSection } from '../../../core/models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { Collection, Payload, ResourceRow } from '../../admin-api.service';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';
import { EditableList } from '../../messages/editable-list';

type Draft = Payload<ResourceRow>;

/** Liste éditable des ressources d'une rubrique. */
@Component({
  selector: 'app-resource-list',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-list.component.html',
  styleUrl: './resource-list.component.scss',
})
export class ResourceList extends EditableList<ResourceRow> {
  readonly section = input.required<ResourceSection>();
  protected readonly collection: Collection = 'resources';
  protected readonly draft = signal<Draft | null>(null);
  protected readonly shown = computed(() =>
    this.items().filter((i) => i.section === this.section()),
  );

  protected open(id: number | 'new'): void {
    const item = this.items().find((i) => i.id === id);
    if (item) {
      const { id: _id, position: _position, ...draft } = item;
      this.draft.set(draft);
    } else {
      this.draft.set({
        section: this.section(),
        key: '',
        url: null,
        title: { fr: '', en: '' },
        description: { fr: '', en: '' },
        reference: null,
        is_published: true,
      });
    }
    this.message.set('');
    this.editing.set(id);
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected submit(): void {
    const id = this.editing();
    if (id !== null && this.draft()) void this.save(id, this.draft());
  }

  /** Réordonnancement au sein de la rubrique. */
  protected async moveIn(item: ResourceRow, delta: number): Promise<void> {
    const list = [...this.shown()];
    const index = list.findIndex((i) => i.id === item.id);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    await this.run(async () => {
      await this.api.reorderResources(
        this.section(),
        list.map((i) => i.id),
      );
      this.items.set(await this.api.list<ResourceRow>('resources'));
      this.done(this.t('common.moved', { key: item.key }));
    });
  }
}
