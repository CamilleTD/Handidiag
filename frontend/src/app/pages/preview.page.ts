import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { QuizService } from '../core/quiz.service';

/**
 * Aperçu d'un brouillon depuis l'administration : le questionnaire se déroule comme pour le
 * public, sans statistiques. Réservé aux personnes connectées à l'administration.
 */
@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrow">
      @if (failed()) {
        <h1>{{ i18n.t('pages.not_found') }}</h1>
        <p>{{ i18n.t('quiz.preview_failed') }}</p>
        <p>
          <a class="btn" routerLink="/admin/login">{{ i18n.t('ui.admin_link') }}</a>
        </p>
      } @else {
        <p role="status">{{ i18n.t('ui.loading') }}</p>
      }
    </div>
  `,
})
export class PreviewPage implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly quiz = inject(QuizService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    const key = await this.quiz.openPreview(Number(this.id()));
    if (key) void this.router.navigate(['/q', key, 1], { replaceUrl: true });
    else this.failed.set(true);
  }
}
