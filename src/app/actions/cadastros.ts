'use server';

import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { clientes, equipas, marcas, notificacoes, pdvs, servicoPdvs, servicos, users } from '@/db/schema';
import type { TKey } from '@/i18n/core';
import { fail, okMsg, run, type ActionResult } from '@/lib/action';
import { assertUser, GESTAO } from '@/lib/auth';
import { ev, k } from '@/lib/events';
import { ACOES_MERCH, ROLES, SERVICO_TIPOS } from '@/lib/labels';

const uuidOpt = z.string().uuid().optional().or(z.literal('').transform(() => undefined));
const lines = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

/** Valida com zod; as mensagens dos schemas são chaves i18n ("err.*"). */
function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const msg = r.error.issues[0]?.message ?? '';
    fail(msg.startsWith('err.') ? (msg as TKey) : 'err.dadosInvalidos');
  }
  return r.data;
}

// ---------- serviços ----------
const servicoSchema = z.object({
  id: uuidOpt,
  tipo: z.enum(SERVICO_TIPOS),
  nome: z.string().trim().min(3, 'err.nomeServico'),
  clienteId: z.string().uuid('err.selCliente'),
  marcaId: z.string().uuid('err.selMarca'),
  produto: z.string().default(''),
  objetivo: z.string().default(''),
  meta: z.coerce.number().int().min(0).default(0),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'err.dataInicio'),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'err.dataFim'),
  zona: z.string().default(''),
  equipaId: z.string().uuid('err.selEquipa'),
  supervisorId: z.string().uuid('err.selSupervisor'),
  pdvIds: z.array(z.string().uuid()).min(1, 'err.selPdv'),
  materiais: z.string().default(''),
  observacoes: z.string().default(''),
  checklist: z.array(z.string()).default([]),
  acao: z.enum(ACOES_MERCH).nullable().optional(),
  qtdPrevista: z.coerce.number().int().min(0).nullable().optional(),
});
export type ServicoInput = z.input<typeof servicoSchema>;

export async function guardarServico(input: ServicoInput): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    const s = parse(servicoSchema, input);
    if (s.fim < s.inicio) fail('err.fimAntesInicio');
    const [m] = await db.select().from(marcas).where(eq(marcas.id, s.marcaId));
    if (!m || m.clienteId !== s.clienteId) fail('err.marcaCliente');
    const merch = s.tipo === 'merchandising';
    const values = {
      tipo: s.tipo, nome: s.nome, clienteId: s.clienteId, marcaId: s.marcaId, produto: s.produto, objetivo: s.objetivo, meta: s.meta,
      inicio: s.inicio, fim: s.fim, zona: s.zona, equipaId: s.equipaId, supervisorId: s.supervisorId, materiais: s.materiais,
      observacoes: s.observacoes, checklist: lines(s.checklist), acao: merch ? (s.acao ?? 'outro') : null, qtdPrevista: merch ? (s.qtdPrevista ?? 0) : null,
    };
    const id = await db.transaction(async (tx) => {
      let id = s.id;
      if (id) {
        const [upd] = await tx.update(servicos).set(values).where(eq(servicos.id, id)).returning({ id: servicos.id });
        if (!upd) fail('err.servicoNaoEncontrado');
        await tx.delete(servicoPdvs).where(eq(servicoPdvs.servicoId, id));
      } else {
        [{ id }] = await tx.insert(servicos).values(values).returning({ id: servicos.id });
      }
      await tx.insert(servicoPdvs).values(s.pdvIds.map((pdvId) => ({ servicoId: id!, pdvId })));
      await ev.auditar(tx, u.id, s.id ? 'ev.aAtualizou' : 'ev.aCriou', 'ev.eServico', s.nome, { entidade: k('ev.eServico') });
      if (!s.id) await ev.notificar(tx, s.supervisorId, 'ev.nNovoServico', { nome: s.nome }, `/app/servicos/${id}`);
      return id!;
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.servico', undefined, { id });
  });
}

