import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

// ---------- enums ----------
export const roleEnum = pgEnum('role', ['admin', 'gestor', 'supervisor', 'promotora', 'merchandiser']);
export const areaEnum = pgEnum('area', ['promocao', 'merchandising']);
export const estadoPessoaEnum = pgEnum('estado_pessoa', ['ativa', 'inativa', 'suspensa']);
export const servicoTipoEnum = pgEnum('servico_tipo', [
  'campanha', 'ativacao', 'evento', 'merchandising', 'degustacao', 'panfletagem', 'exposicao', 'auditoria',
]);
export const estadoServicoEnum = pgEnum('estado_servico', ['rascunho', 'planeado', 'em_execucao', 'concluido', 'cancelado']);
export const acaoMerchEnum = pgEnum('acao_merch', [
  'montagem', 'exposicao', 'reposicao', 'implementacao', 'auditoria', 'manutencao', 'outro',
]);
export const estadoEscalaEnum = pgEnum('estado_escala', ['planeada', 'confirmada', 'executada', 'falta', 'substituida', 'cancelada']);
export const estadoPresencaEnum = pgEnum('estado_presenca', ['presente', 'atrasado', 'falta', 'substituido', 'cancelado']);
export const tipoRelatorioEnum = pgEnum('tipo_relatorio', ['promotora', 'merchandising']);
export const estadoRelatorioEnum = pgEnum('estado_relatorio', ['rascunho', 'enviado', 'em_analise', 'aprovado', 'rejeitado', 'reenviado']);
export const faseFotoEnum = pgEnum('fase_foto', ['antes', 'durante', 'depois', 'geral']);

/** Parâmetros de mensagens i18n guardadas na BD (texto = chave do dicionário). */
export type EvParams = Record<string, string | number | null>;

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

// ---------- pessoas ----------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  telefone: text('telefone').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  equipaId: uuid('equipa_id').references((): AnyPgColumn => equipas.id),
  zona: text('zona').notNull().default(''),
  estado: estadoPessoaEnum('estado').notNull().default('ativa'),
  createdAt: createdAt(),
});

export const equipas = pgTable('equipas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  area: areaEnum('area').notNull(),
  supervisorId: uuid('supervisor_id').references((): AnyPgColumn => users.id),
  ativa: boolean('ativa').notNull().default(true),
  createdAt: createdAt(),
});

// ---------- comercial ----------
export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  nif: text('nif').notNull().default(''),
  responsavel: text('responsavel').notNull().default(''),
  contacto: text('contacto').notNull().default(''),
  email: text('email').notNull().default(''),
  contratos: text('contratos').array().notNull().default([]),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: createdAt(),
});

export const marcas = pgTable('marcas', {
  id: uuid('id').primaryKey().defaultRandom(),
  clienteId: uuid('cliente_id').notNull().references(() => clientes.id),
  nome: text('nome').notNull(),
  produtos: text('produtos').array().notNull().default([]),
});

export const pdvs = pgTable('pdvs', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  endereco: text('endereco').notNull().default(''),
  zona: text('zona').notNull().default(''),
  ativo: boolean('ativo').notNull().default(true),
});

// ---------- operação ----------
export const servicos = pgTable('servicos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tipo: servicoTipoEnum('tipo').notNull(),
  nome: text('nome').notNull(),
  clienteId: uuid('cliente_id').notNull().references(() => clientes.id),
  marcaId: uuid('marca_id').notNull().references(() => marcas.id),
  produto: text('produto').notNull().default(''),
  objetivo: text('objetivo').notNull().default(''),
  meta: integer('meta').notNull().default(0),
  inicio: date('inicio').notNull(),
  fim: date('fim').notNull(),
  zona: text('zona').notNull().default(''),
  supervisorId: uuid('supervisor_id').notNull().references(() => users.id),
  equipaId: uuid('equipa_id').notNull().references(() => equipas.id),
  materiais: text('materiais').notNull().default(''),
  observacoes: text('observacoes').notNull().default(''),
  checklist: text('checklist').array().notNull().default([]),
  estado: estadoServicoEnum('estado').notNull().default('rascunho'),
  acao: acaoMerchEnum('acao'),
  qtdPrevista: integer('qtd_prevista'),
  createdAt: createdAt(),
});

export const servicoPdvs = pgTable(
  'servico_pdvs',
  {
    servicoId: uuid('servico_id').notNull().references(() => servicos.id, { onDelete: 'cascade' }),
    pdvId: uuid('pdv_id').notNull().references(() => pdvs.id),
  },
  (t) => [primaryKey({ columns: [t.servicoId, t.pdvId] })],
);

