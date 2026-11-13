import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentService } from '../../../core/content.service';
import type { LocalizedText, PageBlock } from '../../../core/models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AdminApi, PageRow, Payload } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';

type Draft = Payload<PageRow>;
type BlockType = PageBlock['type'];

@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-editor.page.html',
  styleUrl: './page-editor.page.scss',
})
export class PageEditorPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  protected readonly text = adminText();
  readonly id = input.required<string>();

  protected readonly types: BlockType[] = ['text', 'accordion', 'link', 'document'];
  protected readonly isNew = computed(() => this.id() === 'new');
  protected readonly draft = signal<Draft | null>(null);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmDelete = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    if (id === 'new') {
      this.draft.set({
        slug: '',
        title: { fr: '', en: '' },
        intro: null,
        blocks: [],
        is_published: false,
      });
      return;
    }
    try {
      const page = (await this.api.list<PageRow>('pages')).find((p) => String(p.id) === id);
      if (!page) throw new Error(this.t('errors.not_found'));
      const { id: _id, position: _position, ...draft } = page;
      this.draft.set(draft);
    } catch (error) {
      this.fail(error);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  private setBlocks(update: (blocks: PageBlock[]) => PageBlock[]): void {
    this.draft.update((d) => (d ? { ...d, blocks: update(d.blocks) } : d));
  }

  protected addBlock(type: BlockType): void {
    const empty: LocalizedText = { fr: '', en: '' };
    const block: PageBlock =
      type === 'text' || type === 'accordion'
        ? { type, title: empty, text: empty }
        : { type, title: empty, text: null, url: type === 'document' ? '/docs/' : 'https://' };
    this.setBlocks((blocks) => [...blocks, block]);
  }

  protected patchBlock(index: number, change: Partial<PageBlock>): void {
    this.setBlocks((blocks) =>
      blocks.map((b, i) => (i === index ? ({ ...b, ...change } as PageBlock) : b)),
    );
  }

  protected setText(index: number, text: LocalizedText | null): void {
    this.patchBlock(index, { text: text ?? { fr: '', en: '' } } as Partial<PageBlock>);
  }

  protected moveBlock(index: number, delta: number): void {
    this.setBlocks((blocks) => {
      const list = [...blocks];
      [list[index], list[index + delta]] = [list[index + delta], list[index]];
      return list;
    });
  }

  protected removeBlock(index: number): void {
    this.setBlocks((blocks) => blocks.filter((_, i) => i !== index));
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft) return;
    this.saving.set(true);
    try {
      const saved = this.isNew()
        ? await this.api.create<PageRow>('pages', draft)
        : await this.api.update<PageRow>('pages', Number(this.id()), draft);
      this.failed.set(false);
      this.message.set(this.t(draft.is_published ? 'pages.saved_published' : 'pages.saved_draft'));
      void this.content.load();
      if (this.isNew()) void this.router.navigate(['/admin/pages', saved.id], { replaceUrl: true });
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    this.confirmDelete.set(false);
    try {
      await this.api.remove('pages', Number(this.id()));
      void this.content.load();
      void this.router.navigateByUrl('/admin/pages');
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