const TRANSICOES: Record<string, string[]> = {
  rascunho: ['planeado', 'cancelado'],
  planeado: ['em_execucao', 'cancelado'],
  em_execucao: ['concluido', 'cancelado'],
};

export async function mudarEstadoServico(id: string, para: 'planeado' | 'em_execucao' | 'concluido' | 'cancelado'): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    await db.transaction(async (tx) => {
      const [s] = await tx.select().from(servicos).where(eq(servicos.id, id));
      if (!s) fail('err.servicoNaoEncontrado');
      if (!TRANSICOES[s.estado]?.includes(para)) fail('err.transicao');
      await tx.update(servicos).set({ estado: para }).where(eq(servicos.id, id));
      await ev.auditar(tx, u.id, 'ev.aServicoEstado', 'ev.eServico', s.nome, { estado: k(`status.${para}`) });
      await ev.notificar(tx, s.supervisorId, 'ev.nServicoEstado', { nome: s.nome, estado: k(`status.${para}`) }, `/app/servicos/${id}`);
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.estadoServico');
  });
}

// ---------- clientes / marcas / PDVs ----------
const clienteSchema = z.object({
  id: uuidOpt,
  nome: z.string().trim().min(2, 'err.indiqueNome'),
  nif: z.string().default(''),
  responsavel: z.string().default(''),
  contacto: z.string().default(''),
  email: z.string().default(''),
  contratos: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
});

export async function guardarCliente(input: z.input<typeof clienteSchema>): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    const { id, ...c } = parse(clienteSchema, input);
    const values = { ...c, contratos: lines(c.contratos) };
    await db.transaction(async (tx) => {
      if (id) await tx.update(clientes).set(values).where(eq(clientes.id, id));
      else await tx.insert(clientes).values(values);
      await ev.auditar(tx, u.id, id ? 'ev.aAtualizou' : 'ev.aCriou', 'ev.eCliente', c.nome, { entidade: k('ev.eCliente') });
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.cliente');
  });
}

const marcaSchema = z.object({
  id: uuidOpt,
  clienteId: z.string().uuid('err.selCliente'),
  nome: z.string().trim().min(1, 'err.indiqueNome'),
  produtos: z.array(z.string()).default([]),
});

export async function guardarMarca(input: z.input<typeof marcaSchema>): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    const { id, ...m } = parse(marcaSchema, input);
    const values = { ...m, produtos: lines(m.produtos) };
    await db.transaction(async (tx) => {
      if (id) await tx.update(marcas).set(values).where(eq(marcas.id, id));
      else await tx.insert(marcas).values(values);
      await ev.auditar(tx, u.id, id ? 'ev.aAtualizou' : 'ev.aCriou', 'ev.eMarca', m.nome, { entidade: k('ev.eMarca') });
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.marca');
  });
}

const pdvSchema = z.object({
  id: uuidOpt,
  nome: z.string().trim().min(2, 'err.indiqueNome'),
  endereco: z.string().default(''),
  zona: z.string().default(''),
  ativo: z.boolean().default(true),
});

export async function guardarPdv(input: z.input<typeof pdvSchema>): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    const { id, ...p } = parse(pdvSchema, input);
    await db.transaction(async (tx) => {
      if (id) await tx.update(pdvs).set(p).where(eq(pdvs.id, id));
      else await tx.insert(pdvs).values(p);
      await ev.auditar(tx, u.id, id ? 'ev.aAtualizou' : 'ev.aCriou', 'ev.ePdv', p.nome, { entidade: k('ev.ePdv') });
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.pdv');
  });
}

// ---------- pessoas ----------
const userSchema = z.object({
  id: uuidOpt,
  nome: z.string().trim().min(2, 'err.indiqueNome'),
  email: z.string().trim().toLowerCase().email('err.emailInvalido'),
  telefone: z.string().default(''),
  role: z.enum(ROLES),
  equipaId: uuidOpt,
  zona: z.string().default(''),
  estado: z.enum(['ativa', 'inativa', 'suspensa']),
  password: z.string().optional().or(z.literal('')),
});

