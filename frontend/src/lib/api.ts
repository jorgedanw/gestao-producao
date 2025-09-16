import axios from "axios";
import { z } from "zod";
import type { OP } from "../types/op";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 20000,
});

// Esquema para validar a resposta
const OPSchema = z.object({
  data: z.array(
    z.object({
      numero: z.number(),
      idMicrosys: z.number(),
      filial: z.number(),
      descricao: z.string().optional(),
      status: z.string(),
      datas: z.object({
        emissao: z.string().optional(),
        previsaoInicio: z.string().optional(),
        previsaoTermino: z.string().optional(),
        validade: z.string().optional(),
      }),
      quant: z.object({
        totalHdr: z.number().optional(),
        produzidasHdr: z.number().optional(),
        saldoHdr: z.number().optional(),
        totalItens: z.number().optional(),
        produzidasItens: z.number().optional(),
        saldoItens: z.number().optional(),
      }),
      cor: z.string().optional(),
      setoresSelecionados: z.array(z.string()),
      roteiro: z.array(z.object({ setor: z.string(), ordem: z.number().optional() })),
      progressoCalculado: z.number(),
    })
  ),
  meta: z.any().optional(),
});

export type OpsQuery = {
  incluirRoteiro?: boolean;
  filial?: number;
  status?: string; // "AA,SS,EP"
  de: string; // YYYY-MM-DD
  ate: string; // YYYY-MM-DD
  limit?: number;
};

export async function fetchOps(q: OpsQuery): Promise<OP[]> {
  const params = new URLSearchParams();
  params.set("de", q.de);
  params.set("ate", q.ate);
  params.set("incluirRoteiro", q.incluirRoteiro ? "1" : "0");
  params.set("filial", String(q.filial ?? 1));
  params.set("status", q.status ?? "AA,SS,EP");
  params.set("limit", String(q.limit ?? 50));

  const { data } = await api.get(`/integracao/ops-param?${params.toString()}`);
  const parsed = OPSchema.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Resposta inválida da API /integracao/ops-param");
  }
  return parsed.data.data as OP[];
}
// === NOVOS helpers para apontamentos (não alteram o restante) ===
export async function iniciarOp(numero: number, setor: string, operador: string) {
  const r = await fetch(`http://localhost:3000/apontamentos/iniciar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, setor, operador })
  });
  if (!r.ok) throw new Error("Falha ao iniciar OP");
  return r.json();
}

export async function finalizarOp(
  numero: number,
  setor: string,
  operador: string,
  dados?: { m2?: number; obs?: string }
) {
  const r = await fetch(`http://localhost:3000/apontamentos/finalizar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, setor, operador, ...dados })
  });
  if (!r.ok) throw new Error("Falha ao finalizar OP");
  return r.json();
}

export type ApontStatus = {
  numero: number;
  porSetor: Record<
    string,
    { iniciado?: string; finalizado?: string; m2?: number; historico?: any[] }
  >;
};
export async function getApontStatus(numeros: number[]) {
  const qs = new URLSearchParams({ numeros: numeros.join(",") });
  const r = await fetch(`http://localhost:3000/apontamentos/status?${qs.toString()}`);
  if (!r.ok) throw new Error("Falha ao buscar status de apontamentos");
  return (await r.json()) as ApontStatus[];
}
