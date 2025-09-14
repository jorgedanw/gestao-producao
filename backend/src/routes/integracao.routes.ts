import { FastifyInstance } from "fastify";
import { IntegracaoController } from "../controllers/integracao.controller";

export async function registerIntegracaoRoutes(app: FastifyInstance) {
  app.get("/integracao/ping", IntegracaoController.ping);

  // Versão fixa (janela padrão)
  app.get("/integracao/ops", IntegracaoController.listarOpsJanela);

  // Versão parametrizada (datas obrigatórias)
  app.get("/integracao/ops-param", IntegracaoController.listarOpsParam);

  app.get("/integracao/roteiro-codigos", IntegracaoController.listarCodigosSetor);
  app.get("/integracao/roteiro-por-op", IntegracaoController.roteiroDeUmaOP);
}
