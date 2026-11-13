import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { I18nService } from '../../core/i18n.service';
import { QuizService } from '../../core/quiz.service';
import { ReadPart } from '../../core/voice.service';
import { IconComponent, MedalComponent } from '../../shared/icon.component';
import { ReadButtonComponent } from '../../shared/read-button.component';

@Component({
  imports: [RouterLink, IconComponent, MedalComponent, ReadButtonComponent],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  protected readonly analytics = inject(AnalyticsService);
  private readonly quiz = inject(QuizService);
  private readonly router = inject(Router);

  protected readonly features = [
    { css: 'f-does', icon: 'compass', title: 'info.does_title', list: 'info.does' },
    { css: 'f-not', icon: 'ban', title: 'info.not_title', list: 'info.not' },
    { css: 'f-priv', icon: 'lock', title: 'info.privacy_title', list: 'info.privacy' },
  ];

  protected start(): void {
    this.quiz.reset();
    void this.router.navigateByUrl('/quiz/1');
  }

  protected readonly readParts = (): ReadPart[] => {
    const t = (key: string) => this.i18n.t(key);
    const list = (key: string) => this.i18n.list(key).map((text) => ({ text, pause: 450 }));
    return [
      { text: t('info.title'), pause: 600 },
      { text: t('info.lead'), pause: 600 },
      { text: t('info.path_title'), pause: 400 },
      ...this.i18n.steps('info.path').map((s) => ({ text: `${s.title}. ${s.text}`, pause: 450 })),
      { text: t('info.what_title'), pause: 400 },
      { text: t('info.what'), pause: 600 },
      { text: t('info.calm_title'), pause: 400 },
      ...list('info.calm'),
      { text: t('info.pole_title'), pause: 400 },
      { text: t('info.pole_text'), pause: 600 },
      ...this.features.flatMap((f) => [{ text: t(f.title), pause: 400 }, ...list(f.list)]),
      { text: t('info.eco_title'), pause: 400 },
      ...list('info.eco'),
    ];
  };
}
