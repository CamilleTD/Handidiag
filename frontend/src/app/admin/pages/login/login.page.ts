import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApi } from '../../admin-api.service';
import { adminT } from '../../admin-i18n';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.username().trim() || !this.password()) {
      this.error.set(this.t('login.fill'));
      return;
    }
    this.busy.set(true);
    try {
      const admin = await this.api.login(this.username().trim(), this.password());
      void this.router.navigateByUrl(admin.must_change_password ? '/admin/account' : '/admin');
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