export async function guardarUser(input: z.input<typeof userSchema>): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    const p = parse(userSchema, input);
    if (u.role !== 'admin' && (p.role === 'admin' || p.role === 'gestor')) fail('err.soAdmin');
    if (p.id === u.id && p.estado !== 'ativa') fail('err.inativarPropria');
    if (!p.id && (!p.password || p.password.length < 8)) fail('err.pwInicial');
    if (p.id && p.password && p.password.length < 8) fail('err.pwMin');
    const [dup] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, p.email), p.id ? ne(users.id, p.id) : undefined));
    if (dup) fail('err.emailDuplicado');

    await db.transaction(async (tx) => {
      if (p.id) {
        const [atual] = await tx.select().from(users).where(eq(users.id, p.id));
        if (!atual) fail('err.userNaoEncontrado');
        if (u.role !== 'admin' && (atual.role === 'admin' || atual.role === 'gestor') && atual.id !== u.id) fail('err.semPermUser');
        await tx
          .update(users)
          .set({
            nome: p.nome, email: p.email, telefone: p.telefone, role: u.role === 'admin' ? p.role : atual.role, equipaId: p.equipaId ?? null, zona: p.zona, estado: p.estado,
            ...(p.password ? { passwordHash: await bcrypt.hash(p.password, 10) } : {}),
          })
          .where(eq(users.id, p.id));
        if (p.role === 'supervisor' && p.equipaId) await tx.update(equipas).set({ supervisorId: p.id }).where(eq(equipas.id, p.equipaId));
      } else {
        const [novo] = await tx
          .insert(users)
          .values({ nome: p.nome, email: p.email, telefone: p.telefone, role: p.role, equipaId: p.equipaId ?? null, zona: p.zona, estado: p.estado, passwordHash: await bcrypt.hash(p.password!, 10) })
          .returning({ id: users.id });
        if (p.role === 'supervisor' && p.equipaId) await tx.update(equipas).set({ supervisorId: novo.id }).where(eq(equipas.id, p.equipaId));
      }
      await ev.auditar(tx, u.id, p.id ? 'ev.aAtualizou' : 'ev.aCriou', 'ev.eUtilizador', p.password ? 'ev.dPassword' : 'ev.dUser', {
        entidade: k('ev.eUtilizador'), nome: p.nome, perfil: k(`roles.${p.role}`), estado: k(`status.${p.estado}`),
      });
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.pessoa');
  });
}

const equipaSchema = z.object({
  id: uuidOpt,
  nome: z.string().trim().min(2, 'err.indiqueNome'),
  area: z.enum(['promocao', 'merchandising']),
  supervisorId: uuidOpt,
  ativa: z.boolean().default(true),
});

export async function guardarEquipa(input: z.input<typeof equipaSchema>): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(GESTAO);
    const { id, ...e } = parse(equipaSchema, input);
    const values = { ...e, supervisorId: e.supervisorId ?? null };
    await db.transaction(async (tx) => {
      if (id) await tx.update(equipas).set(values).where(eq(equipas.id, id));
      else await tx.insert(equipas).values(values);
      await ev.auditar(tx, u.id, id ? 'ev.aAtualizou' : 'ev.aCriou', 'ev.eEquipa', e.nome, { entidade: k('ev.eEquipa') });
    });
    revalidatePath('/app', 'layout');
    return okMsg('ok.equipa');
  });
}

// ---------- notificações ----------
export async function marcarLida(id: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser();
    await db.update(notificacoes).set({ lida: true }).where(and(eq(notificacoes.id, id), eq(notificacoes.userId, u.id)));
    revalidatePath('/', 'layout');
  });
}

export async function marcarTodasLidas(): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser();
    await db.update(notificacoes).set({ lida: true }).where(eq(notificacoes.userId, u.id));
    revalidatePath('/', 'layout');
  });
}
