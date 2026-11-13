import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminApi } from './admin-api.service';
import { adminT } from './admin-i18n';

/** Mise en page de l'administration : menu latéral et zone de travail. */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Styles de l'administration, chargés seulement avec elle
  encapsulation: ViewEncapsulation.None,
  styleUrl: './admin.scss',
  template: `
    <div class="admin-layout">
      <nav class="admin-side" [attr.aria-label]="t('nav.label')">
        <p class="admin-user">
          {{ t('nav.signed_in') }} <strong>{{ api.admin()?.username }}</strong>
        </p>
        @for (group of groups; track group.label) {
          @if (group.label) {
            <p class="admin-side-group">{{ t(group.label) }}</p>
          }
          <ul>
            @for (link of group.links; track link.path) {
              <li>
                <a
                  [routerLink]="link.path"
                  routerLinkActive="active"
                  ariaCurrentWhenActive="page"
                  [routerLinkActiveOptions]="{ exact: link.path === '/admin' }"
                  >{{ t(link.label) }}</a
                >
              </li>
            }
          </ul>
        }
        <button type="button" class="btn btn-small btn-quiet" (click)="logout()">
          {{ t('nav.logout') }}
        </button>
      </nav>
      <div class="admin-content">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminShell {
  protected readonly api = inject(AdminApi);
  protected readonly t = adminT();
  private readonly router = inject(Router);
  protected readonly groups = [
    {
      label: '',
      links: [
        { path: '/admin', label: 'nav.dashboard' },
        { path: '/admin/questionnaires', label: 'nav.questionnaires' },
      ],
    },
    {
      label: 'nav.library',
      links: [
        { path: '/admin/library/questions', label: 'nav.questions' },
        { path: '/admin/library/rules', label: 'nav.rules' },
        { path: '/admin/library/messages', label: 'nav.messages' },
      ],
    },
    {
      label: 'nav.content',
      links: [
        { path: '/admin/pages', label: 'nav.pages' },
        { path: '/admin/resources', label: 'nav.resources' },
      ],
    },
    { label: '', links: [{ path: '/admin/account', label: 'nav.account' }] },
  ];

  protected async logout(): Promise<void> {
    await this.api.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
