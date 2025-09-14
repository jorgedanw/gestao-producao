import Fastify from "fastify";

const app = Fastify();

app.get("/hello", async () => {
  return { message: "Hello API 🚀" };
});

app.listen({ port: 3000 }, () => {
  console.log("Server running on http://localhost:3000");
});
