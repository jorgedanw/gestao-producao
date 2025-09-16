import { FastifyInstance } from "fastify";
import {
  apontarIniciar,
  apontarFinalizar,
  statusPorNumeros,
} from "../repositories/apontamentos.store";

export async function registerApontamentosRoutes(app: FastifyInstance) {
  app.post("/apontamentos/iniciar", async (req, reply) => {
    const body = req.body as any;
    const { numero, setor, operador } = body || {};
    if (!numero || !setor) return reply.code(400).send({ error: "numero e setor são obrigatórios" });
    const r = apontarIniciar(Number(numero), String(setor), operador);
    return reply.send(r);
  });

  app.post("/apontamentos/finalizar", async (req, reply) => {
    const body = req.body as any;
    const { numero, setor, operador, m2, obs } = body || {};
    if (!numero || !setor) return reply.code(400).send({ error: "numero e setor são obrigatórios" });
    const r = apontarFinalizar(Number(numero), String(setor), operador, typeof m2 === "number" ? m2 : undefined, obs);
    return reply.send(r);
  });

  app.get("/apontamentos/status", async (req, reply) => {
    const q = (req.query as any) || {};
    const numeros = String(q.numeros || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Boolean);
    if (!numeros.length) return reply.send([]);
    const r = statusPorNumeros(numeros);
    return reply.send(r);
  });
}
