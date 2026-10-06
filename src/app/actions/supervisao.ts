'use server';

import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db, type Tx } from '@/db';
import { escalas, ocorrencias, relatorios, servicoPdvs, servicos, users, type Escala, type User } from '@/db/schema';
import { fail, okMsg, run, type ActionResult } from '@/lib/action';
import { assertUser, WEB_ROLES } from '@/lib/auth';
import { addDays, agoraHHmm, hm, overlaps } from '@/lib/dates';
import { ev, k } from '@/lib/events';
import { escalaScope } from '@/lib/queries';

function refresh() {
  revalidatePath('/app', 'layout');
  revalidatePath('/m', 'layout');
}

/** Escala sob responsabilidade do utilizador (supervisor da escala, ou gestão). */
async function escalaGerida(tx: Tx, u: User, id: string): Promise<Escala> {
  const [e] = await tx.select().from(escalas).where(and(eq(escalas.id, id), escalaScope(u)));
  if (!e) fail('err.escalaNaoEncontrada');
  return e;
}

async function nomeDe(tx: Tx, id: string) {
  const [x] = await tx.select({ nome: users.nome }).from(users).where(eq(users.id, id));
  return x?.nome ?? '—';
}

async function conflitos(tx: Tx, promotoraId: string, data: string, hi: string, hf: string, ignorar?: string) {
  const rows = await tx
    .select()
    .from(escalas)
    .where(and(eq(escalas.promotoraId, promotoraId), eq(escalas.data, data), notInArray(escalas.estado, ['cancelada', 'substituida'])));
  return rows.filter((e) => e.id !== ignorar && overlaps(hi, hf, e.horaInicio, e.horaFim));
}

const PRESENCAS = ['presente', 'atrasado', 'falta'] as const;

export async function registarPresenca(escalaId: string, estado: (typeof PRESENCAS)[number]): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    if (!PRESENCAS.includes(estado)) fail('err.estadoInvalido');
    let nome = '';
    await db.transaction(async (tx) => {
      const e = await escalaGerida(tx, u, escalaId);
      if (!['planeada', 'confirmada'].includes(e.estado)) fail('err.escalaInativa');
      nome = await nomeDe(tx, e.promotoraId);
      await tx
        .update(escalas)
        .set({ presencaEstado: estado, presencaHora: e.presencaHora ?? agoraHHmm(), presencaValidada: true, estado: estado === 'falta' ? 'falta' : 'confirmada' })
        .where(eq(escalas.id, e.id));
      await ev.escala(tx, e.id, u.id, 'ev.presencaSupervisor', { estado: k(`status.${estado}`) });
      if (estado === 'falta') await ev.notificar(tx, e.promotoraId, 'ev.nFalta', { data: e.data }, '/m/hoje');
      await ev.auditar(tx, u.id, 'ev.aPresenca', 'ev.eEscala', `${nome} – ${e.data}`, { estado: k(`status.${estado}`) });
    });
    refresh();
    return okMsg('ok.presencaRegistada', { nome });
  });
}

export async function validarPresenca(escalaId: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    await db.transaction(async (tx) => {
      const e = await escalaGerida(tx, u, escalaId);
      if (!e.presencaEstado) fail('err.semPresenca');
      await tx.update(escalas).set({ presencaValidada: true }).where(eq(escalas.id, e.id));
      await ev.escala(tx, e.id, u.id, 'ev.presencaValidada');
    });
    refresh();
    return okMsg('ok.presencaValidada');
  });
}

