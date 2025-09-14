import type { SetorNome } from "../domain/entities";

/**
 * Mapa: código numérico do setor no Microsys -> nome usado no app.
 * Preencha aqui conforme o seu legado (OPR_SET_CODIGO).
 */
export const SETOR_LEGACY_MAP = {
  1: "Perfiladeira",
  3: "Serralheria",
  4: "Pintura",
  6: "Eixo",
  // quando souber: <codigo>: "Expedição",
} as const;

