import type { ListOpsQuery, ListOpsResponse, CreateOpDTO, CreateOpResponse } from "../domain/dto";
import type { OP } from "../domain/entities";
import { OPS_MOCK } from "../mocks/ops";
import { computeProgressPercent } from "../utils/progress";

let store: OP[] = OPS_MOCK.map((op) => ({
  ...op,
  progressoCalculado: computeProgressPercent(op.quant),
}));

/**
 * Funções que acessam a "fonte de dados".
 * No M3 usamos memória. No M4 trocamos por Firebird/SQL ou banco auxiliar.
 */
export const OpsRepo = {
  async list(q: ListOpsQuery): Promise<ListOpsResponse> {
    // filtros básicos
    const inRange = (value?: string, de?: string, ate?: string) => {
      if (!value) return false;
      if (de && value < de) return false;
      if (ate && value > ate) return false;
      return true;
    };

    let rows = store.filter((op) => op.filial === (q.filial ?? 1));

    // status
    if (q.status && q.status.length > 0) {
      rows = rows.filter((op) => q.status!.includes(op.status));
    }

    // janela (qualquer uma das datas atende: previsão de início OU validade)
    rows = rows.filter((op) => {
      const prevOk = inRange(op.datas?.previsaoInicio, q.prevInicioDe, q.prevInicioAte);
      const valOk = inRange(op.datas?.validade, q.validadeDe, q.validadeAte);
      return prevOk || valOk;
    });

    // ordenação
    rows.sort((a, b) => {
      const dir = q.ordem === "desc" ? -1 : 1;
      const by = q.sort ?? "validade";

      const getKey = (op: OP) =>
        by === "numero"
          ? String(op.numero).padStart(8, "0")
          : by === "prevInicio"
          ? (op.datas?.previsaoInicio ?? "")
          : (op.datas?.validade ?? "");

      return getKey(a) > getKey(b) ? dir : getKey(a) < getKey(b) ? -dir : 0;
    });

    // paginação
    const totalItems = rows.length;
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const data = rows.slice(start, start + pageSize);

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  },

  async create(dto: CreateOpDTO): Promise<CreateOpResponse> {
    // gera um número novo simples (máximo atual + 1)
    const novoNumero = (store.reduce((max, op) => Math.max(max, op.numero), 0) || 6000) + 1;

    const novaOP: OP = {
      numero: novoNumero,
      filial: 1,
      descricao: dto.descricao,
      status: "ABERTA",
      datas: { emissao: new Date().toISOString().slice(0, 10) },
      quant: { totalItens: 0, saldoItens: 0, produzidasItens: 0 }, // inicia zerado
      cor: dto.cor,
      setoresSelecionados: dto.setores,
      progressoCalculado: 0, // expedição não entra no %
    };

    store.unshift(novaOP); // adiciona no topo

    return {
      numeroGerado: novoNumero,
      status: "ABERTA",
    };
  },
};
