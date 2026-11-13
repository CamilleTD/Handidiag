import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Condition, LocalizedText } from '../../../core/models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ItemRow, SectionRow } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';
import { describe } from '../../conditions';
import { ConditionFieldComponent } from '../../components/condition-field/condition-field.component';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';
import { BuilderStore } from '../builder.store';

interface SectionDraft {
  title: LocalizedText | null;
  intro: LocalizedText | null;
  optional: boolean;
}
interface ItemDraft {
  required: boolean;
  show_if: Condition | null;
  auto_answer: string | null;
  section_id: number;
}

/** Sections du questionnaire et questions de la banque qui y sont placées. */
@Component({
  selector: 'app-content-tab',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IconComponent,
    LocalizedFieldComponent,
    ConditionFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-tab.component.html',
  styleUrl: './content-tab.component.scss',
})
export class ContentTabComponent {
  protected readonly store = inject(BuilderStore);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly sectionEdit = signal<{ id: number; draft: SectionDraft } | null>(null);
  protected readonly confirmSection = signal<number | null>(null);
  protected readonly itemEdit = signal<number | null>(null);
  protected readonly itemDraft = signal<ItemDraft | null>(null);

  /** Questions de la banque pas encore placées dans ce questionnaire. */
  protected readonly available = computed(() => {
    const placed = new Set(this.store.placed().map((q) => q.key));
    return this.store.bank().filter((q) => !placed.has(q.key));
  });

  protected questionText(key: string): string {
    return this.text(this.store.question(key)?.text) || key;
  }

  protected short(value: string): string {
    return value.length > 70 ? `${value.slice(0, 67)}…` : value;
  }

  protected summary(condition: Condition): string {
    return describe(condition, this.store.placed(), this.t, this.text);
  }

  /* -------------------------------------------------------------- sections */

  protected newSection(): void {
    this.sectionEdit.set({ id: 0, draft: { title: null, intro: null, optional: false } });
  }

  protected editSection(section: SectionRow): void {
    const { title, intro, optional } = section;
    this.sectionEdit.set({ id: section.id, draft: { title, intro, optional } });
  }

  protected patchSection(change: Partial<SectionDraft>): void {
    this.sectionEdit.update((e) => (e ? { ...e, draft: { ...e.draft, ...change } } : e));
  }

  protected async saveSection(): Promise<void> {
    const edit = this.sectionEdit();
    if (!edit) return;
    const ok = edit.id
      ? await this.store.change('put', `/sections/${edit.id}`, edit.draft)
      : await this.store.change('post', '/sections', edit.draft);
    if (ok) this.sectionEdit.set(null);
  }

  protected async removeSection(section: SectionRow): Promise<void> {
    this.confirmSection.set(null);
    await this.store.change('delete', `/sections/${section.id}`);
  }

  protected async moveSection(index: number, delta: number): Promise<void> {
    const ids = this.store.detail()!.sections.map((s) => s.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await this.store.change('post', '/sections/reorder', { ids });
  }

  /* -------------------------------------------------------------- questions placées */

  protected async addItem(section: SectionRow, key: string): Promise<void> {
    if (key) await this.store.change('post', `/sections/${section.id}/items`, { question: key });
  }

  protected editItem(item: ItemRow, section: SectionRow): void {
    this.itemEdit.set(item.id);
    this.itemDraft.set({
      required: item.required,
      show_if: item.show_if,
      auto_answer: item.auto_answer,
      section_id: section.id,
    });
  }

  protected patchItem(change: Partial<ItemDraft>): void {
    this.itemDraft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected async saveItem(item: ItemRow): Promise<void> {
    if (await this.store.change('put', `/items/${item.id}`, this.itemDraft()))
      this.itemEdit.set(null);
  }

  protected async removeItem(item: ItemRow): Promise<void> {
    await this.store.change('delete', `/items/${item.id}`);
  }

  protected async moveItem(section: SectionRow, index: number, delta: number): Promise<void> {
    const ids = section.items.map((i) => i.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await this.store.change('post', `/sections/${section.id}/items/reorder`, { ids });
  }
}
