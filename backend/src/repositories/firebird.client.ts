import Firebird from "node-firebird";
import { fbConfig } from "../config/firebird";

/**
 * Pool simples para reutilizar conexões.
 * Obs.: Se der erro de autenticação/caminho, confira o .env e permissões de rede.
 */
const pool = Firebird.pool(5, fbConfig);

export function fbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err);
      db.query(sql, params, (err2, result) => {
        try { db.detach(); } catch {}
        if (err2) return reject(err2);
        resolve(result as T[]);
      });
    });
  });
}