export const escalas = pgTable(
  'escalas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servicoId: uuid('servico_id').notNull().references(() => servicos.id),
    pdvId: uuid('pdv_id').notNull().references(() => pdvs.id),
    promotoraId: uuid('promotora_id').notNull().references(() => users.id),
    supervisorId: uuid('supervisor_id').notNull().references(() => users.id),
    data: date('data').notNull(),
    horaInicio: time('hora_inicio').notNull(),
    horaFim: time('hora_fim').notNull(),
    estado: estadoEscalaEnum('estado').notNull().default('planeada'),
    presencaEstado: estadoPresencaEnum('presenca_estado'),
    presencaHora: time('presenca_hora'),
    presencaValidada: boolean('presenca_validada').notNull().default(false),
    inicioAtividade: timestamp('inicio_atividade', { withTimezone: true }),
    fimAtividade: timestamp('fim_atividade', { withTimezone: true }),
    substitutaId: uuid('substituta_id').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index('escalas_data_idx').on(t.data), index('escalas_promotora_idx').on(t.promotoraId), index('escalas_supervisor_idx').on(t.supervisorId)],
);

export const escalaHistorico = pgTable('escala_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  escalaId: uuid('escala_id').notNull().references(() => escalas.id),
  userId: uuid('user_id').references(() => users.id),
  texto: text('texto').notNull(),
  params: jsonb('params').$type<EvParams>(),
  data: timestamp('data', { withTimezone: true }).defaultNow().notNull(),
});

export type ChecklistItem = { item: string; ok: boolean };

export const relatorios = pgTable('relatorios', {
  id: uuid('id').primaryKey().defaultRandom(),
  escalaId: uuid('escala_id').notNull().unique().references(() => escalas.id),
  servicoId: uuid('servico_id').notNull().references(() => servicos.id),
  autorId: uuid('autor_id').notNull().references(() => users.id),
  tipo: tipoRelatorioEnum('tipo').notNull(),
  estado: estadoRelatorioEnum('estado').notNull().default('rascunho'),
  atividade: text('atividade').notNull().default(''),
  quantidade: integer('quantidade').notNull().default(0),
  resultados: text('resultados').notNull().default(''),
  material: text('material').notNull().default(''),
  checklist: jsonb('checklist').$type<ChecklistItem[]>().notNull().default([]),
  observacoes: text('observacoes').notNull().default(''),
  ocorrencias: text('ocorrencias').notNull().default(''),
  motivoRejeicao: text('motivo_rejeicao'),
  feedback: text('feedback'),
  enviadoEm: timestamp('enviado_em', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const relatorioHistorico = pgTable('relatorio_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  relatorioId: uuid('relatorio_id').notNull().references(() => relatorios.id),
  userId: uuid('user_id').references(() => users.id),
  texto: text('texto').notNull(),
  params: jsonb('params').$type<EvParams>(),
  data: timestamp('data', { withTimezone: true }).defaultNow().notNull(),
});

/** Evidências fotográficas. Guardadas na BD por agora; migrar para object storage (S3/Blob) quando decidido. */
export const fotos = pgTable('fotos', {
  id: uuid('id').primaryKey().defaultRandom(),
  relatorioId: uuid('relatorio_id').notNull().references(() => relatorios.id),
  autorId: uuid('autor_id').notNull().references(() => users.id),
  fase: faseFotoEnum('fase').notNull().default('geral'),
  legenda: text('legenda').notNull().default(''),
  mime: text('mime').notNull(),
  tamanho: integer('tamanho').notNull(),
  dados: bytea('dados').notNull(),
  capturadaEm: timestamp('capturada_em', { withTimezone: true }).defaultNow().notNull(),
});

export const ocorrencias = pgTable('ocorrencias', {
  id: uuid('id').primaryKey().defaultRandom(),
  escalaId: uuid('escala_id').notNull().references(() => escalas.id),
  autorId: uuid('autor_id').notNull().references(() => users.id),
  texto: text('texto').notNull(),
  data: timestamp('data', { withTimezone: true }).defaultNow().notNull(),
  resolvida: boolean('resolvida').notNull().default(false),
});

export const notificacoes = pgTable(
  'notificacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    texto: text('texto').notNull(),
    link: text('link'),
    params: jsonb('params').$type<EvParams>(),
    lida: boolean('lida').notNull().default(false),
    data: timestamp('data', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('notificacoes_user_idx').on(t.userId)],
);

export const auditoria = pgTable('auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: timestamp('data', { withTimezone: true }).defaultNow().notNull(),
  userId: uuid('user_id').references(() => users.id),
  acao: text('acao').notNull(),
  entidade: text('entidade').notNull(),
  detalhe: text('detalhe').notNull().default(''),
  params: jsonb('params').$type<EvParams>(),
});

export type User = typeof users.$inferSelect;
export type Equipa = typeof equipas.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type Marca = typeof marcas.$inferSelect;
export type Pdv = typeof pdvs.$inferSelect;
export type Servico = typeof servicos.$inferSelect;
export type Escala = typeof escalas.$inferSelect;
export type Relatorio = typeof relatorios.$inferSelect;
export type Role = User['role'];
