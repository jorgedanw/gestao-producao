import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerOpsRoutes } from "./routes/ops.routes";
import { registerIntegracaoRoutes } from "./routes/integracao.routes";

/**
 * Server Fastify
 * - CORS para o frontend
 * - Rotas de OPs (mocks)
 * - Rotas de Integração (Firebird)
 */
const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  });

  await app.register(registerOpsRoutes, { prefix: "/" });
  await app.register(registerIntegracaoRoutes, { prefix: "/" });

  const PORT = 3000;
  await app.listen({ port: PORT });
  console.log(`Server running on http://localhost:${PORT}`);
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
