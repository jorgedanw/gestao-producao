import { FastifyInstance } from "fastify";
import { OpsController } from "../controllers/ops.controller";

/**
 * Define os endpoints e encaminha para o controller.
 */
export async function registerOpsRoutes(app: FastifyInstance) {
  app.get("/ops", OpsController.list);
  app.post("/ops", OpsController.create);
}
