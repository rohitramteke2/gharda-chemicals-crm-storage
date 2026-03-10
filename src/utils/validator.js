import Joi from 'joi';

const paginationSchema = Joi.object({
    page:     Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(200).default(50),
});

const crmFetchSchema = Joi.object({
    module:     Joi.string().valid('Leads', 'Contacts', 'Accounts', 'Deals', 'Tasks').required(),
    page:       Joi.number().integer().min(1).default(1),
    per_page:   Joi.number().integer().min(1).max(200).default(50),
    fields:     Joi.string().optional(),
    sort_by:    Joi.string().optional(),
    sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

const crmSyncSchema = Joi.object({
    module:    Joi.string().valid('Leads', 'Contacts', 'Accounts', 'Deals').required(),
    overwrite: Joi.boolean().default(false),
});

export const validate = (schema, data, options = {}) =>
    schema.validate(data, { abortEarly: false, stripUnknown: true, ...options });

export const schemas = {
    pagination: paginationSchema,
    crmFetch:   crmFetchSchema,
    crmSync:    crmSyncSchema,
};
