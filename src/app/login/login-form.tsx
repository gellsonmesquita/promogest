'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/actions/auth';
import { useT } from '@/i18n/client';

export function LoginForm() {
  const t = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 28, maxWidth: 440, width: '100%' }}>
      <div>
        <div className="eyebrow">PromoGest</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{t('login.title')}</h2>
      </div>
      <div className="field">
        <label htmlFor="login">{t('login.identificador')}</label>
        <input id="login" name="login" type="text" className="input" autoComplete="username" autoCapitalize="none" required defaultValue={state?.login} placeholder={t('login.identificadorPh')} />
      </div>
      <div className="field">
        <label htmlFor="password">{t('login.password')}</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state?.error && <div className="alert bad">{state.error}</div>}
      <button className="btn primary lg block" type="submit" disabled={pending}>
        {pending ? t('login.submitting') : t('login.submit')}
      </button>
    </form>
  );
}
