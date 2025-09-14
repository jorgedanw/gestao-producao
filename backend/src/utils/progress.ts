import type { OPQuantidades } from "../domain/entities";

/**
 * Calcula % concluído:
 * - se houver base de ITENS -> usa (1 - saldoItens/totalItens) * 100
 * - senão, tenta cabeçalho
 * - arredonda com 2 casas
 * Obs.: Expedição NÃO entra no cálculo (regra de negócio), mas aqui trabalhamos
 * com as quantidades consolidadas já sem expedição.
 */
export function computeProgressPercent(q?: OPQuantidades): number {
  if (!q) return 0;

  if (q.totalItens && q.totalItens > 0) {
    const perc = (1 - (q.saldoItens ?? 0) / q.totalItens) * 100;
    return Math.max(0, Math.min(100, round2(perc)));
  }

  if (q.totalHdr && q.totalHdr > 0) {
    const perc = (1 - (q.saldoHdr ?? 0) / q.totalHdr) * 100;
    return Math.max(0, Math.min(100, round2(perc)));
  }

  return 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
