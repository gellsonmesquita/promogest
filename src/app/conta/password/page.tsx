import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LangSwitch } from '@/components/ui';
import { getT } from '@/i18n/server';
import { getCurrentUser, homeFor } from '@/lib/auth';
import { PasswordForm } from './password-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('conta.title') };
}

/** Usa getCurrentUser (e não requireUser) para não entrar em ciclo quando a troca é obrigatória. */
export default async function PasswordPage() {
  const [u, t] = await Promise.all([getCurrentUser(), getT()]);
  if (!u) redirect('/login');
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" style={{ width: 44, height: 44, borderRadius: 10, background: '#fff', padding: 3, objectFit: 'contain' }} />
          <div className="spacer" />
          <LangSwitch />
        </div>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="eyebrow">{u.nome}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{t('conta.title')}</h1>
            {u.trocarPassword && <p className="alert info mt">{t('conta.obrigatorio')}</p>}
          </div>
          <PasswordForm />
          {!u.trocarPassword && (
            <Link href={homeFor(u.role)} className="btn ghost block">{t('common.back')}</Link>
          )}
        </div>
      </div>
    </div>
  );
}
