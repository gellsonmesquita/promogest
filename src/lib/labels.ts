// Os textos (perfis, estados, tipos…) estão nos dicionários em src/i18n/dictionaries.

export type Tone = 'neutral' | 'info' | 'warn' | 'ok' | 'bad' | 'gold';

/** Cor de cada estado (o rótulo vem do dicionário `status`). */
export const STATUS_TONE: Record<string, Tone> = {
  rascunho: 'neutral', planeado: 'info', em_execucao: 'gold', concluido: 'ok', cancelado: 'neutral', nao_executado: 'bad',
  planeada: 'info', confirmada: 'gold', executada: 'ok', falta: 'bad', substituida: 'warn', cancelada: 'neutral',
  presente: 'ok', atrasado: 'warn', substituido: 'warn',
  enviado: 'info', em_analise: 'gold', aprovado: 'ok', rejeitado: 'bad', reenviado: 'info',
  ativa: 'ok', inativa: 'neutral', suspensa: 'bad',
};

export const PENDENTES = ['enviado', 'reenviado', 'em_analise'] as const;

export const SERVICO_TIPOS = ['campanha', 'ativacao', 'evento', 'merchandising', 'degustacao', 'panfletagem', 'exposicao', 'auditoria'] as const;
export const ACOES_MERCH = ['montagem', 'exposicao', 'reposicao', 'implementacao', 'auditoria', 'manutencao', 'outro'] as const;
export const ROLES = ['admin', 'gestor', 'supervisor', 'promotora', 'merchandiser'] as const;

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

export const fotoUrl = (id: string) => `/api/fotos/${id}`;
