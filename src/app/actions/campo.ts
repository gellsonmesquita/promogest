'use server';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { z } from 'zod';
import { db, type Tx } from '@/db';
import { escalas, fotos, ocorrencias, relatorios, servicos, type Escala, type User } from '@/db/schema';
import { fail, okMsg, run, type ActionResult } from '@/lib/action';
import { assertUser, FIELD_ROLES } from '@/lib/auth';
import { agoraHHmm, hoje, minutos } from '@/lib/dates';
import { ev } from '@/lib/events';

const TOLERANCIA_ATRASO_MIN = 10;
const EDITAVEIS = ['rascunho', 'rejeitado'] as const;
const editavel = (estado: string) => (EDITAVEIS as readonly string[]).includes(estado);

function refresh() {
  revalidatePath('/m', 'layout');
  revalidatePath('/app', 'layout');
}

/** Escala da própria promotora/merchandiser (nunca de outra pessoa). */
async function minhaEscala(tx: Tx | typeof db, u: User, escalaId: string): Promise<Escala> {
  const [e] = await tx.select().from(escalas).where(and(eq(escalas.id, escalaId), eq(escalas.promotoraId, u.id)));
  if (!e) fail('err.atividadeNaoEncontrada');
  return e;
}

/** Obtém o relatório da escala ou cria um rascunho com o checklist do serviço. */
async function garantirRelatorio(tx: Tx, e: Escala, u: User) {
  const [r] = await tx.select().from(relatorios).where(eq(relatorios.escalaId, e.id));
  if (r) return r;
  const [s] = await tx.select().from(servicos).where(eq(servicos.id, e.servicoId));
  const [novo] = await tx
    .insert(relatorios)
    .values({
      escalaId: e.id, servicoId: s.id, autorId: u.id, tipo: s.tipo === 'merchandising' ? 'merchandising' : 'promotora',
      checklist: s.checklist.map((item) => ({ item, ok: false })),
    })
    .returning();
  await ev.relatorio(tx, novo.id, u.id, 'ev.rascunhoCriado');
  return novo;
}

export async function confirmarPresenca(escalaId: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    await db.transaction(async (tx) => {
      const e = await minhaEscala(tx, u, escalaId);
      if (e.estado !== 'planeada') fail('err.presencaJaRegistada');
      if (e.data !== hoje()) fail('err.soNoDia');
      const hora = agoraHHmm();
      const atrasado = minutos(hora) > minutos(e.horaInicio) + TOLERANCIA_ATRASO_MIN;
      await tx.update(escalas).set({ estado: 'confirmada', presencaEstado: atrasado ? 'atrasado' : 'presente', presencaHora: hora }).where(eq(escalas.id, e.id));
      await ev.escala(tx, e.id, u.id, atrasado ? 'ev.presencaAppAtraso' : 'ev.presencaApp', { hora });
      await ev.notificar(tx, e.supervisorId, atrasado ? 'ev.nPresencaAtraso' : 'ev.nPresenca', { nome: u.nome }, '/app/escalas');
    });
    refresh();
    return okMsg('ok.presenca');
  });
}

export async function marcarAtividade(escalaId: string, momento: 'inicio' | 'fim'): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    await db.transaction(async (tx) => {
      const e = await minhaEscala(tx, u, escalaId);
      if (!e.presencaEstado || e.estado !== 'confirmada') fail('err.confirmePrimeiro');
      if (momento === 'inicio') await tx.update(escalas).set({ inicioAtividade: new Date() }).where(eq(escalas.id, e.id));
      else await tx.update(escalas).set({ fimAtividade: new Date() }).where(eq(escalas.id, e.id));
      await ev.escala(tx, e.id, u.id, momento === 'inicio' ? 'ev.atividadeIniciada' : 'ev.atividadeTerminada');
    });
    refresh();
  });
}

export async function comunicarOcorrencia(escalaId: string, texto: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    const txt = texto.trim().slice(0, 1000);
    if (!txt) fail('err.descrevaOcorrencia');
    await db.transaction(async (tx) => {
      const e = await minhaEscala(tx, u, escalaId);
      await tx.insert(ocorrencias).values({ escalaId: e.id, autorId: u.id, texto: txt });
      await ev.escala(tx, e.id, u.id, 'ev.ocorrencia', { texto: txt });
      await ev.notificar(tx, e.supervisorId, 'ev.nOcorrencia', { nome: u.nome, texto: txt }, '/app/dashboard');
    });
    refresh();
    return okMsg('ok.ocorrencia');
  });
}

const relatorioSchema = z.object({
  atividade: z.string().max(2000),
  quantidade: z.coerce.number().int().min(0).max(1_000_000),
  resultados: z.string().max(2000),
  material: z.string().max(2000),
  observacoes: z.string().max(4000),
  ocorrencias: z.string().max(4000),
  checklist: z.array(z.object({ item: z.string(), ok: z.boolean() })).max(50),
  legendas: z.record(z.string(), z.string().max(200)).default({}),
});
export type RelatorioInput = z.input<typeof relatorioSchema>;

function parseRelatorio(input: RelatorioInput) {
  const r = relatorioSchema.safeParse(input);
  if (!r.success) fail('err.dadosInvalidos');
  return r.data;
}

