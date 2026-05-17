import en from './messages/en.json' with { type: 'json' };
import tw from './messages/tw.json' with { type: 'json' };
import ga from './messages/ga.json' with { type: 'json' };
import ee from './messages/ee.json' with { type: 'json' };

export const SUPPORTED_LOCALES = ['en', 'tw', 'ga', 'ee'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const messages: Record<SupportedLocale, Record<string, string>> = {
  en,
  tw,
  ga,
  ee,
};
