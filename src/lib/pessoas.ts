/** Palavra-passe temporária definida pela gestão; a pessoa é obrigada a trocá-la no próximo acesso. */
export const PASSWORD_TEMPORARIA = '123456';
/** Mínimo para palavras-passe temporárias (definidas pela gestão). A palavra-passe escolhida pela própria pessoa exige 8. */
export const PASSWORD_TEMP_MIN = 6;

export const AUSENCIA_TIPOS = ['ferias', 'luto', 'licenca_maternidade', 'doenca', 'acidente', 'outro'] as const;
export type AusenciaTipo = (typeof AUSENCIA_TIPOS)[number];

/** A pessoa está ausente na data indicada (YYYY-MM-DD)? Sem data de regresso = ausente até indicação em contrário. */
export function ausenteEm(p: { ausenciaTipo: string | null; ausenteAte: string | null }, data: string): boolean {
  if (!p.ausenciaTipo) return false;
  return !p.ausenteAte || data <= p.ausenteAte;
}