async function gravarCampos(tx: Tx, relatorioId: string, data: z.output<typeof relatorioSchema>, servicoChecklist: string[]) {
  // O checklist é sempre o definido no serviço; do cliente só se aceita o estado ok/não ok.
  const checklist = servicoChecklist.map((item) => ({ item, ok: !!data.checklist.find((c) => c.item === item)?.ok }));
  await tx
    .update(relatorios)
    .set({
      atividade: data.atividade, quantidade: data.quantidade, resultados: data.resultados, material: data.material,
      observacoes: data.observacoes, ocorrencias: data.ocorrencias, checklist, updatedAt: new Date(),
    })
    .where(eq(relatorios.id, relatorioId));
  for (const [fotoId, legenda] of Object.entries(data.legendas)) {
    await tx.update(fotos).set({ legenda }).where(and(eq(fotos.id, fotoId), eq(fotos.relatorioId, relatorioId)));
  }
}

export async function guardarRelatorio(escalaId: string, input: RelatorioInput): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    const data = parseRelatorio(input);
    await db.transaction(async (tx) => {
      const e = await minhaEscala(tx, u, escalaId);
      const r = await garantirRelatorio(tx, e, u);
      if (!editavel(r.estado)) fail('err.jaEnviado');
      const [s] = await tx.select({ checklist: servicos.checklist }).from(servicos).where(eq(servicos.id, e.servicoId));
      await gravarCampos(tx, r.id, data, s.checklist);
    });
    refresh();
    return okMsg('ok.rascunho');
  });
}

export async function enviarRelatorio(escalaId: string, input: RelatorioInput): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    const data = parseRelatorio(input);
    if (!data.atividade.trim()) fail('err.descrevaAtividade');
    await db.transaction(async (tx) => {
      const e = await minhaEscala(tx, u, escalaId);
      if (!e.presencaEstado || ['falta', 'cancelada', 'substituida'].includes(e.estado)) fail('err.confirmeAntesEnviar');
      const r = await garantirRelatorio(tx, e, u);
      if (!editavel(r.estado)) fail('err.jaEnviado');
      const [s] = await tx.select().from(servicos).where(eq(servicos.id, e.servicoId));

      const fases = await tx.select({ fase: fotos.fase }).from(fotos).where(eq(fotos.relatorioId, r.id));
      if (!fases.length) fail('err.semFotos');
      if (s.tipo === 'merchandising' && (!fases.some((f) => f.fase === 'antes') || !fases.some((f) => f.fase === 'depois'))) fail('err.merchFotos');

      await gravarCampos(tx, r.id, data, s.checklist);
      const reenvio = r.estado === 'rejeitado';
      await tx.update(relatorios).set({ estado: reenvio ? 'reenviado' : 'enviado', enviadoEm: new Date() }).where(eq(relatorios.id, r.id));
      await ev.relatorio(tx, r.id, u.id, reenvio ? 'ev.relatorioReenviado' : 'ev.relatorioEnviado');
      await tx
        .update(escalas)
        .set({ estado: 'executada', fimAtividade: e.fimAtividade ?? new Date() })
        .where(and(eq(escalas.id, e.id), inArray(escalas.estado, ['confirmada', 'executada'])));
      await ev.escala(tx, e.id, u.id, 'ev.relatorioEnviado');
      await ev.notificar(tx, e.supervisorId, reenvio ? 'ev.nRelatorioReenviado' : 'ev.nRelatorioEnviado', { nome: u.nome }, `/app/relatorios/${r.id}`);
      await ev.auditar(tx, u.id, reenvio ? 'ev.aReenviouRelatorio' : 'ev.aEnviouRelatorio', 'ev.eRelatorio', `${s.nome} – ${e.data}`);
    });
    refresh();
    return okMsg('ok.relatorioEnviado');
  });
}

const FASES = ['antes', 'durante', 'depois', 'geral'] as const;
const MAX_UPLOAD = 6 * 1024 * 1024;

/** Recebe uma fotografia, normaliza (orientação, tamanho, JPEG, sem metadados) e associa ao relatório. */
export async function enviarFoto(form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    const escalaId = String(form.get('escalaId') ?? '');
    const fase = String(form.get('fase') ?? 'geral') as (typeof FASES)[number];
    const file = form.get('file');
    if (!(file instanceof File) || !file.type.startsWith('image/')) fail('err.imagemInvalida');
    if (file.size > MAX_UPLOAD) fail('err.imagemGrande');
    if (!FASES.includes(fase)) fail('err.faseInvalida');

    let dados: Buffer;
    try {
      dados = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 76, mozjpeg: true })
        .toBuffer();
    } catch {
      fail('err.lerImagem');
    }

    const id = await db.transaction(async (tx) => {
      const e = await minhaEscala(tx, u, escalaId);
      if (!e.presencaEstado || ['falta', 'cancelada', 'substituida'].includes(e.estado)) fail('err.confirmeAntesFotos');
      const r = await garantirRelatorio(tx, e, u);
      if (!editavel(r.estado)) fail('err.jaEnviado');
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(fotos).where(eq(fotos.relatorioId, r.id));
      if (n >= 30) fail('err.limiteFotos');
      const [f] = await tx
        .insert(fotos)
        .values({ relatorioId: r.id, autorId: u.id, fase, mime: 'image/jpeg', tamanho: dados.length, dados })
        .returning({ id: fotos.id });
      return f.id;
    });
    refresh();
    return { ok: true, data: { id } };
  });
}

export async function removerFoto(fotoId: string): Promise<ActionResult> {
  return run(async () => {
    const u = await assertUser(FIELD_ROLES);
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ estado: relatorios.estado })
        .from(fotos)
        .innerJoin(relatorios, eq(relatorios.id, fotos.relatorioId))
        .where(and(eq(fotos.id, fotoId), eq(fotos.autorId, u.id)));
      if (!row) fail('err.fotoNaoEncontrada');
      if (!editavel(row.estado)) fail('err.relatorioEnviadoAlterar');
      await tx.delete(fotos).where(eq(fotos.id, fotoId));
    });
    refresh();
  });
}
