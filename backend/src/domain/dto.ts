import type { OP, SetorNome, StatusOP } from "./entities";

/** Filtros para GET /ops (todos opcionais) */
export interface ListOpsQuery {
  filial?: number;              // padrão: 1
  status?: StatusOP[];          // padrão: ["ABERTA","ENTRADA_PARCIAL"]
  prevInicioDe?: string;        // ISO; padrão: hoje-7
  prevInicioAte?: string;       // ISO; padrão: hoje+21
  validadeDe?: string;          // ISO; padrão: hoje-7
  validadeAte?: string;         // ISO; padrão: hoje+30
  page?: number;                // padrão: 1
  pageSize?: number;            // padrão: 20
  sort?: "validade" | "prevInicio" | "numero"; // padrão: validade->prevInicio->numero
  ordem?: "asc" | "desc";       // padrão: asc
}

/** Resumo de paginação */
export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Resposta do GET /ops */
export interface ListOpsResponse {
  data: OP[];
  meta: PageMeta;
}

/**
 * Corpo do POST /ops
 * NOTA: No M4 decidiremos se cria no legado. Até lá, este POST grava no nosso
 * "banco auxiliar" (ou em memória) para alimentar os painéis.
 */
export interface CreateOpDTO {
  descricao: string;
  setores: SetorNome[];     // múltipla seleção
  cor?: string;             // menu com opções pré-definidas (UI)
  observacoes?: string;
  tipoEntrega?: "Retira" | "Entrega" | "Instalação"; // "Instalação" fica no Tipo de Entrega (não é setor)
}

/** Resposta curta do POST */
export interface CreateOpResponse {
  numeroGerado: number;
  status: "ABERTA";
}
