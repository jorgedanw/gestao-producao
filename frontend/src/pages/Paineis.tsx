import React from "react";

export default function Paineis() {
  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold">Painéis de Produção — M7</h1>
      <p className="text-sm opacity-70">
        Placeholder do módulo M7. Vamos construir os painéis (cards, kanban, indicadores) a partir daqui.
      </p>

      <section className="mt-6 space-y-2 text-sm">
        <h2 className="font-medium">Backlog inicial</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>[ ] Painel por setor (Perfiladeira, Serralheria, Pintura, Eixo)</li>
          <li>[ ] Filtros de data e status</li>
          <li>[ ] Cores/SLAs por critério (validade, início previsto…)</li>
          <li>[ ] Atualização periódica (polling) ou WebSocket</li>
          <li>[ ] Navegação para detalhe da OP</li>
        </ul>
      </section>
    </main>
  );
}
