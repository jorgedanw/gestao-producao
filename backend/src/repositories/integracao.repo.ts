// backend/src/repositories/integracao.repo.ts
import { fbQuery } from "./firebird.client";

/* ----------------------- Utilidades p/ descobrir colunas ----------------------- */

async function listCols(table: string): Promise<string[]> {
  const SQL = `
    SELECT TRIM(rf.RDB$FIELD_NAME) AS FIELD_NAME
    FROM RDB$RELATION_FIELDS rf
    WHERE rf.RDB$RELATION_NAME = ?
    ORDER BY rf.RDB$FIELD_POSITION
  `;
  const rows = await fbQuery(SQL, [table.toUpperCase()]);
  return rows.map((r: any) => String(r.FIELD_NAME).toUpperCase());
}

function pickCol(cols: string[], candidates: string[], patterns: RegExp[]): string | undefined {
  for (const c of candidates) if (cols.includes(c)) return c;
  for (const rx of patterns) {
    const found = cols.find((c) => rx.test(c));
    if (found) return found;
  }
  return undefined;
}

/** Resolve nomes reais das colunas na sua base (PCP_APTO_ROTEIRO) */
async function resolveRoteiroColumns() {
  const TABLE = "PCP_APTO_ROTEIRO";
  const cols = await listCols(TABLE);

  const opNum = pickCol(
    cols,
    ["OPR_ORP_NUMERO", "APR_ORP_NUMERO", "OPR_ORP_SERIE", "APR_ORP_SERIE", "ORP_NUMERO", "ORP_SERIE"],
    [/(^|_)ORP_?(NUM|NUMERO|SERIE)$/i, /(ORDEM|OP)_?PROD/i, /ORP/i]
  );

  // <- Na sua base o “setor” vem como OPR_ATV_ID
  const setor = pickCol(
    cols,
    ["OPR_ATV_ID", "APR_ATV_ID", "OPR_SET_CODIGO", "APR_SET_CODIGO", "ATV_ID", "ATV_CODIGO", "SET_CODIGO", "SETOR_CODIGO"],
    [/ATV.*(ID|COD)/i, /SET.*COD/i, /SETOR/i]
  );

  const ordem = pickCol(
    cols,
    ["OPR_ATV_SEQUENCIA", "APR_ATV_SEQUENCIA", "ATV_SEQUENCIA", "SEQUENCIA", "ORDEM"],
    [/SEQ/i, /ORDEM/i]
  );

  if (!opNum || !setor || !ordem) {
    throw new Error(
      `[Roteiro] Não foi possível resolver colunas em ${TABLE}. ` +
      `Encontradas: ${cols.join(", ")}. ` +
      `Preciso identificar: OP_NUM(ou SERIE), SETOR(ATV_ID/COD) e SEQUENCIA.`
    );
  }

  return { TABLE, OP_NUM: opNum, SETOR_COD: setor, SEQ: ordem };
}

/* ------------------------------ Consultas principais ------------------------------ */

