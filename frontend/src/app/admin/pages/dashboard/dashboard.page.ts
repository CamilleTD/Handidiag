import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../../core/content.service';
import { AdminApi, QuestionnaireDetail, QuestionnaireRow, Stats } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';

type Masked = number | string;
interface Bar {
  label: string;
  value: Masked;
  width: number;
}

/** Statistiques anonymes d'un questionnaire. Les petites valeurs sont masquées par le serveur. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly questionnaires = signal<QuestionnaireRow[]>([]);
  protected readonly selected = signal('');
  private readonly detail = signal<QuestionnaireDetail | null>(null);
  protected readonly stats = signal<Stats | null>(null);
  protected readonly error = signal('');
  protected readonly confirmReset = signal(false);

  protected readonly charts = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const outcomes = new Map(this.detail()?.outcomes.map((o) => [o.key, this.text(o.title)]));
    const documents = new Map(
      this.content.content().resources.map((r) => [r.key, this.text(r.title)]),
    );
    return [
      {
        title: this.t('dashboard.by_outcome'),
        bars: this.bars(s.by_outcome, (k) => outcomes.get(k) ?? k),
      },
      {
        title: this.t('dashboard.by_lang'),
        bars: this.bars(s.by_lang, (k) => this.t('field.lang_' + k)),
      },
      {
        title: this.t('dashboard.documents'),
        bars: this.bars(s.documents, (k) => documents.get(k) ?? this.t('dashboard.doc_' + k)),
      },
    ];
  });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      const rows = await this.api.questionnaires();
      this.questionnaires.set(rows);
      const first = rows.find((q) => q.featured) ?? rows[0];
      if (first) await this.select(first.key);
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  protected async select(key: string): Promise<void> {
    this.selected.set(key);
    const row = this.questionnaires().find((q) => q.key === key);
    if (row) this.detail.set(await this.api.questionnaire(row.id).catch(() => null));
    await this.load();
  }

  protected async load(): Promise<void> {
    if (!this.selected()) return;
    try {
      this.stats.set(await this.api.stats(this.selected()));
      this.error.set('');
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  protected show(value: Masked): string {
    if (typeof value === 'number') return String(value);
    return (
      this.t('dashboard.under', { n: value.replace(/[<*]/g, '') }) +
      (value.endsWith('*') ? '*' : '')
    );
  }

  protected formatDate(iso: string): string {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(this.t('locale'), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected async demo(): Promise<void> {
    await this.run(() => this.api.addDemoStats(this.selected()));
  }

  protected async reset(): Promise<void> {
    this.confirmReset.set(false);
    await this.run(() => this.api.resetStats());
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
      await this.load();
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  private bars(values: Record<string, Masked>, label: (key: string) => string): Bar[] {
    const max = Math.max(1, ...Object.values(values).filter((v) => typeof v === 'number'));
    return Object.entries(values).map(([key, value]) => ({
      label: label(key),
      value,
      width: typeof value === 'number' ? (value / max) * 100 : 0,
    }));
  }
}
