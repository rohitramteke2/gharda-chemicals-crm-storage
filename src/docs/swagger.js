import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'sandbox-api',
            version: '1.0.0',
            description: 'Production-grade CRM data fetching and RDP storage API',
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Local / RDP Server' },
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                },
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success:   { type: 'boolean', example: false },
                        requestId: { type: 'string',  example: 'a1b2c3d4-...' },
                        error: {
                            type: 'object',
                            properties: {
                                code:    { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string', example: 'module is required' },
                            },
                        },
                    },
                },
            },
        },
        security: [{ ApiKeyAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);