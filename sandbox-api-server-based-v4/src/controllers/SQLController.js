import SQLService     from '../services/SQLService.js';
import StorageService from '../services/StorageService.js';
import { validate, schemas } from '../utils/validator.js';
import { AppError }  from '../middleware/errorHandler.js';
import logger        from '../utils/logger.js';

class SQLController {

  async queryTable(req, res, next) {
    try {
      const { error, value } = validate(schemas.sqlQuery, req.query);
      if (error) throw new AppError(error.details.map(d => d.message).join('; '), 400, 'VALIDATION_ERROR');

      const rows = await SQLService.select(value.table, value.where || {}, value.limit, value.offset);
      res.json({ success: true, table: value.table, count: rows.length, data: rows });

    } catch (err) { next(err); }
  }

  async insertData(req, res, next) {
    try {
      const { error, value } = validate(schemas.sqlInsert, req.body);
      if (error) throw new AppError(error.details.map(d => d.message).join('; '), 400, 'VALIDATION_ERROR');

      const rows     = Array.isArray(value.data) ? value.data : [value.data];
      const inserted = await SQLService.bulkInsert(value.table, rows);

      res.status(201).json({ success: true, table: value.table, inserted, message: `Successfully inserted ${inserted} row(s) into ${value.table}` });

    } catch (err) { next(err); }
  }

  async importFromStorage(req, res, next) {
    try {
      const { module } = req.params;
      const { table }  = req.body;
      if (!table) throw new AppError('table is required in request body', 400, 'VALIDATION_ERROR');

      const stored = await StorageService.readLatest(module);
      if (!stored) throw new AppError(`No stored data for module "${module}". Run /crm/sync first.`, 404, 'NOT_FOUND');

      logger.info('SQL: importing from storage', { module, table, count: stored.records.length });
      const inserted = await SQLService.bulkInsert(table, stored.records);

      res.json({ success: true, module, table, inserted, message: `Imported ${inserted} records from ${module} storage into ${table}` });

    } catch (err) { next(err); }
  }

  async health(req, res, next) {
    try {
      const alive  = await SQLService.ping();
      const status = alive ? 200 : 503;
      res.status(status).json({ success: alive, service: 'sql', status: alive ? 'connected' : 'unreachable', checkedAt: new Date().toISOString() });

    } catch (err) { next(err); }
  }
}

export default new SQLController();
