import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/document.service';
import { I18nService } from '../../core/i18n.service';
import { QuizService } from '../../core/quiz.service';
import { RestitutionService } from '../../core/restitution.service';
import { ReadPart } from '../../core/voice.service';
import { ContactCardComponent } from '../../shared/contact-card/contact-card.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { MedalComponent } from '../../shared/medal/medal.component';
import { ReadButtonComponent } from '../../shared/read-button/read-button.component';

@Component({
  imports: [RouterLink, IconComponent, MedalComponent, ReadButtonComponent, ContactCardComponent],
  templateUrl: './result.page.html',
  styleUrl: './result.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultPage {
  protected readonly i18n = inject(I18nService);
  protected readonly quiz = inject(QuizService);
  protected readonly restitution = inject(RestitutionService);
  protected readonly docs = inject(DocumentService);
  private readonly router = inject(Router);

  protected points(n: number): string {
    return this.i18n.t(n === 1 ? 'result.points' : 'result.points_plural', { n });
  }

  protected refine(): void {
    const first = this.quiz.openOptional();
    void this.router.navigate(['/q', this.quiz.key(), first + 1]);
  }

  /** Questionnaire suivant : les réponses déjà données sont reprises. */
  protected async continueTo(key: string): Promise<void> {
    if (this.quiz.preview()) return;
    if (await this.quiz.open(key)) void this.router.navigate(['/q', key, 1]);
  }

  protected restart(): void {
    this.quiz.forgetAll();
    void this.router.navigateByUrl('/');
  }

  /** Le texte reflète les réponses : la lecture utilise une voix locale par défaut. */
  protected readonly readParts = (): ReadPart[] => {
    const view = this.restitution.view();
    if (!view) return [];
    const el = (id: string) => document.getElementById(id);
    const text = this.i18n.text.bind(this.i18n);
    const parts: ReadPart[] = [];
    if (view.outcome)
      parts.push(
        { text: text(view.outcome.title), element: el('outcome'), pause: 500 },
        { text: text(view.outcome.body, view.outcome.body_falc), pause: 600 },
      );
    parts.push({ text: this.i18n.t('result.notdecision'), element: el('notice'), pause: 700 });
    view.flags.forEach((f) =>
      parts.push({ text: text(f.text), element: el(`flag-${f.key}`), pause: 500 }),
    );
    view.suggestions.forEach((s) =>
      parts.push({ text: text(s.text), element: el(`todo-${s.key}`), pause: 500 }),
    );
    if (view.contacts.length)
      parts.push({ text: this.i18n.t('result.contacts_title'), pause: 450 });
    view.contacts.forEach((c) =>
      parts.push({ text: text(c.name), element: el(`contact-${c.key}`), pause: 450 }),
    );
    return parts;
  };
}
