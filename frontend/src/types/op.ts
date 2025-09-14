export type SetorNome =
  | "Perfiladeira"
  | "Serralheria"
  | "Pintura"
  | "Eixo"
  | string;

export type StatusOP = string;

export interface RoteiroAtividade {
  setor: SetorNome;
  ordem?: number;
}

export interface OP {
  numero: number;
  idMicrosys: number;
  filial: number;
  descricao?: string;
  status: StatusOP;
  datas: {
    emissao?: string;
    previsaoInicio?: string;
    previsaoTermino?: string;
    validade?: string;
  };
  quant: {
    totalHdr?: number;
    produzidasHdr?: number;
    saldoHdr?: number;
    totalItens?: number;
    produzidasItens?: number;
    saldoItens?: number;
  };
  cor?: string;
  setoresSelecionados: SetorNome[];
  roteiro: RoteiroAtividade[];
  progressoCalculado: number; // 0..100
}
