import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-locale-picker',
  standalone: true,
  template: `
    <select
      class="bg-transparent border border-slate-300 rounded px-2 py-1 text-sm"
      [value]="i18n.locale()"
      (change)="onChange($event)"
    >
      @for (loc of i18n.supported; track loc) {
        <option [value]="loc">{{ label(loc) }}</option>
      }
    </select>
  `,
})
export class LocalePickerComponent {
  protected readonly i18n = inject(I18nService);

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as
      | 'en'
      | 'tw'
      | 'ga'
      | 'ee';
    this.i18n.setLocale(value);
  }

  label(loc: string): string {
    return { en: 'English', tw: 'Twi', ga: 'Ga', ee: 'Ewe' }[loc] ?? loc;
  }
}
