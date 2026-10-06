/**
 * Dados de demonstração. Uso:
 *   npm run db:seed            (só corre se a BD estiver vazia)
 *   npm run db:seed -- --force (APAGA todos os dados e volta a gerar)
 */
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { addDays, addMinutes, hoje } from '../lib/dates';
import * as s from './schema';

config({ path: '.env.local' });

export const DEMO_PASSWORD = 'Noble@2026';

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: s });

function placeholder(label: string, hue: number): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,62%)"/><stop offset="1" stop-color="hsl(${hue + 30},40%,38%)"/></linearGradient></defs>
<rect width="640" height="480" fill="url(#g)"/>
<rect x="80" y="150" width="140" height="230" rx="8" fill="rgba(255,255,255,.25)"/>
<rect x="250" y="110" width="140" height="270" rx="8" fill="rgba(255,255,255,.35)"/>
<rect x="420" y="190" width="130" height="190" rx="8" fill="rgba(255,255,255,.2)"/>
<text x="320" y="440" font-family="Arial" font-size="26" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return Buffer.from(svg);
}

async function main() {
  const force = process.argv.includes('--force');
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.users);
  if (count > 0 && !force) {
    console.log(`A BD já tem ${count} utilizadores. Use --force para apagar tudo e voltar a gerar.`);
    return;
  }
  if (force) {
    await db.execute(sql`TRUNCATE auditoria, notificacoes, ocorrencias, fotos, relatorio_historico, relatorios,
      escala_historico, escalas, servico_pdvs, servicos, pdvs, marcas, clientes, equipas, users CASCADE`);
  }

  const today = hoje();
  const ts = (day: string, t: string) => new Date(`${day}T${t}:00+01:00`);
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.transaction(async (tx) => {
    // ---------- pessoas ----------
    const mk = (nome: string, email: string, telefone: string, role: s.Role, zona: string, estado: 'ativa' | 'suspensa' = 'ativa') => ({
      nome, email, telefone, role, zona, estado, passwordHash: hash,
    });
    const [admin, gestor, sup1, sup2, sup3] = await tx
      .insert(s.users)
      .values([
        mk('Administrador Noble', 'admin@noblegroup.ao', '+244 923 000 001', 'admin', 'Luanda'),
        mk('Marta Fernandes', 'marta.fernandes@noblegroup.ao', '+244 923 000 002', 'gestor', 'Luanda'),
        mk('Carlos Domingos', 'carlos.domingos@noblegroup.ao', '+244 923 100 001', 'supervisor', 'Talatona'),
        mk('Joana Bento', 'joana.bento@noblegroup.ao', '+244 923 100 002', 'supervisor', 'Viana'),
        mk('Paulo Neto', 'paulo.neto@noblegroup.ao', '+244 923 100 003', 'supervisor', 'Luanda Sul'),
      ])
      .returning();

    const [e1, e2, e3] = await tx
      .insert(s.equipas)
      .values([
        { nome: 'Equipa Talatona', area: 'promocao', supervisorId: sup1.id },
        { nome: 'Equipa Viana', area: 'promocao', supervisorId: sup2.id },
        { nome: 'Merchandising Luanda Sul', area: 'merchandising', supervisorId: sup3.id },
      ])
      .returning();

    const campo = await tx
      .insert(s.users)
      .values([
        { ...mk('Ana Lopes', 'ana.lopes@noblegroup.ao', '+244 924 200 001', 'promotora', 'Talatona'), equipaId: e1.id },
        { ...mk('Beatriz Sousa', 'beatriz.sousa@noblegroup.ao', '+244 924 200 002', 'promotora', 'Talatona'), equipaId: e1.id },
        { ...mk('Celeste Mateus', 'celeste.mateus@noblegroup.ao', '+244 924 200 003', 'promotora', 'Kilamba'), equipaId: e1.id },
        { ...mk('Diana Kiala', 'diana.kiala@noblegroup.ao', '+244 924 200 004', 'promotora', 'Viana'), equipaId: e2.id },
        { ...mk('Esperança João', 'esperanca.joao@noblegroup.ao', '+244 924 200 005', 'promotora', 'Viana'), equipaId: e2.id },
        { ...mk('Filomena Cruz', 'filomena.cruz@noblegroup.ao', '+244 924 200 006', 'promotora', 'Cazenga', 'suspensa'), equipaId: e2.id },
        { ...mk('Gaspar Manuel', 'gaspar.manuel@noblegroup.ao', '+244 925 300 001', 'merchandiser', 'Talatona'), equipaId: e3.id },
        { ...mk('Hélder Tomás', 'helder.tomas@noblegroup.ao', '+244 925 300 002', 'merchandiser', 'Maianga'), equipaId: e3.id },
      ])
      .returning();
    const [ana, beatriz, celeste, diana, esperanca, , gaspar, helder] = campo;
    for (const sup of [sup1, sup2, sup3]) {
      await tx.update(s.users).set({ equipaId: [e1, e2, e3][[sup1, sup2, sup3].indexOf(sup)].id }).where(sql`id = ${sup.id}`);
    }

    // ---------- comercial ----------
    const [c1, c2, c3] = await tx
      .insert(s.clientes)
      .values([
        { nome: 'Bebidas Kianda, Lda', nif: '5417000001', responsavel: 'Rui Cardoso', contacto: '+244 922 111 111', email: 'marketing@kianda.co.ao', contratos: ['Contrato 2026-014 (Jan–Dez)'] },
        { nome: 'Lacticínios Mulemba, SA', nif: '5417000002', responsavel: 'Sílvia Monteiro', contacto: '+244 922 222 222', email: 'trade@mulemba.ao', contratos: ['Contrato 2026-021 (Mar–Set)'] },
        { nome: 'Higiene Palanca, Lda', nif: '5417000003', responsavel: 'Nuno Afonso', contacto: '+244 922 333 333', email: 'comercial@palanca.ao', contratos: ['Acordo-quadro 2026-007'] },
      ])
      .returning();
    const [m1, m2, m3, m4] = await tx
      .insert(s.marcas)
      .values([
        { clienteId: c1.id, nome: 'Kianda Cola', produtos: ['Kianda Cola 33cl', 'Kianda Cola Zero 33cl', 'Kianda Cola 1,5L'] },
        { clienteId: c1.id, nome: 'Kianda Sumos', produtos: ['Sumo Manga 1L', 'Sumo Maracujá 1L'] },
        { clienteId: c2.id, nome: 'Mulemba', produtos: ['Iogurte Natural', 'Iogurte Morango', 'Leite UHT 1L'] },
        { clienteId: c3.id, nome: 'Palanca', produtos: ['Detergente 1kg', 'Lixívia 2L', 'Sabão em barra'] },
      ])
      .returning();
    const [p1, p2, p3, p4, p5] = await tx
      .insert(s.pdvs)
      .values([
        { nome: 'Hiper Atlântico Talatona', endereco: 'Via S8, Talatona', zona: 'Talatona' },
        { nome: 'Supermercado Kilamba Centro', endereco: 'Bloco Q, Kilamba', zona: 'Kilamba' },
        { nome: 'Viana Shopping – Hiper', endereco: 'Estrada de Catete, Viana', zona: 'Viana' },
        { nome: 'Mercado Municipal Viana', endereco: 'Rua Principal, Viana', zona: 'Viana' },
        { nome: 'Super Maianga', endereco: 'Largo da Maianga', zona: 'Maianga' },
      ])
      .returning();

    // ---------- serviços ----------
    const [sv1, sv2, sv3, sv4] = await tx
      .insert(s.servicos)
      .values([
        {
          tipo: 'campanha', nome: 'Lançamento Kianda Cola Zero', clienteId: c1.id, marcaId: m1.id, produto: 'Kianda Cola Zero 33cl',
          objetivo: 'Dar a conhecer a nova Kianda Cola Zero e converter provas em vendas.', meta: 600,
          inicio: addDays(today, -6), fim: addDays(today, 12), zona: 'Talatona', supervisorId: sup1.id, equipaId: e1.id,
          materiais: 'Bancada, frigorífico vertical, 2 roll-ups, copos', observacoes: 'Farda Kianda obrigatória.',
          checklist: ['Bancada montada', 'Produto refrigerado', 'Material POS visível', 'Farda completa'], estado: 'em_execucao',
        },
        {
          tipo: 'degustacao', nome: 'Degustação Iogurte Mulemba', clienteId: c2.id, marcaId: m3.id, produto: 'Iogurte Morango',
          objetivo: 'Degustação em loja com oferta de cupão de desconto.', meta: 400,
          inicio: addDays(today, -4), fim: addDays(today, 8), zona: 'Viana', supervisorId: sup2.id, equipaId: e2.id,
          materiais: 'Mesa, toalha Mulemba, colheres descartáveis, cupões',
          checklist: ['Mesa limpa e montada', 'Cadeia de frio garantida', 'Cupões disponíveis'], estado: 'em_execucao',
        },
        {
          tipo: 'merchandising', nome: 'Implementação expositores Palanca', clienteId: c3.id, marcaId: m4.id, produto: 'Detergente 1kg',
          objetivo: 'Instalar expositores de chão e reorganizar linear de detergentes.', meta: 0,
          inicio: addDays(today, -3), fim: addDays(today, 7), zona: 'Luanda Sul', supervisorId: sup3.id, equipaId: e3.id,
          materiais: 'Expositor de chão, wobblers, etiquetas de preço', observacoes: 'Fotos antes/depois obrigatórias.',
          checklist: ['Expositor montado e estável', 'Produto facing completo', 'Preço visível', 'Material antigo removido'],
          estado: 'em_execucao', acao: 'implementacao', qtdPrevista: 12,
        },
        {
          tipo: 'ativacao', nome: 'Ativação fim-de-semana Kianda Sumos', clienteId: c1.id, marcaId: m2.id, produto: 'Sumo Manga 1L',
          objetivo: 'Ativação com jogos e oferta de brindes.', meta: 300,
          inicio: addDays(today, 10), fim: addDays(today, 11), zona: 'Kilamba', supervisorId: sup1.id, equipaId: e1.id,
          materiais: 'Tenda, roda da sorte, brindes', checklist: ['Tenda montada', 'Brindes contados'], estado: 'planeado',
        },
      ])
      .returning();
    await tx.insert(s.servicoPdvs).values([
      { servicoId: sv1.id, pdvId: p1.id }, { servicoId: sv1.id, pdvId: p2.id },
      { servicoId: sv2.id, pdvId: p3.id }, { servicoId: sv2.id, pdvId: p4.id },
      { servicoId: sv3.id, pdvId: p1.id }, { servicoId: sv3.id, pdvId: p3.id }, { servicoId: sv3.id, pdvId: p5.id },
      { servicoId: sv4.id, pdvId: p2.id },
    ]);

    // ---------- escalas ----------
    const plano = [
      { u: ana, sup: sup1, sv: sv1, pdvs: [p1, p2], hi: '09:00', hf: '15:00' },
      { u: beatriz, sup: sup1, sv: sv1, pdvs: [p2, p1], hi: '10:00', hf: '16:00' },
      { u: celeste, sup: sup1, sv: sv1, pdvs: [p1], hi: '14:00', hf: '20:00' },
      { u: diana, sup: sup2, sv: sv2, pdvs: [p3, p4], hi: '09:00', hf: '14:00' },
      { u: esperanca, sup: sup2, sv: sv2, pdvs: [p4, p3], hi: '13:00', hf: '18:00' },
      { u: gaspar, sup: sup3, sv: sv3, pdvs: [p1, p3, p5], hi: '08:00', hf: '12:00' },
      { u: helder, sup: sup3, sv: sv3, pdvs: [p5, p1, p3], hi: '13:00', hf: '17:00' },
    ];

    for (const p of plano) {
      for (let d = -3; d <= 4; d++) {
        const dia = addDays(today, d);
        let estado: s.Escala['estado'] = d < 0 ? 'executada' : 'planeada';
        if (d === -2 && p.u.id === esperanca.id) estado = 'falta';
        if (d === 0 && [beatriz.id, diana.id, gaspar.id].includes(p.u.id)) estado = 'confirmada';
        const atraso = d === -1 && p.u.id === celeste.id;
        const hora = estado === 'executada' ? (atraso ? addMinutes(p.hi, 25) : p.hi) : estado === 'confirmada' ? addMinutes(p.hi, -5) : null;
        const [e] = await tx
          .insert(s.escalas)
          .values({
            servicoId: p.sv.id, pdvId: p.pdvs[(d + 3) % p.pdvs.length].id, promotoraId: p.u.id, supervisorId: p.sup.id,
            data: dia, horaInicio: p.hi, horaFim: p.hf, estado,
            presencaEstado: estado === 'executada' ? (atraso ? 'atrasado' : 'presente') : estado === 'confirmada' ? 'presente' : estado === 'falta' ? 'falta' : null,
            presencaHora: estado === 'falta' ? p.hi : hora,
            presencaValidada: estado === 'executada' || estado === 'falta',
            inicioAtividade: estado === 'executada' ? ts(dia, hora!) : null,
            fimAtividade: estado === 'executada' ? ts(dia, p.hf) : null,
          })
          .returning();
        await tx.insert(s.escalaHistorico).values({ escalaId: e.id, userId: p.sup.id, texto: 'ev.escalaCriada', data: ts(addDays(today, -7), '10:00') });
        if (estado === 'falta') await tx.insert(s.escalaHistorico).values({ escalaId: e.id, userId: p.sup.id, texto: 'ev.faltaSupervisor', data: ts(dia, p.hi) });
        if (estado === 'confirmada') await tx.insert(s.escalaHistorico).values({ escalaId: e.id, userId: p.u.id, texto: 'ev.presencaApp', params: { hora: hora! }, data: ts(dia, hora!) });
        if (d === -1 && p.u.id === diana.id) {
          await tx.insert(s.ocorrencias).values({ escalaId: e.id, autorId: diana.id, texto: 'Ruptura de stock de Iogurte Morango a partir das 12h.', data: ts(dia, '12:10') });
          await tx.insert(s.notificacoes).values({ userId: sup2.id, texto: 'ev.nOcorrenciaDe', params: { nome: diana.nome }, link: '/app/escalas', data: ts(dia, '12:10') });
        }

        if (estado !== 'executada') continue;
        // ---------- relatório da escala executada ----------
        const merch = p.sv.tipo === 'merchandising';
        let rEstado: s.Relatorio['estado'] = 'aprovado';
        if (d === -1) rEstado = [beatriz.id, helder.id].includes(p.u.id) ? 'em_analise' : 'enviado';
        if (d === -2 && p.u.id === ana.id) rEstado = 'rejeitado';
        const motivo = 'Falta fotografia do material POS e o item "Material POS visível" não foi cumprido. Por favor corrija e reenvie.';
        const enviadoEm = ts(dia, p.hf);
        const [r] = await tx
          .insert(s.relatorios)
          .values({
            escalaId: e.id, servicoId: p.sv.id, autorId: p.u.id, tipo: merch ? 'merchandising' : 'promotora', estado: rEstado,
            atividade: merch ? 'Implementação de expositor de chão e reorganização do linear' : 'Degustação/abordagem a clientes em loja',
            quantidade: merch ? 4 : 60 + ((d + 7) * 13) % 50,
            resultados: merch ? '4 expositores instalados' : `${40 + ((d + 7) * 7) % 30} unidades vendidas durante a ação`,
            material: merch ? 'Expositor de chão, wobblers' : '',
            checklist: p.sv.checklist.map((item, i) => ({ item, ok: !(rEstado === 'rejeitado' && i === 2) })),
            observacoes: 'Boa adesão dos clientes no período da tarde.',
            motivoRejeicao: rEstado === 'rejeitado' ? motivo : null,
            enviadoEm,
          })
          .returning();
        const hist: (typeof s.relatorioHistorico.$inferInsert)[] = [{ relatorioId: r.id, userId: p.u.id, texto: 'ev.relatorioEnviado', data: enviadoEm }];
        if (rEstado === 'aprovado') hist.push({ relatorioId: r.id, userId: p.sup.id, texto: 'ev.aprovado', data: ts(addDays(dia, 1), '09:30') });
        if (rEstado === 'em_analise') hist.push({ relatorioId: r.id, userId: p.sup.id, texto: 'ev.emAnalise', data: ts(today, '08:15') });
        if (rEstado === 'rejeitado') hist.push({ relatorioId: r.id, userId: p.sup.id, texto: 'ev.rejeitado', params: { motivo }, data: ts(addDays(dia, 1), '10:00') });
        await tx.insert(s.relatorioHistorico).values(hist);

        const hue = (Math.abs(d) * 53 + p.u.nome.length * 17) % 360;
        const fotosSeed = merch
          ? (['antes', 'durante', 'depois'] as const).map((fase, i) => ({ fase, legenda: `Linear ${fase}`, label: `${fase.toUpperCase()} – ${p.sv.produto}`, t: addMinutes(p.hi, 30 + i * 60), hue: hue + i * 20 }))
          : [
              { fase: 'geral' as const, legenda: 'Bancada', label: 'Bancada montada', t: addMinutes(p.hi, 20), hue },
              { fase: 'geral' as const, legenda: 'Atendimento', label: 'Atendimento a clientes', t: addMinutes(p.hi, 110), hue: hue + 25 },
            ];
        await tx.insert(s.fotos).values(
          fotosSeed.map((f) => {
            const dados = placeholder(f.label, f.hue);
            return { relatorioId: r.id, autorId: p.u.id, fase: f.fase, legenda: f.legenda, mime: 'image/svg+xml', tamanho: dados.length, dados, capturadaEm: ts(dia, f.t) };
          }),
        );
        if (rEstado === 'rejeitado') {
          await tx.insert(s.notificacoes).values({ userId: ana.id, texto: 'ev.nRejeitadoCorrigir', link: `/m/relatorios/${r.id}`, data: ts(addDays(dia, 1), '10:00') });
        }
      }
    }

    await tx.insert(s.notificacoes).values([
      { userId: ana.id, texto: 'ev.nNovaEscalaAmanha', link: '/m/hoje', data: ts(addDays(today, -1), '18:00') },
      { userId: sup1.id, texto: 'ev.nRelatoriosPorValidar', link: '/app/relatorios', data: ts(today, '07:30') },
    ]);
    await tx.insert(s.auditoria).values([
      { userId: gestor.id, acao: 'ev.aCriou', entidade: 'ev.eServico', detalhe: sv1.nome, params: { entidade: '@ev.eServico' }, data: ts(addDays(today, -7), '09:00') },
      { userId: sup1.id, acao: 'ev.aCriouEscalas', entidade: 'ev.eEscala', detalhe: 'ev.dEquipaEscalas', params: { equipa: e1.nome, n: 24 }, data: ts(addDays(today, -7), '10:00') },
      { userId: admin.id, acao: 'ev.aSeed', entidade: 'ev.eSistema', detalhe: 'seed' },
    ]);
  });

  console.log(`Seed concluído. Palavra-passe de todas as contas de demonstração: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
