import 'server-only';
import type { Params, TKey } from '@/i18n/core';
import { getT } from '@/i18n/server';

export type { ActionResult } from './action-types';
import type { ActionResult } from './action-types';

/** Erro de validação/permissão; a mensagem é uma chave i18n traduzida para o idioma de quem fez o pedido. */
export class UserError extends Error {
  constructor(
    readonly key: TKey,
    readonly params?: Params,
  ) {
    super(key);
  }
}

export function fail(key: TKey, params?: Params): never {
  throw new UserError(key, params);
}

/** Executa uma ação de servidor e converte erros em resultado serializável para o cliente. */
export async function run<T = undefined>(fn: () => Promise<ActionResult<T> | void>): Promise<ActionResult<T>> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    // redirect()/notFound() lançam erros especiais que o Next tem de receber.
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e;
    const t = await getT();
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.params) };
    console.error(e);
    return { ok: false, error: t('common.unexpected') };
  }
}

/** Mensagem de sucesso traduzida. */
export async function okMsg<T = undefined>(key: TKey, params?: Params, data?: T): Promise<ActionResult<T>> {
  const t = await getT();
  return { ok: true, msg: t(key, params), data };
}
