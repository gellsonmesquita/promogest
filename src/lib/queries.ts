import 'server-only';
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import {
  auditoria,
  clientes,
  equipas,
  escalaHistorico,
  escalas,
  fotos,
  marcas,
  notificacoes,
  ocorrencias,
  pdvs,
  relatorioHistorico,
  relatorios,
  servicoPdvs,
  servicos,
  users,
  type User,
} from '@/db/schema';

const isGestao = (u: User) => u.role === 'admin' || u.role === 'gestor';
const isFieldUser = (u: User) => u.role === 'promotora' || u.role === 'merchandiser';

// ---------- âmbito por perfil ----------
export function escalaScope(u: User): SQL | undefined {
  if (isGestao(u)) return undefined;
  if (u.role === 'supervisor') return eq(escalas.supervisorId, u.id);
  return eq(escalas.promotoraId, u.id);
}

export function servicoScope(u: User): SQL | undefined {
  if (isGestao(u)) return undefined;
  if (u.role === 'supervisor') return eq(servicos.supervisorId, u.id);
  return inArray(servicos.id, db.select({ id: escalas.servicoId }).from(escalas).where(eq(escalas.promotoraId, u.id)));
}

// ---------- referências (nomes) ----------
/** Tabelas pequenas usadas para mostrar nomes. Sem dados sensíveis (sem hash, sem contratos). */
export const getRefs = cache(async () => {
  const [us, ps, ss, cs, ms, es] = await Promise.all([
    db.select({ id: users.id, nome: users.nome, role: users.role, equipaId: users.equipaId, estado: users.estado }).from(users),
    db.select({ id: pdvs.id, nome: pdvs.nome, endereco: pdvs.endereco, zona: pdvs.zona }).from(pdvs),
    db.select({ id: servicos.id, nome: servicos.nome, tipo: servicos.tipo, produto: servicos.produto, clienteId: servicos.clienteId, marcaId: servicos.marcaId, supervisorId: servicos.supervisorId }).from(servicos),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes),
    db.select({ id: marcas.id, nome: marcas.nome, clienteId: marcas.clienteId }).from(marcas),
    db.select().from(equipas),
  ]);
  const map = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const userMap = map(us);
  return {
    users: userMap,
    pdvs: map(ps),
    servicos: map(ss),
    clientes: map(cs),
    marcas: map(ms),
    equipas: map(es),
    nome: (id?: string | null) => (id ? (userMap.get(id)?.nome ?? '—') : '—'),
  };
});
export type Refs = Awaited<ReturnType<typeof getRefs>>;

// ---------- escalas ----------
export async function listEscalas(u: User, f: { de?: string; ate?: string; servicoId?: string; promotoraId?: string } = {}) {
  const conds = [
    escalaScope(u),
    f.de ? gte(escalas.data, f.de) : undefined,
    f.ate ? lte(escalas.data, f.ate) : undefined,
    f.servicoId ? eq(escalas.servicoId, f.servicoId) : undefined,
    f.promotoraId ? eq(escalas.promotoraId, f.promotoraId) : undefined,
  ];
  return db.select().from(escalas).where(and(...conds)).orderBy(asc(escalas.data), asc(escalas.horaInicio));
}

export async function getEscala(u: User, id: string) {
  const [e] = await db.select().from(escalas).where(and(eq(escalas.id, id), escalaScope(u)));
  return e ?? null;
}

export async function getEscalaHistorico(escalaId: string) {
  return db.select().from(escalaHistorico).where(eq(escalaHistorico.escalaId, escalaId)).orderBy(asc(escalaHistorico.data));
}

// ---------- relatórios ----------
const relatorioCols = {
  id: relatorios.id,
  escalaId: relatorios.escalaId,
  servicoId: relatorios.servicoId,
  autorId: relatorios.autorId,
  tipo: relatorios.tipo,
  estado: relatorios.estado,
  quantidade: relatorios.quantidade,
  enviadoEm: relatorios.enviadoEm,
  data: escalas.data,
  pdvId: escalas.pdvId,
  supervisorId: escalas.supervisorId,
  nFotos: sql<number>`(select count(*)::int from ${fotos} where ${fotos.relatorioId} = ${relatorios.id})`,
  fotoId: sql<string | null>`(select ${fotos.id} from ${fotos} where ${fotos.relatorioId} = ${relatorios.id} order by ${fotos.capturadaEm} limit 1)`,
};

export async function listRelatorios(u: User, f: { estados?: string[]; tipo?: string; servicoIds?: string[] } = {}) {
  return db
    .select(relatorioCols)
    .from(relatorios)
    .innerJoin(escalas, eq(escalas.id, relatorios.escalaId))
    .where(
      and(
        escalaScope(u),
        f.estados?.length ? inArray(relatorios.estado, f.estados as never[]) : undefined,
        f.tipo ? eq(relatorios.tipo, f.tipo as 'promotora' | 'merchandising') : undefined,
        f.servicoIds?.length ? inArray(relatorios.servicoId, f.servicoIds) : undefined,
      ),
    )
    .orderBy(desc(relatorios.enviadoEm));
}
export type RelatorioRow = Awaited<ReturnType<typeof listRelatorios>>[number];

