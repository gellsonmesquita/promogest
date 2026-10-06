import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { fromAcceptLanguage, isLocale, LOCALE_COOKIE, makeT, type Locale } from './core';

export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return fromAcceptLanguage((await headers()).get('accept-language'));
});

/** Tradutor para Server Components e Server Actions. */
export const getT = cache(async () => makeT(await getLocale()));
