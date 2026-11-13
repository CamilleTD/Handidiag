import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/document.service';
import { I18nService } from '../../core/i18n.service';
import { QuizService } from '../../core/quiz.service';
import { RestitutionService } from '../../core/restitution.service';
import { ReadPart } from '../../core/voice.service';
import { ContactCardComponent } from '../../shared/contact-card.component';
import { IconComponent, MedalComponent } from '../../shared/icon.component';
import { ReadButtonComponent } from '../../shared/read-button.component';

@Component({
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IconComponent,
    MedalComponent,
    ReadButtonComponent,
    ContactCardComponent,
  ],
  templateUrl: './result.page.html',
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
    const first = this.quiz.startDeep();
    void this.router.navigate(['/quiz', first + 1]);
  }

  protected continueToRqth(): void {
    const next = this.quiz.continueToRqth();
    void this.router.navigate(['/quiz', next + 1]);
  }

  protected restart(): void {
    this.quiz.reset();
    void this.router.navigateByUrl('/');
  }

  /** Le texte reflète les réponses : la lecture utilise une voix locale par défaut. */
  protected readonly readParts = (): ReadPart[] => {
    const view = this.restitution.view();
    if (!view) return [];
    const el = (id: string) => document.getElementById(id);
    const text = this.i18n.text.bind(this.i18n);
    const parts: ReadPart[] = [];
    if (view.poleFirst && view.poleMessage)
      parts.push(
        { text: text(view.poleMessage.title), element: el('pole-v'), pause: 500 },
        { text: text(view.poleMessage.body), pause: 600 },
      );
    if (!view.result.poleOnly && view.level)
      parts.push(
        { text: text(view.level.title), element: el('lvl'), pause: 500 },
        { text: text(view.level.body, view.level.body_falc), pause: 600 },
      );
    parts.push({ text: this.i18n.t('result.notdecision'), element: el('notice'), pause: 700 });
    view.flags.forEach((f) =>
      parts.push({ text: text(f.text), element: el(`flag-${f.key}`), pause: 500 }),
    );
    view.suggestions.forEach((s) =>
      parts.push({ text: text(s.text), element: el(`todo-${s.key}`), pause: 500 }),
    );
    parts.push({ text: this.i18n.t('result.contacts_title'), pause: 450 });
    view.contacts.forEach((c) =>
      parts.push({ text: text(c.name), element: el(`contact-${c.key}`), pause: 450 }),
    );
    return parts;
  };
}
