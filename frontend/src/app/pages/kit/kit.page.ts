import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AnalyticsService } from '../../core/analytics.service';
import { ContentService } from '../../core/content.service';
import { DocumentService } from '../../core/document.service';
import { I18nService } from '../../core/i18n.service';
import { QuizService } from '../../core/quiz.service';
import { ReadPart } from '../../core/voice.service';
import { IconComponent } from '../../shared/icon.component';
import { ReadButtonComponent } from '../../shared/read-button.component';

@Component({
  imports: [IconComponent, ReadButtonComponent],
  templateUrl: './kit.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitPage {
  protected readonly i18n = inject(I18nService);
  protected readonly content = inject(ContentService);
  protected readonly quiz = inject(QuizService);
  protected readonly docs = inject(DocumentService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly items = computed(() => this.i18n.list('kit.checklist'));
  protected readonly done = computed(
    () => Object.values(this.quiz.checklist()).filter(Boolean).length,
  );

  protected check(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.quiz.checklist.update((list) => ({ ...list, [index]: checked }));
  }

  protected opened(id: string): void {
    this.analytics.send({ t: 'doc', doc: id });
  }

  protected readonly readParts = (): ReadPart[] => {
    const t = (key: string) => this.i18n.t(key);
    const list = (key: string, pause = 450) => this.i18n.list(key).map((text) => ({ text, pause }));
    return [
      { text: t('kit.title'), pause: 500 },
      { text: t('kit.intro'), pause: 600 },
      { text: t('kit.links_title'), pause: 400 },
      ...this.content.resources('official').map((r) => ({
        text: `${this.i18n.text(r.title)}. ${this.i18n.text(r.description)}`,
        pause: 450,
      })),
      { text: t('kit.guide_title'), pause: 400 },
      ...this.i18n.steps('kit.guide').map((s) => ({ text: `${s.title}. ${s.text}`, pause: 450 })),
      { text: t('kit.checklist_title'), pause: 400 },
      ...list('kit.checklist', 350),
      { text: t('kit.vigilance_title'), pause: 400 },
      ...list('kit.vigilance'),
    ];
  };
}
