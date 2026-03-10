import sql    from 'mssql';
import { env } from '../config/env.js';
import logger  from '../utils/logger.js';

class SQLService {
  constructor() {
    this._pool   = null;
    this._config = {
      server  : env.SQL_SERVER,
      database: env.SQL_DATABASE,
      user    : env.SQL_USER,
      password: env.SQL_PASSWORD,
      port    : env.SQL_PORT,
      options : {
        encrypt              : env.SQL_ENCRYPT,
        trustServerCertificate: env.SQL_TRUST_CERT,
        connectTimeout       : env.SQL_CONNECTION_TIMEOUT,
        requestTimeout       : env.SQL_REQUEST_TIMEOUT,
      },
      pool: { max: 10, min: 2, idleTimeoutMillis: 30_000 },
    };
  }

  async connect() {
    if (this._pool) return this._pool;
    logger.info('SQL: connecting to MSSQL', { server: env.SQL_SERVER, database: env.SQL_DATABASE });
    try {
      this._pool = await sql.connect(this._config);
      logger.info('SQL: connection pool established');
      return this._pool;
    } catch (err) {
      logger.error('SQL: connection failed', { message: err.message });
      throw err;
    }
  }

  async disconnect() {
    if (this._pool) {
      await this._pool.close();
      this._pool = null;
      logger.info('SQL: connection pool closed');
    }
  }

  async getPool() {
    if (!this._pool) await this.connect();
    return this._pool;
  }

  async query(queryStr, params = {}) {
    const pool    = await this.getPool();
    const request = pool.request();
    for (const [name, { type, value }] of Object.entries(params)) {
      request.input(name, type, value);
    }
    logger.debug('SQL: executing query', { query: queryStr });
    try {
      return await request.query(queryStr);
    } catch (err) {
      logger.error('SQL: query error', { query: queryStr, message: err.message });
      throw err;
    }
  }

  async select(table, where = {}, limit = 100, offset = 0) {
    const pool    = await this.getPool();
    const request = pool.request();
    const conditions = Object.entries(where);
    let   whereClause = '';

    if (conditions.length) {
      const parts = conditions.map(([col, val], i) => {
        request.input(`w${i}`, val);
        return `[${col}] = @w${i}`;
      });
      whereClause = `WHERE ${parts.join(' AND ')}`;
    }

    const queryStr = `
      SELECT * FROM [${table}]
      ${whereClause}
      ORDER BY (SELECT NULL)
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    logger.debug('SQL: SELECT', { table, where, limit, offset });
    const result = await request.query(queryStr);
    return result.recordset;
  }

  async bulkInsert(table, rows) {
    if (!rows.length) return 0;

    const pool        = await this.getPool();
    const transaction = new sql.Transaction(pool);
    logger.info('SQL: bulk insert', { table, count: rows.length });

    try {
      await transaction.begin();
      const columns = Object.keys(rows[0]);
      let   inserted = 0;

      for (const row of rows) {
        const request = new sql.Request(transaction);
        const colList = columns.map(c => `[${c}]`).join(', ');
        const valList = columns.map((c, i) => {
          request.input(`v${i}`, row[c]);
          return `@v${i}`;
        }).join(', ');
        await request.query(`INSERT INTO [${table}] (${colList}) VALUES (${valList})`);
        inserted++;
      }

      await transaction.commit();
      logger.info('SQL: bulk insert committed', { table, inserted });
      return inserted;

    } catch (err) {
      await transaction.rollback();
      logger.error('SQL: bulk insert rolled back', { table, message: err.message });
      throw err;
    }
  }

  async ping() {
    try {
      const pool = await this.getPool();
      await pool.request().query('SELECT 1 AS alive');
      return true;
    } catch { return false; }
  }

  get types() { return sql; }
}

export default new SQLService();