export async function substituir(escalaId: string, substitutaId: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    await db.transaction(async (tx) => {
      const e = await escalaGerida(tx, u, escalaId);
      if (!['planeada', 'confirmada'].includes(e.estado)) fail('err.escalaInativa');
      const [sub] = await tx.select().from(users).where(eq(users.id, substitutaId));
      if (!sub || sub.estado !== 'ativa' || !['promotora', 'merchandiser'].includes(sub.role)) fail('err.substitutaInvalida');
      if ((await conflitos(tx, sub.id, e.data, e.horaInicio, e.horaFim)).length) fail('err.jaTemEscala', { nome: sub.nome });
      const original = await nomeDe(tx, e.promotoraId);

      await tx
        .update(escalas)
        .set({ estado: 'substituida', substitutaId: sub.id, presencaEstado: 'substituido', presencaHora: e.presencaHora ?? agoraHHmm(), presencaValidada: true })
        .where(eq(escalas.id, e.id));
      await ev.escala(tx, e.id, u.id, 'ev.substituidaPor', { nome: sub.nome });
      const [nova] = await tx
        .insert(escalas)
        .values({ servicoId: e.servicoId, pdvId: e.pdvId, promotoraId: sub.id, supervisorId: e.supervisorId, data: e.data, horaInicio: e.horaInicio, horaFim: e.horaFim })
        .returning();
      await ev.escala(tx, nova.id, u.id, 'ev.escalaSubstituicao', { nome: original });
      await ev.notificar(tx, sub.id, 'ev.nSubstituta', { data: e.data, hi: hm(e.horaInicio), hf: hm(e.horaFim) }, `/m/atividade/${nova.id}`);
      await ev.notificar(tx, e.promotoraId, 'ev.nAtribuidaOutra', { data: e.data }, '/m/hoje');
      await ev.auditar(tx, u.id, 'ev.aSubstituicao', 'ev.eEscala', `${original} → ${sub.nome} (${e.data})`);
    });
    refresh();
    return okMsg('ok.substituicao');
  });
}

export async function cancelarEscala(escalaId: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    await db.transaction(async (tx) => {
      const e = await escalaGerida(tx, u, escalaId);
      if (!['planeada', 'confirmada'].includes(e.estado)) fail('err.escalaInativa');
      await tx.update(escalas).set({ estado: 'cancelada', presencaEstado: 'cancelado' }).where(eq(escalas.id, e.id));
      await ev.escala(tx, e.id, u.id, 'ev.escalaCancelada');
      await ev.notificar(tx, e.promotoraId, 'ev.nCancelada', { data: e.data }, '/m/hoje');
      await ev.auditar(tx, u.id, 'ev.aCancelouEscala', 'ev.eEscala', `${await nomeDe(tx, e.promotoraId)} – ${e.data}`);
    });
    refresh();
    return okMsg('ok.escalaCancelada');
  });
}

const novaEscalaSchema = z.object({
  servicoId: z.string().uuid(),
  pdvId: z.string().uuid(),
  promotoraIds: z.array(z.string().uuid()).min(1),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hi: z.string().regex(/^\d{2}:\d{2}$/),
  hf: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function criarEscalas(input: z.input<typeof novaEscalaSchema>): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    if (!input.promotoraIds?.length) fail('err.selecionePessoa');
    const parsed = novaEscalaSchema.safeParse(input);
    if (!parsed.success) fail('err.dadosInvalidos');
    const f = parsed.data;
    if (f.ate < f.de) fail('err.dataFinal');
    if (f.hf <= f.hi) fail('err.horaFim');
    const datas: string[] = [];
    for (let d = f.de; d <= f.ate; d = addDays(d, 1)) {
      datas.push(d);
      if (datas.length > 62) fail('err.periodoMax');
    }

    let criadas = 0;
    let ignoradas = 0;
    await db.transaction(async (tx) => {
      const [s] = await tx.select().from(servicos).where(eq(servicos.id, f.servicoId));
      if (!s) fail('err.servicoNaoEncontrado');
      if (u.role === 'supervisor' && s.supervisorId !== u.id) fail('err.soSeusServicos');
      if (['concluido', 'cancelado'].includes(s.estado)) fail('err.servicoEncerrado');
      const [link] = await tx.select().from(servicoPdvs).where(and(eq(servicoPdvs.servicoId, s.id), eq(servicoPdvs.pdvId, f.pdvId)));
      if (!link) fail('err.pdvForaServico');
      const pessoas = await tx.select().from(users).where(inArray(users.id, f.promotoraIds));
      for (const p of pessoas) {
        if (p.estado !== 'ativa' || !['promotora', 'merchandiser'].includes(p.role)) fail('err.indisponivel', { nome: p.nome });
        if (u.role === 'supervisor' && p.equipaId !== s.equipaId) fail('err.foraEquipa', { nome: p.nome });
      }
      for (const data of datas) {
        for (const p of pessoas) {
          if ((await conflitos(tx, p.id, data, f.hi, f.hf)).length) {
            ignoradas++;
            continue;
          }
          const [e] = await tx
            .insert(escalas)
            .values({ servicoId: s.id, pdvId: f.pdvId, promotoraId: p.id, supervisorId: s.supervisorId, data, horaInicio: f.hi, horaFim: f.hf })
            .returning({ id: escalas.id });
          await ev.escala(tx, e.id, u.id, 'ev.escalaCriada');
          criadas++;
        }
      }
      const periodo = f.ate !== f.de ? `${f.de} → ${f.ate}` : f.de;
      for (const p of pessoas) await ev.notificar(tx, p.id, 'ev.nNovasEscalas', { servico: s.nome, periodo, hi: f.hi, hf: f.hf }, '/m/hoje');
      await ev.auditar(tx, u.id, 'ev.aCriouEscalas', 'ev.eEscala', 'ev.dEscalasCriadas', { servico: s.nome, n: criadas });
    });
    refresh();
    return ignoradas ? okMsg('ok.escalasIgnoradas', { c: criadas, i: ignoradas }) : okMsg('ok.escalasCriadas', { c: criadas });
  });
}

