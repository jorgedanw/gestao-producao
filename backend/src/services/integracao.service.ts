import {
  buscarOpsJanelaFilial1,
  buscarRoteiroPorOps,
  listarCodigosSetorJanelaFilial1,
  listarCodigosSetorTodos,
  buscarRoteiroDeUmaOP,
  buscarOpsJanela, // <- nova função com parâmetros
} from "../repositories/integracao.repo";
import { mapLegacyStatus } from "../domain/status";
import type { OP, RoteiroAtividade, SetorNome } from "../domain/entities";
import { SETOR_LEGACY_MAP } from "../config/setores.map";

type Row = {
  OP_NUMERO: number;
  ORP_ID: number;
  FILIAL: number;
  DESCRICAO: string | null;

  DATA_EMISSAO: Date | null;
  PREVISAO_INICIO: Date | null;
  PREVISAO_TERMINO: Date | null;
  DATA_VALIDADE: Date | null;

  STATUS_OP: string | null;

  QTD_TOTAL_HDR: number | null;
  QTD_PRODUZIDAS_HDR: number | null;
  QTD_SALDO_HDR: number | null;

  QTD_TOTAL_ITENS: number | null;
  QTD_PRODUZIDAS_ITENS: number | null;
  QTD_SALDO_ITENS: number | null;

  PERCENT_CONCLUIDO: number | null;
  COR: string | null;
};

function toISO(d?: Date | null) {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}
function mapSetor(code: any): SetorNome | undefined {
  const n = Number(code);
  if (!Number.isFinite(n)) return undefined;
  return SETOR_LEGACY_MAP[n];
}

function montarOPs(rows: Row[]): OP[] {
  return rows.map((r) => ({
    numero: r.OP_NUMERO,
    idMicrosys: r.ORP_ID,
    filial: r.FILIAL,
    descricao: r.DESCRICAO ?? undefined,
    status: mapLegacyStatus(r.STATUS_OP ?? ""),
    datas: {
      emissao: toISO(r.DATA_EMISSAO),
      previsaoInicio: toISO(r.PREVISAO_INICIO),
      previsaoTermino: toISO(r.PREVISAO_TERMINO),
      validade: toISO(r.DATA_VALIDADE),
    },
    quant: {
      totalHdr: r.QTD_TOTAL_HDR ?? undefined,
      produzidasHdr: r.QTD_PRODUZIDAS_HDR ?? undefined,
      saldoHdr: r.QTD_SALDO_HDR ?? undefined,
      totalItens: r.QTD_TOTAL_ITENS ?? undefined,
      produzidasItens: r.QTD_PRODUZIDAS_ITENS ?? undefined,
      saldoItens: r.QTD_SALDO_ITENS ?? undefined,
    },
    cor: r.COR ?? undefined,
    setoresSelecionados: [],
    roteiro: [],
    progressoCalculado: Number(r.PERCENT_CONCLUIDO ?? 0),
  }));
}

/** Deduplica roteiro por setor, pegando a menor ordem de cada setor */
function dedupRoteiroPorSetor(ativs: RoteiroAtividade[]): RoteiroAtividade[] {
  const best = new Map<SetorNome, RoteiroAtividade>();
  for (const a of ativs) {
    const prev = best.get(a.setor);
    if (!prev || (a.ordem ?? 9999) < (prev.ordem ?? 9999)) best.set(a.setor, a);
  }
  return Array.from(best.values()).sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999));
}

export const IntegracaoService = {
  /** Versão antiga (filial 1 + janela fixa). Mantida para compatibilidade. */
  async listarOpsJanelaFilial1(incluirRoteiro = false): Promise<OP[]> {
    const rows = (await buscarOpsJanelaFilial1()) as Row[];
    const ops: OP[] = montarOPs(rows);
    if (!incluirRoteiro || ops.length === 0) return ops;

    const numeros = ops.map((o) => o.numero);
    const rt = (await buscarRoteiroPorOps(numeros)) as Array<{
      OP_NUMERO: number;
      SETOR_CODIGO: number;
      ORDEM: number | null;
    }>;

    const byOp = new Map<number, RoteiroAtividade[]>();
    for (const row of rt) {
      const setor = mapSetor(row.SETOR_CODIGO);
      if (!setor) continue;
      const arr = byOp.get(row.OP_NUMERO) ?? [];
      arr.push({ setor, ordem: row.ORDEM ?? undefined });
      byOp.set(row.OP_NUMERO, arr);
    }

    for (const op of ops) {
      const arr = byOp.get(op.numero) ?? [];
      const uniq = dedupRoteiroPorSetor(arr);
      op.roteiro = uniq;
      op.setoresSelecionados = uniq.map((r) => r.setor);
    }
    return ops;
  },

  /** NOVO: versão parametrizável (filial, status, janela, limit) */
  async listarOps(params: {
    incluirRoteiro?: boolean;
    filial?: number;
    status?: string[]; // códigos legados (ex.: ['AA','SS','EP'])
    janela: { // datas ISO (YYYY-MM-DD)
      prevInicioDe: string;
      prevInicioAte: string;
      validadeDe: string;
      validadeAte: string;
    };
    limit?: number;
  }): Promise<OP[]> {
    const rows = (await buscarOpsJanela(params)) as Row[];
    const ops = montarOPs(rows);
    if (!params.incluirRoteiro || ops.length === 0) return ops;

    const numeros = ops.map((o) => o.numero);
    const rt = (await buscarRoteiroPorOps(numeros)) as Array<{
      OP_NUMERO: number;
      SETOR_CODIGO: number;
      ORDEM: number | null;
    }>;

    const byOp = new Map<number, RoteiroAtividade[]>();
    for (const row of rt) {
      const setor = mapSetor(row.SETOR_CODIGO);
      if (!setor) continue;
      const arr = byOp.get(row.OP_NUMERO) ?? [];
      arr.push({ setor, ordem: row.ORDEM ?? undefined });
      byOp.set(row.OP_NUMERO, arr);
    }

    for (const op of ops) {
      const arr = byOp.get(op.numero) ?? [];
      const uniq = dedupRoteiroPorSetor(arr);
      op.roteiro = uniq;
      op.setoresSelecionados = uniq.map((r) => r.setor);
    }
    return ops;
  },

  async listarCodigosSetorJanela() {
    const rows = await listarCodigosSetorJanelaFilial1();
    return rows.map((r: any) => ({
      codigo: Number(r.SETOR_CODIGO),
      qtde: Number(r.QTDE),
      mapeadoPara: mapSetor(r.SETOR_CODIGO) ?? null,
    }));
  },

  async listarCodigosSetorTodos() {
    const rows = await listarCodigosSetorTodos();
    return rows.map((r: any) => ({
      codigo: Number(r.SETOR_CODIGO),
      qtde: Number(r.QTDE),
      mapeadoPara: mapSetor(r.SETOR_CODIGO) ?? null,
    }));
  },

  async roteiroDeUmaOP(numero: number) {
    const rows = await buscarRoteiroDeUmaOP(numero);
    return rows.map((r: any) => ({
      numero: Number(r.OP_NUMERO),
      setorCodigo: Number(r.SETOR_CODIGO),
      setorNome: mapSetor(r.SETOR_CODIGO) ?? null,
      ordem: r.ORDEM ?? null,
    }));
  },
};
