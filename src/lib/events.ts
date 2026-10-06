import 'server-only';
import type { Tx } from '@/db';
import { auditoria, escalaHistorico, notificacoes, relatorioHistorico, type EvParams } from '@/db/schema';
import type { Dict } from '@/i18n/dictionaries/pt';

/** Chave de mensagem de evento (traduzida só na apresentação, no idioma de quem lê). */
export type EvKey = `ev.${keyof Dict['ev'] & string}`;
/** Parâmetro que é ele próprio uma chave a traduzir (ex.: estado). */
export const k = (key: string) => `@${key}`;

/** Histórico, notificações e auditoria — sempre dentro da mesma transação da alteração. */
export const ev = {
  escala: (tx: Tx, escalaId: string, userId: string | null, texto: EvKey, params?: EvParams) =>
    tx.insert(escalaHistorico).values({ escalaId, userId, texto, params }),
  relatorio: (tx: Tx, relatorioId: string, userId: string | null, texto: EvKey, params?: EvParams) =>
    tx.insert(relatorioHistorico).values({ relatorioId, userId, texto, params }),
  notificar: (tx: Tx, userId: string, texto: EvKey, params?: EvParams, link?: string) =>
    tx.insert(notificacoes).values({ userId, texto, params, link }),
  /** `detalhe` pode ser texto livre (nomes, ids) ou uma chave `ev.d*` interpolada com `params`. */
  auditar: (tx: Tx, userId: string | null, acao: EvKey, entidade: EvKey, detalhe = '', params?: EvParams) =>
    tx.insert(auditoria).values({ userId, acao, entidade, detalhe, params }),
};
