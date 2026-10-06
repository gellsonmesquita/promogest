/** Fuso horário da operação (Luanda, UTC+1). */
export const TZ = 'Africa/Luanda';

/** Data de hoje (YYYY-MM-DD) no fuso da operação. */
export function hoje(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Hora atual (HH:mm) no fuso da operação. */
export function agoraHHmm(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function hm(t?: string | null): string {
  return t ? t.slice(0, 5) : '';
}

export function minutos(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutes(t: string, mins: number): string {
  const total = minutos(t) + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function overlaps(aIni: string, aFim: string, bIni: string, bFim: string): boolean {
  return hm(aIni) < hm(bFim) && hm(bIni) < hm(aFim);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(intl: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = intl + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intl, { timeZone: TZ, hourCycle: 'h23', ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

export const D_LONGO: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: '2-digit' };
export const D_CURTO: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
export const DH_CURTO: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
export const DH_LONGO: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };

/** Formata uma data ISO (YYYY-MM-DD) no idioma indicado (`intl`, ex.: "pt-PT"). */
export function fmtDia(iso: string, intl: string, opts: Intl.DateTimeFormatOptions = D_LONGO): string {
  return fmt(intl, opts).format(new Date(iso + 'T12:00:00Z'));
}

/** Formata um timestamp no idioma indicado. */
export function fmtDataHora(d: Date | string | null | undefined, intl: string, opts: Intl.DateTimeFormatOptions = DH_CURTO): string {
  if (!d) return '—';
  return fmt(intl, opts).format(typeof d === 'string' ? new Date(d) : d);
}

export function fmtHora(d: Date | string | null | undefined, intl: string): string {
  return fmtDataHora(d, intl, { hour: '2-digit', minute: '2-digit' });
}