// ---------- relatórios ----------
async function relatorioGerido(tx: Tx, u: User, id: string) {
  const [row] = await tx
    .select({ r: relatorios, e: escalas })
    .from(relatorios)
    .innerJoin(escalas, eq(escalas.id, relatorios.escalaId))
    .where(and(eq(relatorios.id, id), escalaScope(u)));
  if (!row) fail('err.relatorioNaoEncontrado');
  return row;
}

export async function analisarRelatorio(id: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    const changed = await db.transaction(async (tx) => {
      const { r } = await relatorioGerido(tx, u, id);
      if (r.estado !== 'enviado' && r.estado !== 'reenviado') return false;
      await tx.update(relatorios).set({ estado: 'em_analise' }).where(eq(relatorios.id, id));
      await ev.relatorio(tx, id, u.id, 'ev.emAnalise');
      return true;
    });
    if (changed) refresh();
  });
}

export async function decidirRelatorio(id: string, decisao: 'aprovar' | 'rejeitar', nota: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    const texto = nota.trim().slice(0, 2000);
    if (decisao === 'rejeitar' && !texto) fail('err.motivoRejeicao');
    await db.transaction(async (tx) => {
      const { r } = await relatorioGerido(tx, u, id);
      if (!['enviado', 'reenviado', 'em_analise'].includes(r.estado)) fail('err.jaDecidido');
      if (decisao === 'aprovar') {
        await tx.update(relatorios).set({ estado: 'aprovado', feedback: texto || null }).where(eq(relatorios.id, id));
        await ev.relatorio(tx, id, u.id, texto ? 'ev.aprovadoNota' : 'ev.aprovado', texto ? { nota: texto } : undefined);
        await ev.notificar(tx, r.autorId, 'ev.nAprovado', undefined, `/m/relatorios/${id}`);
        await ev.auditar(tx, u.id, 'ev.aAprovou', 'ev.eRelatorio', id);
      } else {
        await tx.update(relatorios).set({ estado: 'rejeitado', motivoRejeicao: texto }).where(eq(relatorios.id, id));
        await ev.relatorio(tx, id, u.id, 'ev.rejeitado', { motivo: texto });
        await ev.notificar(tx, r.autorId, 'ev.nRejeitado', { motivo: texto }, `/m/relatorios/${id}`);
        await ev.auditar(tx, u.id, 'ev.aRejeitou', 'ev.eRelatorio', `${id}: ${texto}`);
      }
    });
    refresh();
    return okMsg(decisao === 'aprovar' ? 'ok.aprovado' : 'ok.rejeitado');
  });
}

export async function resolverOcorrencia(id: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(WEB_ROLES);
    await db.transaction(async (tx) => {
      const [row] = await tx.select({ o: ocorrencias }).from(ocorrencias).innerJoin(escalas, eq(escalas.id, ocorrencias.escalaId)).where(and(eq(ocorrencias.id, id), escalaScope(u)));
      if (!row) fail('err.ocorrenciaNaoEncontrada');
      await tx.update(ocorrencias).set({ resolvida: true }).where(eq(ocorrencias.id, id));
      await ev.escala(tx, row.o.escalaId, u.id, 'ev.ocorrenciaResolvida', { texto: row.o.texto });
      await ev.auditar(tx, u.id, 'ev.aResolveuOcorrencia', 'ev.eOcorrencia', row.o.texto);
    });
    refresh();
    return okMsg('ok.ocorrenciaResolvida');
  });
}
