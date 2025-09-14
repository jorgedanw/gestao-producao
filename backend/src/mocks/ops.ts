import type { OP } from "../domain/entities";

export const OPS_MOCK: OP[] = [
  {
    numero: 6001,
    idMicrosys: 6271,
    filial: 1,
    descricao: "CLIENTE X / Pedido: 9652",
    status: "ABERTA",
    datas: {
      emissao: "2025-09-01",
      previsaoInicio: "2025-09-08",
      validade: "2025-09-10",
    },
    quant: {
      totalItens: 100,
      saldoItens: 100,
    },
    cor: "PRETO BRILHANTE",
    setoresSelecionados: ["Perfiladeira", "Serralheria", "Pintura", "Expedição"],
    progressoCalculado: 0, // Expedição não entra no cálculo
  },
  {
    numero: 5999,
    idMicrosys: 6269,
    filial: 1,
    descricao: "CLIENTE Y / Pedido: 9650",
    status: "ENTRADA_PARCIAL",
    datas: {
      emissao: "2025-09-01",
      previsaoInicio: "2025-09-05",
      validade: "2025-09-09",
    },
    quant: {
      totalItens: 50,
      saldoItens: 15,
      produzidasItens: 35,
    },
    cor: "BRANCO",
    setoresSelecionados: ["Perfiladeira", "Pintura", "Expedição"],
    progressoCalculado: 70,
  },
];
