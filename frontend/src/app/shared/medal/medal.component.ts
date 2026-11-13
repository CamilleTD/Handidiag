import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Pastille ronde contenant une icône. */
@Component({
  selector: 'app-medal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medal.component.html',
  styleUrl: './medal.component.scss',
})
export class MedalComponent {
  readonly name = input.required<string>();
}
