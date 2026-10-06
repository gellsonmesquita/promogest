import type { Metadata } from 'next';
import { PageHead, StatusBadge } from '@/components/ui';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { iniciais, ROLE_LABEL } from '@/lib/labels';
import { equipaDeCampo, equipasVisiveis, getRefs, isGestao, listUsers } from '@/lib/queries';
import { EditarPessoa, EditarEquipa, NovaPessoa } from './equipas-client';

export const metadata: Metadata = { title: 'Equipas' };

export default async function EquipasPage() {
  const u = await requireUser(WEB_ROLES);
  const gestao = isGestao(u);
  const [refs, eqs, campo, todos] = await Promise.all([getRefs(), equipasVisiveis(u), equipaDeCampo(u), gestao ? listUsers() : Promise.resolve([])]);
  const equipasOpt = eqs.map((e) => ({ id: e.id, nome: e.nome }));
  const supervisores = todos.filter((x) => x.role === 'supervisor' && x.estado === 'ativa').map((x) => ({ id: x.id, nome: x.nome }));

  return (
    <div className="page">
      <PageHead eyebrow="Hierarquia operacional" title="Equipas" desc="Administrador → Gestor → Supervisor → Promotoras / Merchandising">
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
                  <div className="small muted">
                    {e.area === 'merchandising' ? 'Merchandising' : 'Promoção'} · Supervisor: {refs.nome(e.supervisorId)}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip">{membros.length}</span>
                  {gestao && <EditarEquipa supervisores={supervisores} equipa={{ id: e.id, nome: e.nome, area: e.area, supervisorId: e.supervisorId ?? '', ativa: e.ativa }} />}
                </div>
              </div>
              <div className="list">
                {membros.length === 0 && <div className="muted small">Sem membros.</div>}
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
          <div className="card-head"><h3>Todas as pessoas</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Perfil</th><th>Equipa</th><th>Contacto</th><th>Zona</th><th>Estado</th><th /></tr>
              </thead>
              <tbody>
                {todos.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{p.nome}</td>
                    <td>{ROLE_LABEL[p.role]}</td>
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
