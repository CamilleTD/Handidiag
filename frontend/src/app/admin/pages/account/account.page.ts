import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../admin-api.service';
import { adminT } from '../../admin-i18n';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
})
export class AccountPage {
  protected readonly api = inject(AdminApi);
  protected readonly t = adminT();
  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirm = signal('');
  protected readonly message = signal('');
  protected readonly failed = signal(false);

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.failed.set(true);
    if (this.next() !== this.confirm()) {
      this.message.set(this.t('account.mismatch'));
      return;
    }
    try {
      await this.api.changePassword(this.current(), this.next());
      this.failed.set(false);
      this.message.set(this.t('account.changed'));
    } catch (error) {
      this.message.set((error as Error).message);
    }
  }
}
