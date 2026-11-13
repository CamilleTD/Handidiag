import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { LocalizedText } from '../../../core/models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { TextItemRow } from '../../admin-api.service';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';
import { EditableList } from '../editable-list';

/** Points d'attention (flags) ou pistes (suggestions) : une clé et un texte bilingue. */
@Component({
  selector: 'app-text-items-editor',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-items-editor.component.html',
  styleUrl: './text-items-editor.component.scss',
})
export class TextItemsEditor extends EditableList<TextItemRow> {
  readonly kind = input.required<'flags' | 'suggestions'>({ alias: 'collection' });
  protected get collection() {
    return this.kind();
  }
  protected readonly filter = signal('');
  protected readonly draftKey = signal('');
  protected readonly draftText = signal<LocalizedText | null>(null);
  protected readonly draftHighlight = signal(false);
  protected readonly shown = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    return this.items().filter(
      (i) =>
        !needle ||
        i.key.toLowerCase().includes(needle) ||
        i.text.fr.toLowerCase().includes(needle) ||
        i.text.en.toLowerCase().includes(needle),
    );
  });

  protected open(id: number | 'new'): void {
    const item = this.items().find((i) => i.id === id);
    this.draftKey.set(item?.key ?? '');
    this.draftText.set(item?.text ?? null);
    this.draftHighlight.set(item?.highlight_confidential ?? false);
    this.message.set('');
    this.editing.set(id);
  }

  protected submit(): void {
    const id = this.editing();
    if (id === null) return;
    void this.save(id, {
      key: this.draftKey(),
      text: this.draftText() ?? { fr: '', en: '' },
      highlight_confidential: this.draftHighlight(),
    });
  }
}
