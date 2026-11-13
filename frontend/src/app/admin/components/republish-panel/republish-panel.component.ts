import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { AdminApi, RepublishResult } from '../../admin-api.service';
import { adminT } from '../../admin-i18n';

/**
 * Republication groupée : après la modification d'un élément partagé de la bibliothèque,
 * les questionnaires publiés qui l'utilisent sont republiés d'un seul clic.
 */
@Component({
  selector: 'app-republish-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './republish-panel.component.html',
  styleUrl: './republish-panel.component.scss',
})
export class RepublishPanelComponent {
  private readonly api = inject(AdminApi);
  protected readonly t = adminT();

  /** Clés des questionnaires concernés. */
  readonly keys = input.required<string[]>();
  /** Émis après une republication réussie. */
  readonly done = output<RepublishResult>();

  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly failed = signal(false);

  protected async run(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await this.api.republish(this.keys());
      this.failed.set(result.locked.length > 0);
      this.message.set(summary(result, this.t));
      this.done.emit(result);
    } catch (error) {
      this.failed.set(true);
      this.message.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}

/** Compte rendu d'une republication, dans la langue de l'interface. */
export function summary(
  result: RepublishResult,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const parts: string[] = [];
  if (result.published.length)
    parts.push(t('republish.published', { list: result.published.join(', ') }));
  if (result.locked.length)
    parts.push(
      t('republish.locked', {
        list: result.locked.map((l) => `${l.key} (${l.by})`).join(', '),
      }),
    );
  if (!parts.length) parts.push(t('republish.nothing'));
  return parts.join(' ');
}
