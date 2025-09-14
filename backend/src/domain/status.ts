/**
 * Status de negócio do nosso sistema (nomes claros).
 * Observação: "ENTRADA PARCIAL" pode aparecer no legado como 'EP' ou 'SS'.
 */
export type StatusOP =
  | "ABERTA"
  | "INICIADA"
  | "ENTRADA_PARCIAL"
  | "FINALIZADA"
  | "CANCELADA"
  | "OUTRO";

/** Códigos que podem vir do Microsys/legado (tabelas Firebird) */
export type StatusLegacy = "AA" | "IN" | "EP" | "SS" | "FF" | "CC" | string;

/** Converte código legado para nosso StatusOP claro */
export function mapLegacyStatus(code: StatusLegacy): StatusOP {
  const c = String(code || "").toUpperCase().trim();

  if (c === "AA") return "ABERTA";
  if (c === "IN") return "INICIADA";
  if (c === "EP" || c === "SS") return "ENTRADA_PARCIAL";
  if (c === "FF") return "FINALIZADA";
  if (c === "CC") return "CANCELADA";

  return "OUTRO";
}
