import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { ResourceSection } from '../../../core/models';
import { adminT } from '../../admin-i18n';
import { ResourceList } from '../resource-list/resource-list.component';

const SECTIONS: ResourceSection[] = ['official', 'public', 'association', 'law'];

/** Ressources, rangées par rubrique. */
@Component({
  imports: [ResourceList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resources.page.html',
  styleUrl: './resources.page.scss',
})
export class ResourcesAdminPage {
  protected readonly t = adminT();
  protected readonly sections = SECTIONS;
  protected readonly section = signal<ResourceSection>('official');
}
