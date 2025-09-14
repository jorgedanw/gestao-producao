import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { OpsService } from "../services/ops.service";
import type { StatusOP } from "../domain/status";
import type { ListOpsQuery, CreateOpDTO } from "../domain/dto";

// Lista dos status permitidos (mesmos do domínio)
const STATUS_VALUES = [
  "ABERTA",
  "INICIADA",
  "ENTRADA_PARCIAL",
  "FINALIZADA",
  "CANCELADA",
  "OUTRO",
] as const;

const DEFAULT_STATUS: StatusOP[] = ["ABERTA", "ENTRADA_PARCIAL"];

/**
 * Aceita:
 *   - status=ABERTA
 *   - status=ABERTA&status=ENTRADA_PARCIAL
 *   - status=ABERTA,ENTRADA_PARCIAL
 * Converte qualquer formato para array de StatusOP.
 */
const StatusAsArraySchema = z
  .union([z.enum(STATUS_VALUES), z.array(z.enum(STATUS_VALUES))])
  .optional()
  .transform((v): StatusOP[] => {
    if (v === undefined) return DEFAULT_STATUS;
    // Se veio string única, vira array
    if (!Array.isArray(v)) return [v];
    return v;
  });

// Schema de query para GET /ops
const ListSchema = z.object({
  filial: z.coerce.number().int().positive().optional().default(1),

  // Usa o esquema acima e ainda tolera "string com vírgulas"
  status: z
    .preprocess((val) => {
      // Se veio "ABERTA,ENTRADA_PARCIAL", vira ["ABERTA","ENTRADA_PARCIAL"]
      if (typeof val === "string" && val.includes(",")) {
        return val.split(",").map((s) => s.trim());
      }
      return val;
    }, StatusAsArraySchema)
    .optional(),

  prevInicioDe: z.string().optional(),
  prevInicioAte: z.string().optional(),
  validadeDe: z.string().optional(),
  validadeAte: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["validade", "prevInicio", "numero"]).optional().default("validade"),
  ordem: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Schema de body para POST /ops
const CreateSchema = z.object({
  descricao: z.string().min(3, "Descrição muito curta"),
  setores: z
    .array(
      z.enum(["Perfiladeira", "Serralheria", "Eixo", "Pintura", "Expedição"] as const)
    )
    .min(1, "Selecione pelo menos 1 setor"),
  cor: z.string().optional(),
  observacoes: z.string().optional(),
  tipoEntrega: z.enum(["Retira", "Entrega", "Instalação"]).optional(),
});

export const OpsController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const parsed = ListSchema.safeParse((req as any).query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Parâmetros inválidos", issues: parsed.error.issues });
    }
    const data = await OpsService.list(parsed.data as ListOpsQuery);
    return reply.send(data);
  },

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = CreateSchema.safeParse((req as any).body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Dados inválidos", issues: parsed.error.issues });
    }
    const result = await OpsService.create(parsed.data as CreateOpDTO);
    return reply.code(201).send(result);
  },
};
