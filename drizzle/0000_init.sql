CREATE TYPE "public"."acao_merch" AS ENUM('montagem', 'exposicao', 'reposicao', 'implementacao', 'auditoria', 'manutencao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."area" AS ENUM('promocao', 'merchandising');--> statement-breakpoint
CREATE TYPE "public"."estado_escala" AS ENUM('planeada', 'confirmada', 'executada', 'falta', 'substituida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."estado_pessoa" AS ENUM('ativa', 'inativa', 'suspensa');--> statement-breakpoint
CREATE TYPE "public"."estado_presenca" AS ENUM('presente', 'atrasado', 'falta', 'substituido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_relatorio" AS ENUM('rascunho', 'enviado', 'em_analise', 'aprovado', 'rejeitado', 'reenviado');--> statement-breakpoint
CREATE TYPE "public"."estado_servico" AS ENUM('rascunho', 'planeado', 'em_execucao', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."fase_foto" AS ENUM('antes', 'durante', 'depois', 'geral');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'gestor', 'supervisor', 'promotora', 'merchandiser');--> statement-breakpoint
CREATE TYPE "public"."servico_tipo" AS ENUM('campanha', 'ativacao', 'evento', 'merchandising', 'degustacao', 'panfletagem', 'exposicao', 'auditoria');--> statement-breakpoint
CREATE TYPE "public"."tipo_relatorio" AS ENUM('promotora', 'merchandising');--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"detalhe" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nif" text DEFAULT '' NOT NULL,
	"responsavel" text DEFAULT '' NOT NULL,
	"contacto" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"contratos" text[] DEFAULT '{}' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"area" "area" NOT NULL,
	"supervisor_id" uuid,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escala_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escala_id" uuid NOT NULL,
	"user_id" uuid,
	"texto" text NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servico_id" uuid NOT NULL,
	"pdv_id" uuid NOT NULL,
	"promotora_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"data" date NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fim" time NOT NULL,
	"estado" "estado_escala" DEFAULT 'planeada' NOT NULL,
	"presenca_estado" "estado_presenca",
	"presenca_hora" time,
	"presenca_validada" boolean DEFAULT false NOT NULL,
	"inicio_atividade" timestamp with time zone,
	"fim_atividade" timestamp with time zone,
	"substituta_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relatorio_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"fase" "fase_foto" DEFAULT 'geral' NOT NULL,
	"legenda" text DEFAULT '' NOT NULL,
	"mime" text NOT NULL,
	"tamanho" integer NOT NULL,
	"dados" "bytea" NOT NULL,
	"capturada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marcas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"produtos" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"link" text,
	"lida" boolean DEFAULT false NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocorrencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escala_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvida" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdvs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"zona" text DEFAULT '' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relatorio_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relatorio_id" uuid NOT NULL,
	"user_id" uuid,
	"texto" text NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relatorios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escala_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"tipo" "tipo_relatorio" NOT NULL,
	"estado" "estado_relatorio" DEFAULT 'rascunho' NOT NULL,
	"atividade" text DEFAULT '' NOT NULL,
	"quantidade" integer DEFAULT 0 NOT NULL,
	"resultados" text DEFAULT '' NOT NULL,
	"material" text DEFAULT '' NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"ocorrencias" text DEFAULT '' NOT NULL,
	"motivo_rejeicao" text,
	"feedback" text,
	"enviado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relatorios_escala_id_unique" UNIQUE("escala_id")
);
--> statement-breakpoint
CREATE TABLE "servico_pdvs" (
	"servico_id" uuid NOT NULL,
	"pdv_id" uuid NOT NULL,
	CONSTRAINT "servico_pdvs_servico_id_pdv_id_pk" PRIMARY KEY("servico_id","pdv_id")
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "servico_tipo" NOT NULL,
	"nome" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"marca_id" uuid NOT NULL,
	"produto" text DEFAULT '' NOT NULL,
	"objetivo" text DEFAULT '' NOT NULL,
	"meta" integer DEFAULT 0 NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"zona" text DEFAULT '' NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"equipa_id" uuid NOT NULL,
	"materiais" text DEFAULT '' NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"checklist" text[] DEFAULT '{}' NOT NULL,
	"estado" "estado_servico" DEFAULT 'rascunho' NOT NULL,
	"acao" "acao_merch",
	"qtd_prevista" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"equipa_id" uuid,
	"zona" text DEFAULT '' NOT NULL,
	"estado" "estado_pessoa" DEFAULT 'ativa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipas" ADD CONSTRAINT "equipas_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_historico" ADD CONSTRAINT "escala_historico_escala_id_escalas_id_fk" FOREIGN KEY ("escala_id") REFERENCES "public"."escalas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_historico" ADD CONSTRAINT "escala_historico_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_pdv_id_pdvs_id_fk" FOREIGN KEY ("pdv_id") REFERENCES "public"."pdvs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_promotora_id_users_id_fk" FOREIGN KEY ("promotora_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_substituta_id_users_id_fk" FOREIGN KEY ("substituta_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_relatorio_id_relatorios_id_fk" FOREIGN KEY ("relatorio_id") REFERENCES "public"."relatorios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcas" ADD CONSTRAINT "marcas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_escala_id_escalas_id_fk" FOREIGN KEY ("escala_id") REFERENCES "public"."escalas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorio_historico" ADD CONSTRAINT "relatorio_historico_relatorio_id_relatorios_id_fk" FOREIGN KEY ("relatorio_id") REFERENCES "public"."relatorios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorio_historico" ADD CONSTRAINT "relatorio_historico_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_escala_id_escalas_id_fk" FOREIGN KEY ("escala_id") REFERENCES "public"."escalas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servico_pdvs" ADD CONSTRAINT "servico_pdvs_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servico_pdvs" ADD CONSTRAINT "servico_pdvs_pdv_id_pdvs_id_fk" FOREIGN KEY ("pdv_id") REFERENCES "public"."pdvs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_equipa_id_equipas_id_fk" FOREIGN KEY ("equipa_id") REFERENCES "public"."equipas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_equipa_id_equipas_id_fk" FOREIGN KEY ("equipa_id") REFERENCES "public"."equipas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "escalas_data_idx" ON "escalas" USING btree ("data");--> statement-breakpoint
CREATE INDEX "escalas_promotora_idx" ON "escalas" USING btree ("promotora_id");--> statement-breakpoint
CREATE INDEX "escalas_supervisor_idx" ON "escalas" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "notificacoes_user_idx" ON "notificacoes" USING btree ("user_id");