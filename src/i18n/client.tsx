'use client';

import { createContext, useContext, useMemo } from 'react';
import { makeT, type Locale, type Translator } from './core';

const Ctx = createContext<Locale>('pt');

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

/** Tradutor para Client Components. */
export function useT(): Translator {
  const locale = useContext(Ctx);
  return useMemo(() => makeT(locale), [locale]);
}
