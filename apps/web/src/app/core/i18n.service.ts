import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  messages,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@artisangh/shared-i18n';

const STORAGE_KEY = 'artisangh:locale';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly current = signal<SupportedLocale>(this.initial());

  readonly locale = computed(() => this.current());
  readonly supported = SUPPORTED_LOCALES;

  /** Lookup a key in the active locale; falls back to English then to the key itself. */
  t = (key: string): string => {
    const loc = this.current();
    return messages[loc]?.[key] ?? messages.en[key] ?? key;
  };

  setLocale(loc: SupportedLocale): void {
    this.current.set(loc);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, loc);
    } catch {
      /* ignore */
    }
  }

  private initial(): SupportedLocale {
    if (!this.isBrowser) return 'en';
    try {
      const stored = localStorage.getItem(
        STORAGE_KEY,
      ) as SupportedLocale | null;
      if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
    } catch {
      /* ignore */
    }
    const tag = (navigator?.language ?? 'en').toLowerCase();
    if (tag.startsWith('tw') || tag.startsWith('ak')) return 'tw';
    if (tag.startsWith('ga')) return 'ga';
    if (tag.startsWith('ee') || tag.startsWith('ew')) return 'ee';
    return 'en';
  }
}
