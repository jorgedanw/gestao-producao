// backend/server.js
// Importa o Fastify
const fastify = require('fastify')({ logger: true })

// Cria rota simples
fastify.get('/', async (request, reply) => {
  return { hello: 'API funcionando 🚀' }
})

// Sobe o servidor
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Servidor rodando em ${address}`)
})
