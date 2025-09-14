import type { ListOpsQuery, ListOpsResponse, CreateOpDTO, CreateOpResponse } from "../domain/dto";
import { OpsRepo } from "../repositories/ops.repo";

/**
 * Camada de serviço:
 * - define padrões (datas, filtros)
 * - aciona o repositório (fonte de dados)
 * - NÃO conhece Fastify nem HTTP
 */
export const OpsService = {
  async list(q: ListOpsQuery): Promise<ListOpsResponse> {
    // defaults de janela (como combinamos): prev.início D-7..D+21 OU validade D-7..D+30
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

    const params = {
      filial: q.filial ?? 1,
      status: q.status ?? ["ABERTA", "ENTRADA_PARCIAL"],
      prevInicioDe: q.prevInicioDe ?? iso(addDays(today, -7)),
      prevInicioAte: q.prevInicioAte ?? iso(addDays(today, +21)),
      validadeDe: q.validadeDe ?? iso(addDays(today, -7)),
      validadeAte: q.validadeAte ?? iso(addDays(today, +30)),
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
      sort: q.sort ?? "validade",
      ordem: q.ordem ?? "asc",
    } as ListOpsQuery;

    return OpsRepo.list(params);
  },

  async create(dto: CreateOpDTO): Promise<CreateOpResponse> {
    return OpsRepo.create(dto);
  },
};
