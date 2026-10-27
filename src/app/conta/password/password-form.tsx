'use client';

import { useActionState } from 'react';
import { alterarPassword, type PasswordState } from '@/app/actions/auth';
import { useT } from '@/i18n/client';

export function PasswordForm() {
  const t = useT();
  const [state, action, pending] = useActionState<PasswordState, FormData>(alterarPassword, undefined);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field">
        <label htmlFor="atual">{t('conta.atual')}</label>
        <input id="atual" name="atual" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="nova">{t('conta.nova')}</label>
        <input id="nova" name="nova" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="confirmar">{t('conta.confirmar')}</label>
        <input id="confirmar" name="confirmar" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <div className="alert bad">{state.error}</div>}
      <button className="btn primary lg block" type="submit" disabled={pending}>
        {pending ? t('common.saving') : t('conta.guardar')}
      </button>
    </form>
  );
}
