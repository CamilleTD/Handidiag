import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { AdminApi, Stats } from '../admin-api.service';

type Masked = number | string;
interface Bar {
  label: string;
  value: Masked;
  width: number;
}

const DOCUMENT_LABELS: Record<string, string> = {
  rqth_mph: 'Fiche RQTH (Mon Parcours Handicap)',
  mdph_portal: 'Portail MDPH',
  service_public_rqth: 'Service-Public : RQTH',
  agefiph: 'Agefiph',
  fiphfp: 'FIPHFP',
  france_travail: 'France Travail',
  print: 'Impression',
  pdf_download: 'PDF téléchargé',
  summary_download: 'Résumé texte téléchargé',
};

/** Statistiques anonymes. Les valeurs inférieures au seuil sont masquées par le serveur. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>Tableau de bord</h1>
      <div class="admin-actions">
        <button type="button" class="btn" (click)="load()">Actualiser</button>
        <a class="btn" href="/api/admin/stats.csv" download>Exporter en CSV</a>
      </div>
    </div>
    @if (error()) {
      <p class="status is-error" role="alert">{{ error() }}</p>
    }
    @if (stats(); as s) {
      @if (s.disabled) {
        <p class="status">
          La collecte des statistiques est désactivée sur ce serveur (DISABLE_STATS).
        </p>
      }
      <p class="hint">
        Compteurs anonymes et séparés (jamais croisés). Une valeur inférieure à {{ s.k }} est
        masquée ; « * » signale une valeur masquée en plus pour empêcher de la retrouver par
        soustraction.
      </p>
      <ul class="kpis">
        <li class="kpi">
          <p class="kpi-label">Parcours commencés</p>
          <p class="kpi-value">{{ show(s.totals.starts) }}</p>
        </li>
        <li class="kpi">
          <p class="kpi-label">Parcours terminés</p>
          <p class="kpi-value">{{ show(s.totals.completes) }}</p>
        </li>
        <li class="kpi">
          <p class="kpi-label">Taux de finalisation</p>
          <p class="kpi-value">
            {{ s.totals.completion_rate === null ? '–' : s.totals.completion_rate + ' %' }}
          </p>
        </li>
        <li class="kpi">
          <p class="kpi-label">Questions complémentaires</p>
          <p class="kpi-value">{{ show(s.totals.deep) }}</p>
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
        <h2>Activité des 30 derniers jours</h2>
        @if (s.daily.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Jour</th>
                  <th scope="col">Commencés</th>
                  <th scope="col">Terminés</th>
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
          <p>Aucune activité enregistrée pour l'instant.</p>
        }
      </section>
      <details class="panel">
        <summary>Données de démonstration (hors production)</summary>
        <p>Pour une présentation : ajoute des compteurs fictifs, ou efface tous les compteurs.</p>
        <div class="actions">
          <button type="button" class="btn" (click)="demo()">Ajouter 120 parcours fictifs</button>
          @if (confirmReset()) {
            <button type="button" class="btn btn-primary" (click)="reset()">
              Confirmer : tout effacer
            </button>
            <button type="button" class="btn btn-quiet" (click)="confirmReset.set(false)">
              Annuler
            </button>
          } @else {
            <button type="button" class="btn btn-quiet" (click)="confirmReset.set(true)">
              Effacer les statistiques…
            </button>
          }
        </div>
      </details>
    } @else if (!error()) {
      <p>Chargement…</p>
    }
  `,
})
export class DashboardPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected readonly stats = signal<Stats | null>(null);
  protected readonly error = signal('');
  protected readonly confirmReset = signal(false);

  protected readonly charts = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const content = this.content.content();
    const levels = new Map(content.levels.map((l) => [l.key, l.title.fr]));
    const profile = content.questions.find((q) => q.key === 'profile');
    const profiles = new Map(profile?.options.map((o) => [o.key, o.label.fr]) ?? []);
    return [
      { title: 'Orientation obtenue', bars: this.bars(s.by_level, (k) => levels.get(k) ?? k) },
      { title: 'Profil', bars: this.bars(s.by_profile, (k) => profiles.get(k) ?? k) },
      { title: 'Langue', bars: this.bars(s.by_lang, (k) => (k === 'fr' ? 'Français' : 'English')) },
      { title: 'Documents ouverts', bars: this.bars(s.documents, (k) => DOCUMENT_LABELS[k] ?? k) },
    ];
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    try {
      this.stats.set(await this.api.stats());
      this.error.set('');
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  protected show(value: Masked): string {
    return typeof value === 'number'
      ? String(value)
      : `moins de ${value.replace(/[<*]/g, '')}${value.endsWith('*') ? '*' : ''}`;
  }

  protected formatDate(iso: string): string {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected async demo(): Promise<void> {
    await this.run(() => this.api.addDemoStats());
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
