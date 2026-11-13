import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { AdminApi, QuestionnaireDetail, QuestionnaireRow, Stats } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';

type Masked = number | string;
interface Bar {
  label: string;
  value: Masked;
  width: number;
}

/** Statistiques anonymes d'un questionnaire. Les petites valeurs sont masquées par le serveur. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>{{ t('dashboard.title') }}</h1>
      <div class="admin-actions">
        <label class="sr-only" for="dash-q">{{ t('dashboard.questionnaire') }}</label>
        <select id="dash-q" (change)="select($any($event.target).value)">
          @for (q of questionnaires(); track q.key) {
            <option [value]="q.key" [selected]="q.key === selected()">{{ text(q.title) }}</option>
          }
        </select>
        <button type="button" class="btn" (click)="load()">{{ t('dashboard.refresh') }}</button>
        <a class="btn" [href]="'/api/admin/stats/' + selected() + '/csv'" download>
          {{ t('dashboard.export') }}
        </a>
      </div>
    </div>
    @if (error()) {
      <p class="status is-error" role="alert">{{ error() }}</p>
    }
    @if (stats(); as s) {
      @if (s.disabled) {
        <p class="status">{{ t('dashboard.disabled') }}</p>
      }
      <p class="hint">{{ t('dashboard.privacy', { k: s.k }) }}</p>
      <ul class="kpis">
        <li class="kpi">
          <p class="kpi-label">{{ t('dashboard.starts') }}</p>
          <p class="kpi-value">{{ show(s.totals.starts) }}</p>
        </li>
        <li class="kpi">
          <p class="kpi-label">{{ t('dashboard.completes') }}</p>
          <p class="kpi-value">{{ show(s.totals.completes) }}</p>
        </li>
        <li class="kpi">
          <p class="kpi-label">{{ t('dashboard.rate') }}</p>
          <p class="kpi-value">
            {{ s.totals.completion_rate === null ? '–' : s.totals.completion_rate + ' %' }}
          </p>
        </li>
        <li class="kpi">
          <p class="kpi-label">{{ t('dashboard.optional') }}</p>
          <p class="kpi-value">{{ show(s.totals.optional) }}</p>
        </li>
      </ul>
      <div class="charts">
        @for (chart of charts(); track chart.title) {
          <section class="chart-card">
            <h2>{{ chart.title }}</h2>
            <ul class="bars">
              @for (bar of chart.bars; track bar.label) {
                <li class="bar-row">
                  <span class="bar-label">{{ bar.label }}</span>
                  <span class="bar-track" aria-hidden="true"
                    ><span class="bar-fill" [style.width.%]="bar.width"></span
                  ></span>
                  <span class="bar-val">{{ show(bar.value) }}</span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
      <section class="chart-card">
        <h2>{{ t('dashboard.daily') }}</h2>
        @if (s.daily.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{{ t('dashboard.day') }}</th>
                  <th scope="col">{{ t('dashboard.starts') }}</th>
                  <th scope="col">{{ t('dashboard.completes') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (day of s.daily; track day.date) {
                  <tr>
                    <th scope="row">{{ formatDate(day.date) }}</th>
                    <td>{{ show(day.start) }}</td>
                    <td>{{ show(day.complete) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p>{{ t('dashboard.no_activity') }}</p>
        }
      </section>
      <details class="panel">
        <summary>{{ t('dashboard.demo_title') }}</summary>
        <p>{{ t('dashboard.demo_text') }}</p>
        <div class="actions">
          <button type="button" class="btn" (click)="demo()">{{ t('dashboard.demo_add') }}</button>
          @if (confirmReset()) {
            <button type="button" class="btn btn-primary" (click)="reset()">
              {{ t('dashboard.reset_confirm') }}
            </button>
            <button type="button" class="btn btn-quiet" (click)="confirmReset.set(false)">
              {{ t('common.cancel') }}
            </button>
          } @else {
            <button type="button" class="btn btn-quiet" (click)="confirmReset.set(true)">
              {{ t('dashboard.reset') }}…
            </button>
          }
        </div>
      </details>
    } @else if (!error()) {
      <p>{{ t('common.loading') }}</p>
    }
  `,
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