/** Janela padrão (filial 1) – mantido para compatibilidade */
export async function buscarOpsJanelaFilial1() {
  const SQL = `
  WITH ITENS AS (
    SELECT
      i.OPD_ORP_SERIE                                  AS ORP_SERIE,
      SUM(COALESCE(i.OPD_QUANTIDADE,     0))           AS QTD_TOTAL_ITENS,
      SUM(COALESCE(i.OPD_QTD_PRODUZIDAS, 0))           AS QTD_PRODUZIDAS_ITENS,
      SUM(COALESCE(i.OPD_QTDE_SALDO,     0))           AS QTD_SALDO_ITENS
    FROM ORDEM_PRODUCAO_ITENS i
    WHERE i.EMP_FIL_CODIGO = 1
    GROUP BY i.OPD_ORP_SERIE
  ),
  CORES_OP AS (
    SELECT
      i.OPD_ORP_SERIE AS ORP_SERIE,
      CAST(LIST(DISTINCT c.COR_NOME, ', ') AS VARCHAR(200)) AS CORES_TXT
    FROM ORDEM_PRODUCAO_ITENS i
    LEFT JOIN PRODUTOS p ON p.PRO_CODIGO = i.OPD_PRO_CODIGO
    LEFT JOIN CORES    c ON c.COR_CODIGO = COALESCE(i.OPD_COR_CODIGO, p.PRO_COR_CODIGO)
    WHERE i.EMP_FIL_CODIGO = 1
      AND COALESCE(i.OPD_COR_CODIGO, p.PRO_COR_CODIGO) IS NOT NULL
    GROUP BY i.OPD_ORP_SERIE
  )
  SELECT FIRST 100
    op.ORP_SERIE                                         AS OP_NUMERO,
    op.ORP_ID,
    op.EMP_FIL_CODIGO                                    AS FILIAL,
    op.ORP_DESCRICAO                                     AS DESCRICAO,
    op.ORP_DATA                                          AS DATA_EMISSAO,
    op.ORP_DT_PREV_INICIO                                AS PREVISAO_INICIO,
    op.ORP_DT_FINAL                                      AS PREVISAO_TERMINO,
    op.ORP_DT_VALIDADE                                   AS DATA_VALIDADE,
    op.ORP_STS_CODIGO                                    AS STATUS_OP,
    op.ORP_QTDE_PRODUCAO                                 AS QTD_TOTAL_HDR,
    op.ORP_QTDE_PRODUZIDAS                               AS QTD_PRODUZIDAS_HDR,
    op.ORP_QTDE_SALDO                                    AS QTD_SALDO_HDR,
    it.QTD_TOTAL_ITENS,
    it.QTD_PRODUZIDAS_ITENS,
    it.QTD_SALDO_ITENS,
    CASE
      WHEN COALESCE(it.QTD_TOTAL_ITENS, 0) > 0 THEN
        ROUND( (1 - COALESCE(it.QTD_SALDO_ITENS, 0) / NULLIF(it.QTD_TOTAL_ITENS, 0)) * 100, 2 )
      WHEN COALESCE(op.ORP_QTDE_PRODUCAO, 0) > 0 THEN
        ROUND( (1 - COALESCE(op.ORP_QTDE_SALDO, 0) / NULLIF(op.ORP_QTDE_PRODUCAO, 0)) * 100, 2 )
      ELSE 0
    END                                                  AS PERCENT_CONCLUIDO,
    COALESCE(cr.CORES_TXT, 'SEM PINTURA')                AS COR
  FROM ORDEM_PRODUCAO op
  LEFT JOIN ITENS     it ON it.ORP_SERIE = op.ORP_SERIE
  LEFT JOIN CORES_OP  cr ON cr.ORP_SERIE = op.ORP_SERIE
  WHERE op.EMP_FIL_CODIGO = 1
    AND COALESCE(op.ORP_FECHADO, 0) = 0
    AND COALESCE(op.ORP_STS_CODIGO, '') IN ('AA','SS','EP')
    AND (
         (op.ORP_DT_PREV_INICIO BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE + 21))
      OR (op.ORP_DT_VALIDADE    BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE + 30))
    )
  ORDER BY
    op.ORP_DT_VALIDADE    NULLS LAST,
    op.ORP_DT_PREV_INICIO NULLS LAST,
    op.ORP_SERIE DESC;
  `;
  return fbQuery(SQL);
}

