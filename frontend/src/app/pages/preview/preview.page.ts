import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { QuizService } from '../../core/quiz.service';

/**
 * Aperçu d'un brouillon depuis l'administration : le questionnaire se déroule comme pour le
 * public, sans statistiques. Réservé aux personnes connectées à l'administration.
 */
@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview.page.html',
  styleUrl: './preview.page.scss',
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
