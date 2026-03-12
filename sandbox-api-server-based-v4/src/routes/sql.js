import { Router }        from 'express';
import SQLController     from '../controllers/SQLController.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/query',                  SQLController.queryTable.bind(SQLController));
router.post('/insert',  strictLimiter, SQLController.insertData.bind(SQLController));
router.post('/import/:module', strictLimiter, SQLController.importFromStorage.bind(SQLController));
router.get('/health',                 SQLController.health.bind(SQLController));

export default router;
