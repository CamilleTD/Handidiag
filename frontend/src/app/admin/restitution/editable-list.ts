import { Directive, OnInit, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { AdminApi, Collection } from '../admin-api.service';

/**
 * Logique commune aux listes éditables de la restitution : chargement, enregistrement,
 * suppression confirmée, réordonnancement et message d'état.
 */
@Directive()
export abstract class EditableList<T extends { id: number; key: string }> implements OnInit {
  protected readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  protected abstract readonly collection: Collection;

  readonly items = signal<T[]>([]);
  /** Élément ouvert en édition (id), ou « new » pour un ajout. */
  readonly editing = signal<number | 'new' | null>(null);
  readonly confirmDelete = signal<number | null>(null);
  readonly message = signal('');
  readonly failed = signal(false);
  readonly busy = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    await this.run(async () => this.items.set(await this.api.list<T>(this.collection)));
  }

  async save(id: number | 'new', body: unknown): Promise<void> {
    await this.run(async () => {
      if (id === 'new') await this.api.create(this.collection, body);
      else await this.api.update(this.collection, id, body);
      this.items.set(await this.api.list<T>(this.collection));
      this.editing.set(null);
      this.done('Enregistré. En ligne immédiatement.');
    });
  }

  async remove(item: T): Promise<void> {
    this.confirmDelete.set(null);
    await this.run(async () => {
      await this.api.remove(this.collection, item.id);
      this.items.update((list) => list.filter((i) => i.id !== item.id));
      this.done(`« ${item.key} » supprimé.`);
    });
  }

  async move(item: T, delta: number): Promise<void> {
    const list = [...this.items()];
    const index = list.findIndex((i) => i.id === item.id);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    await this.run(async () => {
      await this.api.reorder(
        this.collection,
        list.map((i) => i.id),
      );
      this.items.set(list);
      this.done(`« ${item.key} » déplacé.`);
    });
  }

  protected done(message: string): void {
    this.failed.set(false);
    this.message.set(message);
    void this.content.load();
  }

  protected async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.failed.set(true);
      this.message.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
