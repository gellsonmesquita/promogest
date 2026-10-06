import type { Metadata } from 'next';
import { LangSwitch } from '@/components/ui';
import { getT } from '@/i18n/server';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('login.title') };
}

const DEMO = [
  { nome: 'Administrador Noble', email: 'admin@noblegroup.ao', perfil: 'admin' },
  { nome: 'Marta Fernandes', email: 'marta.fernandes@noblegroup.ao', perfil: 'gestor' },
  { nome: 'Carlos Domingos', email: 'carlos.domingos@noblegroup.ao', perfil: 'supervisor' },
  { nome: 'Paulo Neto', email: 'paulo.neto@noblegroup.ao', perfil: 'supMerch' },
  { nome: 'Ana Lopes', email: 'ana.lopes@noblegroup.ao', perfil: 'promotora' },
  { nome: 'Gaspar Manuel', email: 'gaspar.manuel@noblegroup.ao', perfil: 'merch' },
] as const;

export default async function LoginPage() {
  const t = await getT();
  // As contas de demonstração só aparecem em desenvolvimento.
  const demo = process.env.NODE_ENV !== 'production' ? DEMO.map((d) => ({ ...d, perfil: t(`login.demoRoles.${d.perfil}`) })) : [];
  return (
    <div className="login-wrap">
      <section className="login-brand">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="Noble Group Distribuição" className="login-logo" />
          <LangSwitch dark />
        </div>
        <div>
          <h1>{t('login.heroTitle')}</h1>
          <p>{t('login.heroText')}</p>
        </div>
      </section>
      <section className="login-panel">
        <LoginForm demo={demo} />
      </section>
      <style>{`
        .login-wrap { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; }
        .login-brand { background: radial-gradient(circle at 20% 10%, #2a241b, #14110d 70%); color: #efe6d2; padding: 48px clamp(24px, 5vw, 72px);
          display: flex; flex-direction: column; justify-content: space-between; gap: 32px; }
        .login-logo { width: 210px; background: #fff; border-radius: 18px; padding: 16px; }
        .login-brand h1 { font-size: clamp(28px, 3.4vw, 44px); font-weight: 800; color: #fff; max-width: 14ch; line-height: 1.1; }
        .login-brand p { color: #bfb39b; max-width: 44ch; font-size: 15px; line-height: 1.6; margin-top: 12px; }
        .login-panel { display: flex; flex-direction: column; justify-content: center; gap: 24px; padding: 40px clamp(16px, 5vw, 72px); }
        @media (max-width: 860px) {
          .login-wrap { grid-template-columns: 1fr; }
          .login-brand { padding: 20px; gap: 12px; }
          .login-logo { width: 72px; padding: 6px; }
          .login-brand p { display: none; }
          .login-brand h1 { font-size: 22px; }
          .login-panel { padding: 24px 16px; justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
}
