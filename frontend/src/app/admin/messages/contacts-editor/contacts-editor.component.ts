import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon.component';
import { Collection, ContactRow, Payload } from '../../admin-api.service';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';
import { EditableList } from '../editable-list';

type Draft = Payload<ContactRow>;
const ICONS = ['user', 'building', 'shield', 'doc', 'compass', 'book', 'chat', 'clock', 'badge'];

/** Bibliothèque d'interlocuteurs, proposés par les résultats et les règles. */
@Component({
  selector: 'app-contacts-editor',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-editor.component.html',
  styleUrl: './contacts-editor.component.scss',
})
export class ContactsEditor extends EditableList<ContactRow> {
  protected readonly collection: Collection = 'contacts';
  protected readonly icons = ICONS;
  protected readonly groups = ['school', 'work', 'other'] as const;
  protected readonly draft = signal<Draft | null>(null);

  protected open(id: number | 'new'): void {
    const contact = this.items().find((c) => c.id === id);
    if (contact) {
      const { id: _id, position: _position, ...draft } = contact;
      this.draft.set(draft);
    } else {
      this.draft.set({
        key: '',
        icon: 'user',
        name: { fr: '', en: '' },
        role: { fr: '', en: '' },
        email: null,
        link_url: null,
        link_label: null,
        is_confidential: false,
        group: null,
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
}
