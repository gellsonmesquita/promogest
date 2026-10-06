import { and, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui';
import { db } from '@/db';
import { clientes, marcas, pdvs, users } from '@/db/schema';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { addDays, hoje } from '@/lib/dates';
import { getServico, isGestao } from '@/lib/queries';
import { ServicoForm } from './servico-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.servicos') };
}

export default async function ServicoPage({ params }: PageProps<'/app/servicos/[id]'>) {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const { id } = await params;
  const novo = id === 'novo';
  if (novo && !isGestao(u)) notFound();
  if (!novo && !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const servico = novo ? null : await getServico(u, id);
  if (!novo && !servico) notFound();

  const [cs, ms, ps, sups, eqs] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).where(eq(clientes.ativo, true)),
    db.select().from(marcas),
    db.select({ id: pdvs.id, nome: pdvs.nome, zona: pdvs.zona }).from(pdvs).where(eq(pdvs.ativo, true)),
    db.select({ id: users.id, nome: users.nome, equipaId: users.equipaId }).from(users).where(and(eq(users.role, 'supervisor'), eq(users.estado, 'ativa'))),
    db.query.equipas.findMany(),
  ]);

  const inicial = servico
    ? { ...servico, acao: servico.acao ?? 'implementacao', qtdPrevista: servico.qtdPrevista ?? 0 }
    : {
        id: undefined, tipo: 'campanha' as const, nome: '', clienteId: '', marcaId: '', produto: '', objetivo: '', meta: 0,
        inicio: hoje(), fim: addDays(hoje(), 14), zona: '', equipaId: '', supervisorId: '', pdvIds: [] as string[],
        materiais: '', observacoes: '', checklist: [] as string[], estado: 'rascunho' as const, acao: 'implementacao' as const, qtdPrevista: 0,
      };

  return (
    <div className="page">
      <Link href="/app/servicos" className="row small strong mb" style={{ gap: 6 }}>
        <Icon name="back" size={16} /> {t('serv.voltar')}
      </Link>
      <ServicoForm
        inicial={inicial}
        editavel={isGestao(u)}
        clientes={cs}
        marcas={ms.map((m) => ({ id: m.id, nome: m.nome, clienteId: m.clienteId, produtos: m.produtos }))}
        pdvs={ps}
        supervisores={sups}
        equipas={eqs.map((e) => ({ id: e.id, nome: e.nome, area: e.area, supervisorId: e.supervisorId }))}
      />
    </div>
  );
}