/** Roteiro para várias OPs (descoberta dinâmica das colunas) */
export async function buscarRoteiroPorOps(numeros: number[]) {
  if (!numeros?.length) return [];
  const ids = numeros.map(Number).filter(Number.isFinite);
  const placeholders = ids.map(() => "?").join(",");
  const params = ids;

  const R = await resolveRoteiroColumns();
  const SQL = `
    SELECT
      r.${R.OP_NUM}     AS OP_NUMERO,
      r.${R.SETOR_COD}  AS SETOR_CODIGO,
      r.${R.SEQ}        AS ORDEM
    FROM ${R.TABLE} r
    WHERE r.${R.OP_NUM} IN (${placeholders})
      AND EXISTS (
        SELECT 1 FROM ORDEM_PRODUCAO op
         WHERE op.ORP_SERIE = r.${R.OP_NUM}
           AND op.EMP_FIL_CODIGO = 1
      )
    ORDER BY r.${R.OP_NUM}, r.${R.SEQ}
  `;
  return fbQuery(SQL, params);
}

/** Códigos de setor (toda a tabela) */
export async function listarCodigosSetorTodos() {
  const R = await resolveRoteiroColumns();
  const SQL = `
    SELECT
      r.${R.SETOR_COD} AS SETOR_CODIGO,
      COUNT(*)         AS QTDE
    FROM ${R.TABLE} r
    GROUP BY r.${R.SETOR_COD}
    ORDER BY QTDE DESC, SETOR_CODIGO
  `;
  return fbQuery(SQL);
}

/** Códigos de setor (janela padrão) */
export async function listarCodigosSetorJanelaFilial1() {
  const R = await resolveRoteiroColumns();
  const SQL = `
    SELECT
      r.${R.SETOR_COD} AS SETOR_CODIGO,
      COUNT(*)         AS QTDE
    FROM ${R.TABLE} r
    JOIN ORDEM_PRODUCAO op
      ON op.ORP_SERIE = r.${R.OP_NUM}
    WHERE op.EMP_FIL_CODIGO = 1
      AND COALESCE(op.ORP_FECHADO, 0) = 0
      AND COALESCE(op.ORP_STS_CODIGO, '') IN ('AA','SS','EP')
      AND (
           (op.ORP_DT_PREV_INICIO BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE + 21))
        OR (op.ORP_DT_VALIDADE    BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE + 30))
      )
    GROUP BY r.${R.SETOR_COD}
    ORDER BY QTDE DESC, SETOR_CODIGO
  `;
  return fbQuery(SQL);
}

/** Roteiro bruto de UMA OP */
export async function buscarRoteiroDeUmaOP(numero: number) {
  const R = await resolveRoteiroColumns();
  const SQL = `
    SELECT
      r.${R.OP_NUM}    AS OP_NUMERO,
      r.${R.SETOR_COD} AS SETOR_CODIGO,
      r.${R.SEQ}       AS ORDEM
    FROM ${R.TABLE} r
    WHERE r.${R.OP_NUM} = ?
    ORDER BY r.${R.SEQ}
  `;
  return fbQuery(SQL, [numero]);
}

