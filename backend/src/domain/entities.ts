import type { StatusOP } from "./status";

/** IDs vindos do legado (quando existirem) */
export type OPNumero = number;   // ORP_SERIE no Microsys
export type OPLegacyId = number; // ORP_ID no Microsys

/** Nomes fixos dos setores que vamos usar no app */
export type SetorNome =
  | "Perfiladeira"
  | "Serralheria"
  | "Eixo"
  | "Pintura"
  | "Expedição"; // 'Expedição' é visível e editável só no painel dela e NÃO entra no % concluído

/** Catálogo de setores (para UI e regras) */
export const SETORES: Record<SetorNome, {
  nome: SetorNome;
  visivelNoApp: boolean;
  contaNoProgresso: boolean;
}> = {
  Perfiladeira:   { nome: "Perfiladeira",   visivelNoApp: true, contaNoProgresso: true  },
  Serralheria:    { nome: "Serralheria",    visivelNoApp: true, contaNoProgresso: true  },
  Eixo:           { nome: "Eixo",           visivelNoApp: true, contaNoProgresso: true  },
  Pintura:        { nome: "Pintura",        visivelNoApp: true, contaNoProgresso: true  },
  Expedição:      { nome: "Expedição",      visivelNoApp: true, contaNoProgresso: false }, // <- NÃO conta no %
};

/** Uma atividade do roteiro em um setor */
export interface RoteiroAtividade {
  setor: SetorNome;
  atividade?: string;     // ex: "Corte", "Solda", "Acabamento"
  ordem?: number;         // sequência dentro do setor
  concluido?: boolean;    // apontamento simples
  percentual?: number;    // se precisar granularidade por atividade
}

/** Agrupa datas principais de uma OP */
export interface OPDatas {
  emissao?: string;          // ISO (ex: "2025-09-01")
  previsaoInicio?: string;   // ISO
  previsaoTermino?: string;  // ISO
  validade?: string;         // ISO
}

/** Quantidades (cabeçalho e itens) — usamos o que estiver disponível */
export interface OPQuantidades {
  totalHdr?: number;
  produzidasHdr?: number;
  saldoHdr?: number;

  totalItens?: number;
  produzidasItens?: number;
  saldoItens?: number;
}

/** Entidade principal: Ordem de Produção (no nosso app) */
export interface OP {
  numero: OPNumero;          // Identificador humano (ORP_SERIE)
  idMicrosys?: OPLegacyId;   // ORP_ID (se houver)
  filial: number;            // EMP_FIL_CODIGO
  descricao?: string;
  status: StatusOP;

  datas?: OPDatas;
  quant?: OPQuantidades;

  cor?: string;              // texto (ex: "PRETO BRILHANTE", "SEM PINTURA")
  setoresSelecionados: SetorNome[];   // múltipla seleção
  roteiro?: RoteiroAtividade[];

  /** Campo calculado pelo nosso app (ignora Expedição) */
  progressoCalculado?: number; // 0..100 (%)
}

/** Operador (versão simples por enquanto) */
export interface Operador {
  id: string;
  nome: string;
  setor?: SetorNome;
}

/** Produto (versão simples por enquanto) */
export interface Produto {
  codigo: number;  // PRO_CODIGO
  nome?: string;
  corPadrao?: string;
}
