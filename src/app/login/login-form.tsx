'use client';

import { useActionState, useRef } from 'react';
import { login, type LoginState } from '@/app/actions/auth';
import { useT } from '@/i18n/client';

type Demo = { nome: string; email: string; perfil: string };

export function LoginForm({ demo }: { demo: Demo[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const email = useRef<HTMLInputElement>(null);
  const pw = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={action} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 28, maxWidth: 440, width: '100%' }}>
        <div>
          <div className="eyebrow">PromoGest</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{t('login.title')}</h2>
        </div>
        <div className="field">
          <label htmlFor="email">{t('login.email')}</label>
          <input ref={email} id="email" name="email" type="email" className="input" autoComplete="username" required defaultValue={state?.email} />
        </div>
        <div className="field">
          <label htmlFor="password">{t('login.password')}</label>
          <input ref={pw} id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        {state?.error && <div className="alert bad">{state.error}</div>}
        <button className="btn primary lg block" type="submit" disabled={pending}>
          {pending ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      {demo.length > 0 && (
        <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="small muted strong">{t('login.demo')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
            {demo.map((d) => (
              <button
                key={d.email}
                type="button"
                className="btn"
                style={{ height: 'auto', padding: '10px 12px', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
                onClick={() => {
                  if (email.current) email.current.value = d.email;
                  pw.current?.focus();
                }}
              >
                <span className="strong">{d.nome}</span>
                <span className="small muted" style={{ fontWeight: 500 }}>{d.perfil}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
