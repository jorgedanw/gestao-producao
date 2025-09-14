import { FastifyReply, FastifyRequest } from "fastify";
import { IntegracaoService } from "../services/integracao.service";
import { fbPing } from "../repositories/firebird.client";
import { fbConfig } from "../config/firebird";

function parseBool(v: any) {
  return ["1", "true", "yes", "on"].includes(String(v ?? "").toLowerCase());
}

export const IntegracaoController = {
  async ping(_req: FastifyRequest, reply: FastifyReply) {
    const res = await fbPing();
    if (!res.ok) {
      console.error("[FB] ping falhou:", res.error);
      return reply.code(500).send({
        ok: false,
        error: res.error,
        info: { host: fbConfig.host, port: fbConfig.port, database: fbConfig.database, encoding: fbConfig.encoding },
      });
    }
    return reply.send({ ok: true, info: { host: fbConfig.host, port: fbConfig.port, database: fbConfig.database, encoding: fbConfig.encoding } });
  },

  // Versão antiga (filial 1 + janela fixa)
  async listarOpsJanela(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const q = (_req as any).query ?? {};
      const incluir = parseBool(q.incluirRoteiro);
      const data = await IntegracaoService.listarOpsJanelaFilial1(incluir);
      return reply.send({ data, meta: { fonte: "firebird", filial: 1, incluirRoteiro: incluir, modo: "fixo" } });
    } catch (err: any) {
      console.error("[FB] erro /integracao/ops (fixo):", err?.message || err);
      return reply.code(500).send({ error: "Falha ao consultar Firebird", details: String(err?.message ?? err) });
    }
  },

  // NOVO: versão parametrizada
  async listarOpsParam(req: FastifyRequest, reply: FastifyReply) {
    try {
      const q = (req as any).query ?? {};
      const incluir = parseBool(q.incluirRoteiro);
      const filial = Number(q.filial ?? 1);
      const limit = Number(q.limit ?? 100);
      const status = String(q.status ?? "AA,SS,EP")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // janela por datas ISO (YYYY-MM-DD) — obrigatórias para este endpoint
      const de = String(q.de ?? "").slice(0, 10);
      const ate = String(q.ate ?? "").slice(0, 10);
      if (!de || !ate) {
        return reply.code(400).send({ error: "Forneça os parâmetros ?de=YYYY-MM-DD&ate=YYYY-MM-DD" });
      }

      const data = await IntegracaoService.listarOps({
        incluirRoteiro: incluir,
        filial,
        status,
        limit,
        janela: {
          prevInicioDe: de,
          prevInicioAte: ate,
          validadeDe: de,
          validadeAte: ate,
        },
      });

      return reply.send({
        data,
        meta: { fonte: "firebird", filial, incluirRoteiro: incluir, status, de, ate, limit, modo: "param" },
      });
    } catch (err: any) {
      console.error("[FB] erro /integracao/ops (param):", err?.message || err);
      return reply.code(500).send({ error: "Falha ao consultar Firebird", details: String(err?.message ?? err) });
    }
  },

  async listarCodigosSetor(req: FastifyRequest, reply: FastifyReply) {
    try {
      const q = (req as any).query ?? {};
      const escopoTodos = parseBool(q.todos);
      const data = escopoTodos
        ? await IntegracaoService.listarCodigosSetorTodos()
        : await IntegracaoService.listarCodigosSetorJanela();
      return reply.send({ data, meta: { fonte: "firebird", filial: 1, escopo: escopoTodos ? "todos" : "janela" } });
    } catch (err: any) {
      return reply.code(500).send({ error: "Falha ao listar códigos de setor", details: String(err?.message ?? err) });
    }
  },

  async roteiroDeUmaOP(req: FastifyRequest, reply: FastifyReply) {
    try {
      const numero = Number((req as any).query?.numero ?? (req as any).params?.numero);
      if (!Number.isFinite(numero)) return reply.code(400).send({ error: "Informe ?numero=<OP>" });
      const data = await IntegracaoService.roteiroDeUmaOP(numero);
      return reply.send({ data, meta: { fonte: "firebird", filial: 1, numero } });
    } catch (err: any) {
      return reply.code(500).send({ error: "Falha ao buscar roteiro da OP", details: String(err?.message ?? err) });
    }
  },
};
