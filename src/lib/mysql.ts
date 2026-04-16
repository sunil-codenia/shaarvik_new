import 'server-only';

import mysql, { Pool, PoolOptions } from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool__: Pool | undefined;
}

function buildPoolOptions(): PoolOptions {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const parsed = new URL(connectionString);
  const password = parsed.password ? decodeURIComponent(parsed.password) : '';

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password,
    database: parsed.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  };
}

export const mysqlPool =
  global.__mysqlPool__ ??
  mysql.createPool(buildPoolOptions());

if (process.env.NODE_ENV !== 'production') {
  global.__mysqlPool__ = mysqlPool;
}
