CREATE TYPE "public"."ausencia_tipo" AS ENUM('ferias', 'luto', 'licenca_maternidade', 'doenca', 'acidente', 'outro');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pdvs" ADD COLUMN "cadeia" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pdvs" ADD COLUMN "kam" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "numero_funcionario" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trocar_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pdv_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "centro_custo" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "data_admissao" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ausencia_tipo" "ausencia_tipo";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ausente_ate" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "observacoes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pdv_id_pdvs_id_fk" FOREIGN KEY ("pdv_id") REFERENCES "public"."pdvs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_numero_funcionario_unique" UNIQUE("numero_funcionario");