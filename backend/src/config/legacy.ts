// backend/src/config/legacy.ts
/**
 * Config do legado (Microsys): qual tabela contém o roteiro.
 * Na sua base é PCP_APTO_ROTEIRO. Mantemos variável para ficar flexível.
 */
export const LEGACY = {
  ROTEIRO_TABLE: (process.env.FB_ROTEIRO_TABLE ?? "PCP_APTO_ROTEIRO").toUpperCase(),
};
