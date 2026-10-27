/**
 * Importa o pessoal de campo (merchandisers) a partir do Excel de RH.
 *
 *   npx tsx scripts/importar-pessoal.ts "<ficheiro.xlsx>" [--folha "Final sheet- WORKING"] [--limpar-demo] [--dry-run]
 *
 * --limpar-demo  APAGA todos os dados operacionais e utilizadores (exceto administradores) antes de importar.
 * --dry-run      Só mostra o que seria importado; não escreve na BD.
 * --password-aleatoria  Gera uma palavra-passe diferente por pessoa (por defeito: 123456 para todos).
 *
 * Cria supervisores, equipas, lojas (PDVs com cadeia/KAM) e pessoas com palavra-passe inicial aleatória
 * (troca obrigatória no 1.º acesso). As credenciais ficam em ./credenciais/ (fora do Git).
 * Antes de apagar, grava uma cópia de segurança JSON de todas as tabelas em ./credenciais/backup-*.json.
 */
import { randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { ne, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import ExcelJS from 'exceljs';
import postgres from 'postgres';
import * as s from '../src/db/schema';
import { PASSWORD_TEMPORARIA } from '../src/lib/pessoas';

config({ path: '.env.local' });

const args = process.argv.slice(2);
const ficheiro = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--folha');
const folhaNome = args.includes('--folha') ? args[args.indexOf('--folha') + 1] : 'Final sheet- WORKING';
const limparDemo = args.includes('--limpar-demo');
const dryRun = args.includes('--dry-run');
// Por defeito todos recebem a palavra-passe temporária 123456 (troca obrigatória no 1.º acesso).
const aleatoria = args.includes('--password-aleatoria');
if (!ficheiro) {
  console.error('Uso: npx tsx scripts/importar-pessoal.ts "<ficheiro.xlsx>" [--folha "<nome>"] [--limpar-demo] [--dry-run]');
  process.exit(1);
}

// ---------- normalização ----------
const limpa = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const capitaliza = (nome: string) => (nome ? nome[0].toUpperCase() + nome.slice(1) : nome);
const CADEIAS: Record<string, string> = { fresmart: 'Fresmart', kibabo: 'Kibabo', kero: 'Kero', alimenta: 'Alimenta Angola', africana: 'Africana Discount', intermarket: 'Intermarket', maxi: 'Maxi', mangole: 'Mangolê' };
const ZONAS = [
  'Morro Bento', 'Avenida Brasil', '1º de Maio', 'São Paulo', 'Nova Vida', 'Novo Vida', 'Vila Alice', 'Zé Pirão', 'Bita-Sapú', 'Zango', 'Estalagem',
  'Benfica', 'Golf', 'Gol2', 'Calemba', 'Cacuaco', 'Viana', 'Talatona', 'Kilamba', 'Camama', 'Cazenga', 'Samba', 'Kinaxixi', 'Alvalade', 'Patriota',
  'Cassenda', 'Palanca', 'Sequele', 'Cuca', 'Fubu', 'Gamek', 'Império', 'Marginal',
];
const zonaDe = (loja: string) => ZONAS.find((z) => loja.toLowerCase().includes(z.toLowerCase())) ?? '';
const textoCelula = (v: unknown): string => {
  if (v && typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    return limpa(o.text ?? o.richText?.map((r) => r.text).join('') ?? o.result ?? '');
  }
  return limpa(v);
};
const dataCelula = (v: unknown): string | null => (v instanceof Date ? v.toISOString().slice(0, 10) : null);

/** Uma célula de loja pode ter 2 lojas de cadeias diferentes ("Kero Kilamba/Kibabo Kilamba"). */
function lojasDe(celula: string, kac: string): { nome: string; cadeia: string }[] {
  const partes = celula.split('/').map(limpa).filter(Boolean);
  const cadeiaDe = (nome: string) => Object.entries(CADEIAS).find(([k]) => nome.toLowerCase().startsWith(k))?.[1] ?? '';
  const todasDeCadeia = partes.length > 1 && partes.every((p) => cadeiaDe(p));
  const nomes = todasDeCadeia ? partes : [celula];
  return nomes.map((n) => {
    const cadeia = cadeiaDe(n) || (kac ? (CADEIAS[kac.toLowerCase()] ?? kac) : '');
    // Uniformiza o prefixo da cadeia ("FRESMART da Cuca" → "Fresmart da Cuca")
    const chave = Object.keys(CADEIAS).find((k) => n.toLowerCase().startsWith(k));
    const nome = chave ? CADEIAS[chave].split(' ')[0] + n.slice(chave.length) : n;
    return { nome: limpa(nome), cadeia };
  });
}

/** Ausências em curso (as que têm data já passada ficam só nas observações). */
function ausenciaDe(remarks: string): s.User['ausenciaTipo'] {
  const r = remarks.toLowerCase();
  if (r.includes('maternit') || r.includes('martenidade')) return 'licenca_maternidade';
  if (r.includes('accident') || r.includes('acidente')) return 'acidente';
  if (r.includes('sick') || r.includes('doença')) return 'doenca';
  return null;
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const passwordInicial = () => (aleatoria ? Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('') : PASSWORD_TEMPORARIA);

async function main() {
  // ---------- ler Excel ----------
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ficheiro!);
  const ws = wb.getWorksheet(folhaNome);
  if (!ws) throw new Error(`Folha "${folhaNome}" não encontrada. Folhas: ${wb.worksheets.map((w) => w.name).join(', ')}`);

  // Cabeçalho na linha 2: Nº | Emp Id | NOME | COST CENTER | CATG. | DOJ | YOS | G.SALARY | No. | Supervisor | KAM | KAC | LOJAS | REMARKS | (notas)
  // row.values é um array esparso (índice 0 vazio): Array.from preenche os buracos.
  const header = Array.from(ws.getRow(2).values as unknown[], textoCelula);
  const col = (nome: string) => {
    const i = header.findIndex((h) => h.toUpperCase().startsWith(nome.toUpperCase()));
    if (i < 0) throw new Error(`Coluna "${nome}" não encontrada no cabeçalho.`);
    return i;
  };
  const C = { id: col('Emp Id'), nome: col('NOME'), cc: col('COST CENTER'), catg: col('CATG'), doj: col('DOJ'), sup: col('Supervisor'), kam: col('KAM'), kac: col('KAC'), loja: col('LOJAS'), rem: col('REMARKS') };
  const C_NOTAS = C.rem + 1; // coluna sem título com notas operacionais

  type Linha = { emp: string; nome: string; cc: string; catg: string; doj: string | null; sup: string; kam: string; kac: string; loja: string; remarks: string; notas: string };
  const linhas: Linha[] = [];
  ws.eachRow((row, n) => {
    if (n <= 2) return;
    const v = row.values as unknown[];
    const nome = textoCelula(v[C.nome]);
    const emp = textoCelula(v[C.id]);
    if (!nome || !emp) return;
    let loja = textoCelula(v[C.loja]);
    let remarks = textoCelula(v[C.rem]);
    // Em algumas linhas a coluna das lojas tem uma observação ("Por Motivos da Saúde", "Licença de maternidade").
    if (/motivo|licen[cç]a|sa[uú]de|maternid|martenid|viagem|faltas/i.test(loja)) {
      remarks = [loja, remarks].filter(Boolean).join(' · ');
      loja = '';
    }
    linhas.push({
      emp, nome: capitaliza(nome), cc: textoCelula(v[C.cc]), catg: textoCelula(v[C.catg]), doj: dataCelula(v[C.doj]), sup: textoCelula(v[C.sup]),
      kam: textoCelula(v[C.kam]), kac: textoCelula(v[C.kac]), loja, remarks, notas: textoCelula(v[C_NOTAS]),
    });
  });
  const duplicados = linhas.filter((l, i) => linhas.findIndex((x) => x.emp === l.emp) !== i);
  if (duplicados.length) throw new Error(`Emp Id duplicado: ${duplicados.map((d) => `${d.emp} (${d.nome})`).join(', ')}`);

  // ---------- lojas ----------
  const lojas = new Map<string, { nome: string; cadeia: string; kam: string; zona: string }>();
  for (const l of linhas) {
    if (!l.loja) continue;
    for (const lj of lojasDe(l.loja, l.kac)) {
      const k = lj.nome.toLowerCase();
      if (!lojas.has(k)) lojas.set(k, { ...lj, kam: l.kam, zona: zonaDe(lj.nome) });
    }
  }
  const supervisores = [...new Set(linhas.map((l) => l.sup).filter(Boolean))];

  console.log(`Folha "${folhaNome}": ${linhas.length} pessoas, ${lojas.size} lojas, supervisores: ${supervisores.join(', ')}`);
  if (dryRun) {
    for (const l of linhas) console.log(`  ${l.emp}  ${l.nome.padEnd(42)} ${l.sup.padEnd(8)} ${l.loja}${ausenciaDe(`${l.remarks} ${l.notas}`) ? '  [ausente]' : ''}`);
    console.log('Lojas:');
    for (const lj of lojas.values()) console.log(`  ${lj.nome.padEnd(45)} cadeia=${lj.cadeia || '(independente)'}  kam=${lj.kam || '-'}  zona=${lj.zona || '-'}`);
    return;
  }

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema: s });
  const outDir = join(process.cwd(), 'credenciais');
  mkdirSync(outDir, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  try {
    if (limparDemo) {
      // ---------- cópia de segurança antes de apagar ----------
      const backup: Record<string, unknown[]> = {};
      for (const [nome, tabela] of Object.entries({
        users: s.users, equipas: s.equipas, clientes: s.clientes, marcas: s.marcas, pdvs: s.pdvs, servicos: s.servicos, servicoPdvs: s.servicoPdvs,
        escalas: s.escalas, escalaHistorico: s.escalaHistorico, relatorios: s.relatorios, relatorioHistorico: s.relatorioHistorico,
        ocorrencias: s.ocorrencias, notificacoes: s.notificacoes, auditoria: s.auditoria,
      })) backup[nome] = await db.select().from(tabela);
      backup.fotos = (await db.select({ id: s.fotos.id, relatorioId: s.fotos.relatorioId, fase: s.fotos.fase, legenda: s.fotos.legenda, capturadaEm: s.fotos.capturadaEm }).from(s.fotos));
      const backupFile = join(outDir, `backup-antes-importacao-${carimbo}.json`);
      writeFileSync(backupFile, JSON.stringify(backup, null, 1));
      console.log(`Cópia de segurança: ${backupFile}`);
    }

    const credenciais: string[] = ['Nome;Perfil;Login;Palavra-passe inicial;Equipa;Loja'];
    let criadas = 0;
    await db.transaction(async (tx) => {
      const [admin] = await tx.select().from(s.users).where(sql`${s.users.role} = 'admin'`).limit(1);
      if (limparDemo) {
        await tx.execute(sql`TRUNCATE auditoria, notificacoes, ocorrencias, fotos, relatorio_historico, relatorios, escala_historico, escalas, servico_pdvs, servicos, marcas, clientes CASCADE`);
        await tx.update(s.users).set({ equipaId: null, pdvId: null });
        await tx.delete(s.equipas);
        await tx.delete(s.users).where(ne(s.users.role, 'admin'));
        await tx.delete(s.pdvs);
        // A palavra-passe do admin de demonstração foi partilhada: obriga a trocá-la.
        await tx.update(s.users).set({ trocarPassword: true }).where(sql`${s.users.role} = 'admin'`);
      }

      // ---------- lojas ----------
      const pdvId = new Map<string, string>();
      for (const [k, lj] of lojas) {
        const [p] = await tx.insert(s.pdvs).values(lj).returning({ id: s.pdvs.id });
        pdvId.set(k, p.id);
      }

      // ---------- supervisores e equipas ----------
      const equipaDe = new Map<string, { equipaId: string; equipaNome: string }>();
      for (const nome of supervisores) {
        const pw = passwordInicial();
        const email = `${nome.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@noblegroup.ao`;
        const [sup] = await tx
          .insert(s.users)
          .values({ nome, email, role: 'supervisor', passwordHash: await bcrypt.hash(pw, 10), trocarPassword: true, observacoes: 'Criado pela importação: confirmar nome completo e e-mail.' })
          .returning({ id: s.users.id });
        const equipaNome = `Merchandising · ${nome}`;
        const [eq] = await tx.insert(s.equipas).values({ nome: equipaNome, area: 'merchandising', supervisorId: sup.id }).returning({ id: s.equipas.id });
        await tx.update(s.users).set({ equipaId: eq.id }).where(sql`${s.users.id} = ${sup.id}`);
        equipaDe.set(nome, { equipaId: eq.id, equipaNome });
        credenciais.push([nome, 'Supervisor', email, pw, equipaNome, ''].join(';'));
      }

      // ---------- merchandisers ----------
      for (const l of linhas) {
        const pw = passwordInicial();
        const lj = l.loja ? lojasDe(l.loja, l.kac) : [];
        const principal = lj[0] ? pdvId.get(lj[0].nome.toLowerCase()) : undefined;
        const outras = lj.slice(1).map((x) => x.nome);
        const ausencia = ausenciaDe(`${l.remarks} ${l.notas}`);
        const obs = [l.remarks, l.notas, outras.length ? `Também: ${outras.join(', ')}` : ''].filter(Boolean).join(' · ');
        const eq = equipaDe.get(l.sup);
        await tx.insert(s.users).values({
          nome: l.nome, numeroFuncionario: l.emp, role: l.catg.toLowerCase().startsWith('promot') ? 'promotora' : 'merchandiser',
          passwordHash: await bcrypt.hash(pw, 10), trocarPassword: true, equipaId: eq?.equipaId ?? null, pdvId: principal ?? null,
          zona: lj[0] ? zonaDe(lj[0].nome) : '', centroCusto: l.cc, dataAdmissao: l.doj, ausenciaTipo: ausencia, observacoes: obs,
        });
        criadas++;
        credenciais.push([l.nome, 'Merchandising', l.emp, pw, eq?.equipaNome ?? '', lj.map((x) => x.nome).join(' / ')].join(';'));
      }

      await tx.insert(s.auditoria).values({
        userId: admin?.id ?? null, acao: 'ev.aImport', entidade: 'ev.eUtilizador', detalhe: 'ev.dImport',
        params: { n: criadas + supervisores.length, l: lojas.size, ficheiro: basename(ficheiro!) },
      });
    });

    const credFile = join(outDir, `credenciais-iniciais-${carimbo}.csv`);
    // BOM para o Excel abrir os acentos corretamente
    writeFileSync(credFile, '﻿' + credenciais.join('\r\n'));
    console.log(`Importação concluída: ${criadas} merchandisers, ${supervisores.length} supervisores, ${lojas.size} lojas.`);
    console.log(`Credenciais iniciais (troca obrigatória no 1.º acesso): ${credFile}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
