import { Injectable, inject } from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { ContentService } from './content.service';
import { I18nService } from './i18n.service';
import { QuizService } from './quiz.service';
import { RestitutionService } from './restitution.service';

type Block =
  | { type: 'title' | 'h2' | 'h3' | 'p' | 'notice' | 'bullet' | 'check' | 'small'; text: string }
  | { type: 'url'; text: string; url: string };

/**
 * Impression, PDF et résumé texte, fabriqués sur l'appareil : rien n'est envoyé.
 * Ils ne contiennent jamais les réponses détaillées, seulement l'orientation et les contacts.
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly quiz = inject(QuizService);
  private readonly restitution = inject(RestitutionService);
  private readonly analytics = inject(AnalyticsService);

  print(): void {
    this.analytics.send({ t: 'doc', doc: 'print' });
    window.print();
  }

  async resultPdf(): Promise<void> {
    await this.pdf(this.resultBlocks(), 'handidiag-orientation.pdf');
  }

  async kitPdf(): Promise<void> {
    await this.pdf(this.kitBlocks(), 'handidiag-kit.pdf');
  }

  summary(): void {
    const view = this.restitution.view();
    if (!view) return;
    const { t, text } = this.helpers();
    const lines = ['HandiDiag', ''];
    if (!view.result.poleOnly && view.level)
      lines.push(text(view.level.title), text(view.level.body, view.level.body_falc), '');
    const pole = this.poleText();
    if (pole) lines.push(t('pole_result.title').toUpperCase(), pole.title, pole.body, '');
    lines.push(t('result.contacts_title').toUpperCase());
    for (const c of view.contacts)
      lines.push(`- ${text(c.name)} : ${text(c.role)}${c.email ? ` (${c.email})` : ''}`);
    if (view.suggestions.length) {
      lines.push('', t('pdf.todo').toUpperCase(), t('result.todo_note'));
      lines.push(...view.suggestions.map((s) => `- ${text(s.text)}`));
    }
    lines.push('', t('kit.checklist_title').toUpperCase());
    lines.push(...this.i18n.list('kit.checklist').map((item) => `[ ] ${item}`));
    lines.push('', t('result.notdecision'), t('ui.footer_disclaimer'));
    this.save(
      new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
      'handidiag-resume.txt',
    );
    this.analytics.send({ t: 'doc', doc: 'summary_download' });
  }

  private helpers() {
    return {
      t: (path: string) => this.i18n.t(path),
      text: this.i18n.text.bind(this.i18n),
    };
  }

  private poleText(): { title: string; body: string } | null {
    const key = this.restitution.exportablePole();
    const message = key ? this.content.content().pole_outcomes[key] : null;
    return message
      ? { title: this.i18n.text(message.title), body: this.i18n.text(message.body) }
      : null;
  }

  private checklist(): Block[] {
    return [
      { type: 'h2', text: this.i18n.t('pdf.checklist') },
      ...this.i18n.list('kit.checklist').map((text): Block => ({ type: 'check', text })),
    ];
  }

  private resultBlocks(): Block[] {
    const view = this.restitution.view();
    if (!view) return [];
    const { t, text } = this.helpers();
    const blocks: Block[] = [{ type: 'title', text: t('pdf.result_title') }];
    if (!view.result.poleOnly && view.level)
      blocks.push(
        { type: 'h2', text: text(view.level.title) },
        { type: 'p', text: text(view.level.body, view.level.body_falc) },
      );
    blocks.push({ type: 'notice', text: t('result.notdecision') });
    const pole = this.poleText();
    if (pole)
      blocks.push(
        { type: 'h2', text: t('pole_result.title') },
        { type: 'h3', text: pole.title },
        { type: 'p', text: pole.body },
      );
    blocks.push({ type: 'h2', text: t('result.contacts_title') });
    for (const contact of view.contacts) {
      blocks.push(
        { type: 'h3', text: text(contact.name) },
        { type: 'p', text: text(contact.role) },
      );
      if (contact.email)
        blocks.push({ type: 'p', text: `${t('quiz.email_label')} : ${contact.email}` });
      if (contact.link_url)
        blocks.push({ type: 'url', text: contact.link_url, url: contact.link_url });
    }
    if (view.suggestions.length) {
      blocks.push(
        { type: 'h2', text: t('pdf.todo') },
        { type: 'notice', text: t('result.todo_note') },
      );
      blocks.push(...view.suggestions.map((s): Block => ({ type: 'bullet', text: text(s.text) })));
    }
    return [...blocks, ...this.checklist(), { type: 'small', text: t('ui.footer_disclaimer') }];
  }

  private kitBlocks(): Block[] {
    const { t } = this.helpers();
    const blocks: Block[] = [
      { type: 'title', text: t('pdf.kit_title') },
      { type: 'p', text: t('kit.intro') },
      { type: 'h2', text: t('pdf.links') },
    ];
    for (const link of this.content.links().official_links)
      blocks.push(
        { type: 'h3', text: t(`links.${link.id}.label`) },
        { type: 'p', text: t(`links.${link.id}.desc`) },
        { type: 'url', text: link.url, url: link.url },
      );
    blocks.push({ type: 'h2', text: t('pdf.guide') });
    this.i18n
      .steps('kit.guide')
      .forEach((step, i) =>
        blocks.push(
          { type: 'h3', text: `${i + 1}. ${step.title}` },
          { type: 'p', text: step.text },
        ),
      );
    blocks.push(...this.checklist(), { type: 'h2', text: t('kit.vigilance_title') });
    blocks.push(
      ...this.i18n.list('kit.vigilance').map((text): Block => ({ type: 'bullet', text })),
    );
    return [...blocks, { type: 'small', text: t('ui.footer_disclaimer') }];
  }

  /** Mise en page simple : A4, marges de 20 mm, pied de page numéroté. */
  private async pdf(blocks: Block[], filename: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setLanguage(this.i18n.lang() === 'fr' ? 'fr' : 'en-GB');
    const margin = 20;
    const width = 210 - margin * 2;
    const bottom = 297 - 22;
    let y = margin;

    const write = (text: string, size: number, style = 'normal', indent = 0, gap = 2) => {
      doc.setFont('helvetica', style).setFontSize(size);
      const lines: string[] = doc.splitTextToSize(text, width - indent);
      const height = lines.length * size * 0.42;
      if (y + height > bottom) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin + indent, y + size * 0.35);
      y += height + gap;
    };

    for (const block of blocks) {
      switch (block.type) {
        case 'title':
          write(block.text, 18, 'bold', 0, 6);
          break;
        case 'h2':
          y += 3;
          write(block.text, 14, 'bold', 0, 3);
          break;
        case 'h3':
          write(block.text, 11.5, 'bold', 0, 1.5);
          break;
        case 'p':
          write(block.text, 11);
          break;
        case 'notice':
          write(block.text, 10.5, 'italic');
          break;
        case 'bullet':
          write(`•  ${block.text}`, 11, 'normal', 3);
          break;
        case 'check':
          write(`[  ]  ${block.text}`, 11, 'normal', 3);
          break;
        case 'small':
          y += 4;
          write(block.text, 9, 'italic');
          break;
        case 'url':
          doc.setTextColor(10, 106, 102);
          write(block.text, 10);
          doc.link(margin, y - 6, width, 5, { url: block.url });
          doc.setTextColor(0, 0, 0);
          break;
      }
    }
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page).setFont('helvetica', 'normal').setFontSize(8.5);
      doc.text(this.i18n.t('pdf.footer', { n: page, total: pages }), margin, 297 - 12);
    }
    this.save(doc.output('blob'), filename);
    this.analytics.send({ t: 'doc', doc: 'pdf_download' });
  }

  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
