import crmService from '../services/ZohoCRMService.js';

class CRMController {

    /**
     * GET /crm/records?module=Leads&page=1&per_page=50
     */
    async getRecords(req, res, next) {
        try {
            const { module, page, per_page, fields, sort_by, sort_order } = req.query;

            if (!module) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_MODULE', message: 'Query param "module" is required.' },
                });
            }

            const result = await crmService.fetchRecords({
                module,
                page:       parseInt(page, 10) || 1,
                per_page:   Math.min(parseInt(per_page, 10) || 50, 200),
                fields,
                sort_by,
                sort_order,
            });

            res.json({ success: true, data: result.data, info: result.info });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /crm/records/:module/:id
     */
    async getRecordById(req, res, next) {
        try {
            const { module, id } = req.params;
            const record = await crmService.fetchRecordById(module, id);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: `Record ${id} not found in ${module}.` },
                });
            }

            res.json({ success: true, data: record });
        } catch (err) {
            next(err);
        }
    }
}

export default new CRMController();
