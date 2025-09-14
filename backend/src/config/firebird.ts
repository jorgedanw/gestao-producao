import "dotenv/config";

export const fbConfig = {
  host: process.env.FB_HOST ?? "localhost",
  port: Number(process.env.FB_PORT ?? 3050),
  database: process.env.FB_DATABASE ?? "",
  user: process.env.FB_USER ?? "SYSDBA",
  password: process.env.FB_PASSWORD ?? "masterkey",
  role: null as string | null,
  pageSize: 8192,
  encoding: (process.env.FB_ENCODING ?? "UTF8") as "UTF8" | "WIN1252",
  lowercase_keys: false,
};