/* --------- NOVO: buscar OPs com parâmetros (filial, status, janela, limit) --------- */
export async function buscarOpsJanela(params: {
  filial?: number;
  status?: string[];
  janela: {
    prevInicioDe: string; // 'YYYY-MM-DD'
    prevInicioAte: string;
    validadeDe: string;
    validadeAte: string;
  };
  limit?: number;
}) {
  const filial = Number(params.filial ?? 1);
  const limit = Number(params.limit ?? 100);
  const status = (params.status ?? ["AA", "SS", "EP"]).map((s) => String(s).trim()).filter(Boolean);
  const stPlace = status.map(() => "?").join(",");

  const SQL = `
  WITH ITENS AS (
    SELECT
      i.OPD_ORP_SERIE                                  AS ORP_SERIE,
      SUM(COALESCE(i.OPD_QUANTIDADE,     0))           AS QTD_TOTAL_ITENS,
      SUM(COALESCE(i.OPD_QTD_PRODUZIDAS, 0))           AS QTD_PRODUZIDAS_ITENS,
      SUM(COALESCE(i.OPD_QTDE_SALDO,     0))           AS QTD_SALDO_ITENS
    FROM ORDEM_PRODUCAO_ITENS i
    WHERE i.EMP_FIL_CODIGO = ?
    GROUP BY i.OPD_ORP_SERIE
  ),
  CORES_OP AS (
    SELECT
      i.OPD_ORP_SERIE AS ORP_SERIE,
      CAST(LIST(DISTINCT c.COR_NOME, ', ') AS VARCHAR(200)) AS CORES_TXT
    FROM ORDEM_PRODUCAO_ITENS i
    LEFT JOIN PRODUTOS p ON p.PRO_CODIGO = i.OPD_PRO_CODIGO
    LEFT JOIN CORES    c ON c.COR_CODIGO = COALESCE(i.OPD_COR_CODIGO, p.PRO_COR_CODIGO)
    WHERE i.EMP_FIL_CODIGO = ?
      AND COALESCE(i.OPD_COR_CODIGO, p.PRO_COR_CODIGO) IS NOT NULL
    GROUP BY i.OPD_ORP_SERIE
  )
  SELECT FIRST ${limit}
    op.ORP_SERIE                                         AS OP_NUMERO,
    op.ORP_ID,
    op.EMP_FIL_CODIGO                                    AS FILIAL,
    op.ORP_DESCRICAO                                     AS DESCRICAO,
    op.ORP_DATA                                          AS DATA_EMISSAO,
    op.ORP_DT_PREV_INICIO                                AS PREVISAO_INICIO,
    op.ORP_DT_FINAL                                      AS PREVISAO_TERMINO,
    op.ORP_DT_VALIDADE                                   AS DATA_VALIDADE,
    op.ORP_STS_CODIGO                                    AS STATUS_OP,
    op.ORP_QTDE_PRODUCAO                                 AS QTD_TOTAL_HDR,
    op.ORP_QTDE_PRODUZIDAS                               AS QTD_PRODUZIDAS_HDR,
    op.ORP_QTDE_SALDO                                    AS QTD_SALDO_HDR,
    it.QTD_TOTAL_ITENS,
    it.QTD_PRODUZIDAS_ITENS,
    it.QTD_SALDO_ITENS,
    CASE
      WHEN COALESCE(it.QTD_TOTAL_ITENS, 0) > 0 THEN
        ROUND( (1 - COALESCE(it.QTD_SALDO_ITENS, 0) / NULLIF(it.QTD_TOTAL_ITENS, 0)) * 100, 2 )
      WHEN COALESCE(op.ORP_QTDE_PRODUCAO, 0) > 0 THEN
        ROUND( (1 - COALESCE(op.ORP_QTDE_SALDO, 0) / NULLIF(op.ORP_QTDE_PRODUCAO, 0)) * 100, 2 )
      ELSE 0
    END                                                  AS PERCENT_CONCLUIDO,
    COALESCE(cr.CORES_TXT, 'SEM PINTURA')                AS COR
  FROM ORDEM_PRODUCAO op
  LEFT JOIN ITENS     it ON it.ORP_SERIE = op.ORP_SERIE
  LEFT JOIN CORES_OP  cr ON cr.ORP_SERIE = op.ORP_SERIE
  WHERE op.EMP_FIL_CODIGO = ?
    AND COALESCE(op.ORP_FECHADO, 0) = 0
    AND COALESCE(op.ORP_STS_CODIGO, '') IN (${stPlace})
    AND (
         (op.ORP_DT_PREV_INICIO BETWEEN ? AND ?)
      OR (op.ORP_DT_VALIDADE    BETWEEN ? AND ?)
    )
  ORDER BY
    op.ORP_DT_VALIDADE    NULLS LAST,
    op.ORP_DT_PREV_INICIO NULLS LAST,
    op.ORP_SERIE DESC;
  `;

  const paramsArr = [
    filial, // ITENS
    filial, // CORES_OP
    filial, // filtro principal
    ...status,
    params.janela.prevInicioDe,
    params.janela.prevInicioAte,
    params.janela.validadeDe,
    params.janela.validadeAte,
  ];

  return fbQuery(SQL, paramsArr);
}
