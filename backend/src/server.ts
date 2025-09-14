import Fastify from "fastify";

const app = Fastify();

// Rota simples só para testar
app.get("/hello", async () => {
  return { message: "Hello API 🚀" };
});

app.listen({ port: 3000 }).then(() => {
  console.log("Server running on http://localhost:3000");
});
