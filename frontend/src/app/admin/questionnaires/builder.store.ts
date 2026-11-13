import { Injectable, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import type { Question } from '../../core/models';
import {
  AdminApi,
  BankQuestion,
  ContactRow,
  LibraryRule,
  QuestionnaireDetail,
  QuestionnaireRow,
} from '../admin-api.service';
import { adminT } from '../admin-i18n';

/**
 * État du constructeur, partagé par ses onglets. Chaque modification renvoie le brouillon à jour
 * du questionnaire ; la version publiée ne change qu'au clic sur « Publier ».
 */
@Injectable()
export class BuilderStore {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  private readonly t = adminT();

  readonly detail = signal<QuestionnaireDetail | null>(null);
  readonly bank = signal<BankQuestion[]>([]);
  readonly rules = signal<LibraryRule[]>([]);
  readonly contacts = signal<ContactRow[]>([]);
  readonly questionnaires = signal<QuestionnaireRow[]>([]);
  readonly message = signal('');
  readonly failed = signal(false);
  readonly busy = signal(false);

  /** Questions placées dans ce questionnaire (pour les conditions). */
  readonly placed = computed<Question[]>(() => {
    const keys = new Set(this.detail()?.sections.flatMap((s) => s.items.map((i) => i.question)));
    return this.bank().filter((q) => keys.has(q.key));
  });

  question(key: string): BankQuestion | undefined {
    return this.bank().find((q) => q.key === key);
  }

  async load(id: number): Promise<void> {
    await this.run(async () => {
      const [detail, bank, rules, contacts, questionnaires] = await Promise.all([
        this.api.questionnaire(id),
        this.api.list<BankQuestion>('questions'),
        this.api.list<LibraryRule>('rules'),
        this.api.list<ContactRow>('contacts'),
        this.api.questionnaires(),
      ]);
      this.detail.set(detail);
      this.bank.set(bank);
      this.rules.set(rules);
      this.contacts.set(contacts);
      this.questionnaires.set(questionnaires);
    }, '');
  }

  /** Modifie le brouillon ; renvoie vrai si le serveur a accepté. */
  async change(
    method: 'post' | 'put' | 'delete',
    path: string,
    body: unknown = {},
    success = this.t('builder.saved_draft'),
  ): Promise<boolean> {
    const id = this.detail()?.id;
    if (!id) return false;
    return this.run(async () => {
      this.detail.set(await this.api.questionnaire(id, method, path, body));
      if (path === '/publish' || path === '/unpublish' || path.includes('/restore'))
        void this.content.load();
    }, success);
  }

  private async run(action: () => Promise<void>, success: string): Promise<boolean> {
    this.busy.set(true);
    try {
      await action();
      this.failed.set(false);
      this.message.set(success);
      return true;
    } catch (error) {
      this.failed.set(true);
      this.message.set((error as Error).message);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
