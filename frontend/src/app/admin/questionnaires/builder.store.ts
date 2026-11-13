import { Injectable, InjectionToken, OnDestroy, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import type { Question } from '../../core/models';
import {
  AdminApi,
  ApiError,
  BankQuestion,
  ContactRow,
  LibraryRule,
  QuestionnaireDetail,
  QuestionnaireRow,
} from '../admin-api.service';
import { adminT } from '../admin-i18n';

/** Intervalle de renouvellement du verrou (le serveur le garde 120 s sans nouvelles). */
export const LOCK_HEARTBEAT_MS = new InjectionToken<number>('LOCK_HEARTBEAT_MS', {
  factory: () => 30_000,
});

/**
 * État du constructeur, partagé par ses onglets. Chaque modification renvoie le brouillon à jour
 * du questionnaire ; la version publiée ne change qu'au clic sur « Publier ».
 */
@Injectable()
export class BuilderStore implements OnDestroy {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  private readonly t = adminT();
  private readonly heartbeat = inject(LOCK_HEARTBEAT_MS);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lockedId: number | null = null;
  /** Vrai tant que cette session tient le verrou. */
  private holding = false;

  readonly detail = signal<QuestionnaireDetail | null>(null);
  readonly bank = signal<BankQuestion[]>([]);
  readonly rules = signal<LibraryRule[]>([]);
  readonly contacts = signal<ContactRow[]>([]);
  readonly questionnaires = signal<QuestionnaireRow[]>([]);
  readonly message = signal('');
  readonly failed = signal(false);
  readonly busy = signal(false);

  /**
   * Verrou de modification : un seul administrateur modifie le brouillon à la fois.
   * `lockedBy` contient le nom de l'autre administrateur quand l'écran est en lecture seule.
   */
  readonly lockedBy = signal<string | null>(null);
  readonly readOnly = computed(() => this.lockedBy() !== null);

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

  /** Ouvre la modification : prend le verrou puis le renouvelle tant que l'écran est ouvert. */
  async startEditing(id: number): Promise<void> {
    this.stopTimer();
    this.lockedId = id;
    await this.acquire();
    this.timer = setInterval(() => void this.acquire(), this.heartbeat);
  }

  /** Prend la main sur l'administrateur qui modifie (il passe en lecture seule). */
  async takeOver(): Promise<void> {
    await this.acquire(true);
  }

  /**
   * Prend ou renouvelle le verrou. En lecture seule, chaque tentative recharge aussi le
   * brouillon : on voit les modifications de l'autre, et on reprend la main dès qu'il part.
   */
  private async acquire(force = false): Promise<void> {
    const id = this.lockedId;
    if (id === null) return;
    const wasReadOnly = this.readOnly();
    try {
      await this.api.lock(id, force);
      this.holding = true;
      this.lockedBy.set(null);
      if (wasReadOnly) {
        this.detail.set(await this.api.questionnaire(id));
        this.message.set(this.t('lock.now_editing'));
        this.failed.set(false);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'questionnaire_locked') {
        const by = String(error.params['user'] ?? '?');
        if (this.holding) {
          // Quelqu'un a pris la main pendant qu'on modifiait
          this.message.set(this.t('lock.taken_over', { user: by }));
          this.failed.set(true);
        }
        this.holding = false;
        this.lockedBy.set(by);
        if (wasReadOnly)
          this.detail.set(await this.api.questionnaire(id).catch(() => this.detail()));
      }
      // Autre erreur (réseau…) : on réessaiera au prochain renouvellement
    }
  }

  /** Rend le verrou (sortie du constructeur). */
  release(): void {
    this.stopTimer();
    if (this.lockedId !== null && this.holding)
      void this.api.unlock(this.lockedId).catch(() => undefined);
    this.lockedId = null;
    this.holding = false;
  }

  /** Fermeture de l'onglet : la requête doit survivre à la page. */
  releaseOnExit(): void {
    this.stopTimer();
    if (this.lockedId !== null && this.holding) this.api.unlockOnExit(this.lockedId);
  }

  ngOnDestroy(): void {
    this.release();
  }

  private stopTimer(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
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
      if (error instanceof ApiError && error.code === 'questionnaire_locked') {
        this.holding = false;
        this.lockedBy.set(String(error.params['user'] ?? '?'));
      }
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