export async function getRelatorio(u: User, id: string) {
  const [row] = await db
    .select({ r: relatorios, e: escalas })
    .from(relatorios)
    .innerJoin(escalas, eq(escalas.id, relatorios.escalaId))
    .where(and(eq(relatorios.id, id), escalaScope(u)));
  if (!row) return null;
  const [fs, hist] = await Promise.all([listFotos(row.r.id), db.select().from(relatorioHistorico).where(eq(relatorioHistorico.relatorioId, id)).orderBy(asc(relatorioHistorico.data))]);
  return { ...row, fotos: fs, historico: hist };
}

export async function getRelatorioDaEscala(escalaId: string) {
  const [r] = await db.select().from(relatorios).where(eq(relatorios.escalaId, escalaId));
  return r ?? null;
}

export async function listFotos(relatorioId: string) {
  return db
    .select({ id: fotos.id, fase: fotos.fase, legenda: fotos.legenda, autorId: fotos.autorId, capturadaEm: fotos.capturadaEm })
    .from(fotos)
    .where(eq(fotos.relatorioId, relatorioId))
    .orderBy(asc(fotos.capturadaEm));
}

export async function fotosRecentes(u: User, limit = 8) {
  return db
    .select({ id: fotos.id, fase: fotos.fase, legenda: fotos.legenda, autorId: fotos.autorId, capturadaEm: fotos.capturadaEm, relatorioId: fotos.relatorioId })
    .from(fotos)
    .innerJoin(relatorios, eq(relatorios.id, fotos.relatorioId))
    .innerJoin(escalas, eq(escalas.id, relatorios.escalaId))
    .where(and(escalaScope(u), sql`${relatorios.estado} <> 'rascunho'`))
    .orderBy(desc(fotos.capturadaEm))
    .limit(limit);
}

// ---------- serviços ----------
export async function listServicos(u: User) {
  return db.select().from(servicos).where(servicoScope(u)).orderBy(desc(servicos.inicio));
}

export async function getServico(u: User, id: string) {
  const [s] = await db.select().from(servicos).where(and(eq(servicos.id, id), servicoScope(u)));
  if (!s) return null;
  const ps = await db.select({ pdvId: servicoPdvs.pdvId }).from(servicoPdvs).where(eq(servicoPdvs.servicoId, id));
  return { ...s, pdvIds: ps.map((p) => p.pdvId) };
}

export async function pdvsPorServico(servicoIds: string[]) {
  if (!servicoIds.length) return new Map<string, string[]>();
  const rows = await db.select().from(servicoPdvs).where(inArray(servicoPdvs.servicoId, servicoIds));
  const m = new Map<string, string[]>();
  for (const r of rows) m.set(r.servicoId, [...(m.get(r.servicoId) ?? []), r.pdvId]);
  return m;
}

// ---------- pessoas ----------
export async function equipasVisiveis(u: User) {
  if (isGestao(u)) return db.select().from(equipas).orderBy(asc(equipas.nome));
  if (u.role === 'supervisor') return db.select().from(equipas).where(eq(equipas.supervisorId, u.id));
  return u.equipaId ? db.select().from(equipas).where(eq(equipas.id, u.equipaId)) : [];
}

/** Pessoas de campo das equipas visíveis (sem hash de palavra-passe). */
export async function equipaDeCampo(u: User) {
  const eqs = await equipasVisiveis(u);
  if (!eqs.length) return [];
  return db
    .select({ id: users.id, nome: users.nome, email: users.email, telefone: users.telefone, role: users.role, equipaId: users.equipaId, zona: users.zona, estado: users.estado })
    .from(users)
    .where(and(inArray(users.equipaId, eqs.map((e) => e.id)), inArray(users.role, ['promotora', 'merchandiser'])))
    .orderBy(asc(users.nome));
}

export async function listUsers() {
  return db
    .select({ id: users.id, nome: users.nome, email: users.email, telefone: users.telefone, role: users.role, equipaId: users.equipaId, zona: users.zona, estado: users.estado })
    .from(users)
    .orderBy(asc(users.role), asc(users.nome));
}

// ---------- outros ----------
export async function ocorrenciasAbertas(u: User) {
  return db
    .select({ o: ocorrencias })
    .from(ocorrencias)
    .innerJoin(escalas, eq(escalas.id, ocorrencias.escalaId))
    .where(and(escalaScope(u), eq(ocorrencias.resolvida, false)))
    .orderBy(desc(ocorrencias.data))
    .then((rows) => rows.map((r) => r.o));
}

export async function listNotificacoes(u: User) {
  return db.select().from(notificacoes).where(eq(notificacoes.userId, u.id)).orderBy(desc(notificacoes.data)).limit(100);
}

export async function contarNaoLidas(u: User) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(notificacoes).where(and(eq(notificacoes.userId, u.id), eq(notificacoes.lida, false)));
  return r?.n ?? 0;
}

export async function contarPendentes(u: User) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(relatorios)
    .innerJoin(escalas, eq(escalas.id, relatorios.escalaId))
    .where(and(escalaScope(u), inArray(relatorios.estado, ['enviado', 'reenviado', 'em_analise'])));
  return r?.n ?? 0;
}

export async function listAuditoria(limit = 300) {
  return db.select().from(auditoria).orderBy(desc(auditoria.data)).limit(limit);
}

export { isFieldUser, isGestao };
