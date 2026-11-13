import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { LocalizedText } from '../../core/models';
import { IconComponent } from '../../shared/icon/icon.component';
import { AdminApi, QuestionnaireRow } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';
import { LocalizedFieldComponent } from '../components/localized-field/localized-field.component';

/** Banque de questionnaires : liste, ordre sur l'accueil, création. */
@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questionnaires.page.html',
  styleUrl: './questionnaires.page.scss',
})
export class QuestionnairesPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly rows = signal<QuestionnaireRow[]>([]);
  protected readonly creating = signal(false);
  protected readonly key = signal('');
  protected readonly title = signal<LocalizedText | null>(null);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.rows.set(await this.api.questionnaires());
    } catch (error) {
      this.fail(error);
    }
  }

  protected async create(): Promise<void> {
    this.busy.set(true);
    try {
      const created = await this.api.createQuestionnaire({ key: this.key(), title: this.title() });
      void this.router.navigate(['/admin/questionnaires', created.id]);
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }

  protected async move(index: number, delta: number): Promise<void> {
    const list = [...this.rows()];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this.busy.set(true);
    try {
      await this.api.reorderQuestionnaires(list.map((q) => q.id));
      this.rows.set(list);
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
