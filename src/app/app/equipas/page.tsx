import type { Metadata } from 'next';
import { PageHead, StatusBadge } from '@/components/ui';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { iniciais } from '@/lib/labels';
import { equipaDeCampo, equipasVisiveis, getRefs, isGestao, listUsers } from '@/lib/queries';
import { EditarEquipa, EditarPessoa, NovaPessoa } from './equipas-client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.equipas') };
}

export default async function EquipasPage() {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const gestao = isGestao(u);
  const [refs, eqs, campo, todos] = await Promise.all([getRefs(), equipasVisiveis(u), equipaDeCampo(u), gestao ? listUsers() : Promise.resolve([])]);
  const equipasOpt = eqs.map((e) => ({ id: e.id, nome: e.nome }));
  const supervisores = todos.filter((x) => x.role === 'supervisor' && x.estado === 'ativa').map((x) => ({ id: x.id, nome: x.nome }));

  return (
    <div className="page">
      <PageHead eyebrow={t('equipas.eyebrow')} title={t('equipas.title')} desc={t('equipas.desc')}>
        {gestao && (
          <div className="row">
            <EditarEquipa supervisores={supervisores} />
            <NovaPessoa equipas={equipasOpt} podeGestao={u.role === 'admin'} />
          </div>
        )}
      </PageHead>

      <div className="grid-auto g-3 mb">
        {eqs.map((e) => {
          const membros = campo.filter((p) => p.equipaId === e.id);
          return (
            <section className="card" key={e.id} style={e.ativa ? undefined : { opacity: 0.6 }}>
              <div className="card-head">
                <div>
                  <h3>{e.nome}</h3>
                  <div className="small muted">{t(`area.${e.area}`)} · {t('equipas.supervisor', { nome: refs.nome(e.supervisorId) })}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip">{membros.length}</span>
                  {gestao && <EditarEquipa supervisores={supervisores} equipa={{ id: e.id, nome: e.nome, area: e.area, supervisorId: e.supervisorId ?? '', ativa: e.ativa }} />}
                </div>
              </div>
              <div className="list">
                {membros.length === 0 && <div className="muted small">{t('equipas.semMembros')}</div>}
                {membros.map((m) => (
                  <div className="item" key={m.id}>
                    <span className="avatar">{iniciais(m.nome)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="strong">{m.nome}</div>
                      <div className="small muted">{m.telefone} · {m.zona}</div>
                    </div>
                    <StatusBadge value={m.estado} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {gestao && (
        <>
          <div className="card-head"><h3>{t('equipas.todas')}</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('equipas.thNome')}</th><th>{t('equipas.thPerfil')}</th><th>{t('equipas.thEquipa')}</th><th>{t('equipas.thContacto')}</th>
                  <th>{t('equipas.thZona')}</th><th>{t('equipas.thEstado')}</th><th />
                </tr>
              </thead>
              <tbody>
                {todos.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{p.nome}</td>
                    <td>{t(`roles.${p.role}`)}</td>
                    <td>{refs.equipas.get(p.equipaId ?? '')?.nome ?? '—'}</td>
                    <td><div>{p.email}</div><div className="small muted">{p.telefone}</div></td>
                    <td>{p.zona}</td>
                    <td><StatusBadge value={p.estado} /></td>
                    <td>
                      {(u.role === 'admin' || !['admin', 'gestor'].includes(p.role) || p.id === u.id) && (
                        <EditarPessoa pessoa={{ ...p, equipaId: p.equipaId ?? '' }} equipas={equipasOpt} podeGestao={u.role === 'admin'} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
