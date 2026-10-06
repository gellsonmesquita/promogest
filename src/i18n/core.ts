import { en } from './dictionaries/en';
import { pt, type Dict } from './dictionaries/pt';

export const LOCALES = ['pt', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt';
export const LOCALE_COOKIE = 'pg_lang';

export const DICTIONARIES: Record<Locale, Dict> = { pt, en };

/** Locale BCP 47 usado para formatar datas e números. */
export const INTL_LOCALE: Record<Locale, string> = { pt: 'pt-PT', en: 'en-GB' };

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

// ---------- chaves tipadas ("secao.chave") ----------
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Leaves<Dict>;

export type Params = Record<string, string | number | null | undefined>;

function lookup(dict: Dict, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in cur) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Traduz uma chave e interpola `{param}`.
 * Valores de parâmetros começados por "@" são eles próprios chaves (ex.: "@status.falta").
 */
export function translate(dict: Dict, key: string, params?: Params): string | undefined {
  const tpl = lookup(dict, key);
  if (tpl === undefined) return undefined;
  if (!params) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name];
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.startsWith('@') ? (lookup(dict, s.slice(1)) ?? s.slice(1)) : s;
  });
}

export type Translator = {
  (key: TKey, params?: Params): string;
  /** Para chaves vindas da BD ou dinâmicas: se não existir no dicionário, devolve o texto tal como está. */
  dyn: (keyOrText: string, params?: Params | null) => string;
  locale: Locale;
  intl: string;
};

export function makeT(locale: Locale): Translator {
  const dict = DICTIONARIES[locale];
  const t = ((key: TKey, params?: Params) => translate(dict, key, params) ?? key) as Translator;
  t.dyn = (keyOrText, params) => translate(dict, keyOrText, params ?? undefined) ?? keyOrText;
  t.locale = locale;
  t.intl = INTL_LOCALE[locale];
  return t;
}

/** Escolhe o idioma a partir do cabeçalho Accept-Language (primeira visita). */
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(',')) {
    const lang = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
