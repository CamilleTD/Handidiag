import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { I18nService } from '../../core/i18n.service';
import type { Contact } from '../../core/models';
import { RestitutionService } from '../../core/restitution.service';
import { ReadPart } from '../../core/voice.service';
import { ContactCardComponent } from '../../shared/contact-card.component';
import { IconComponent, MedalComponent } from '../../shared/icon.component';
import { ReadButtonComponent } from '../../shared/read-button.component';

/** Ressources : à l'école, au niveau national, ce que dit la loi. Aucun clic n'est compté ici. */
@Component({
  imports: [IconComponent, MedalComponent, ReadButtonComponent, ContactCardComponent],
  templateUrl: './resources.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly content = inject(ContentService);
  private readonly restitution = inject(RestitutionService);

  protected readonly sections = [
    { id: 'r-efrei', label: 'resources.tab_efrei' },
    { id: 'r-national', label: 'resources.tab_national' },
    { id: 'r-law', label: 'resources.tab_law' },
  ];
  protected readonly poleGroups = computed(() => this.restitution.poleGroups(false));
  protected readonly schoolContacts = computed(() =>
    ['student_health', 'registrar']
      .map((key) => this.content.contacts().get(key))
      .filter((c): c is Contact => !!c),
  );

  protected jump(id: string): void {
    const target = document.getElementById(id);
    if (!target) return;
    target.tabIndex = -1;
    target.scrollIntoView();
    target.focus();
  }

  protected readonly readParts = (): ReadPart[] => {
    const t = (key: string) => this.i18n.t(key);
    const links = this.content.links();
    return [
      { text: t('resources.title'), pause: 500 },
      { text: t('resources.lead'), pause: 600 },
      { text: t('resources.efrei_title'), pause: 450 },
      { text: t('resources.efrei_intro'), pause: 600 },
      ...this.i18n
        .steps('resources.steps')
        .map((s) => ({ text: `${s.title}. ${s.text}`, pause: 450 })),
      { text: t('resources.types_title'), pause: 400 },
      { text: t('resources.types_text'), pause: 600 },
      { text: t('resources.freq_title'), pause: 400 },
      ...this.i18n.list('resources.freq').map((text) => ({ text, pause: 300 })),
      { text: t('resources.national_title'), pause: 450 },
      { text: t('resources.national_intro'), pause: 600 },
      { text: t('resources.assoc_title'), pause: 400 },
      ...links.associations.map((a) => ({
        text: `${t(`resources.assoc.${a.id}.name`)}. ${t(`resources.assoc.${a.id}.text`)}`,
        pause: 450,
      })),
      { text: t('resources.law_title'), pause: 450 },
      { text: t('resources.law_intro'), pause: 600 },
      ...links.laws.map((l) => ({
        text: `${t(`resources.law_items.${l.id}.title`)}. ${t(`resources.law_items.${l.id}.text`)}`,
        pause: 500,
      })),
    ];
  };
}
