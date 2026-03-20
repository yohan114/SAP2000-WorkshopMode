import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WCP - Workshop Control Platform API',
      version: '1.0.0',
      description: `
        Comprehensive Workshop Control Platform API for fleet management, 
        job cards, inventory, procurement, and quality management.
        
        ## Authentication
        Most endpoints require authentication. Use the Authorization header with a Bearer token.
        
        ## Rate Limiting
        API calls are rate-limited to 100 requests per minute per user.
        
        ## Pagination
        List endpoints support pagination with \`page\` and \`limit\` query parameters.
      `,
      contact: {
        name: 'WCP Support',
        email: 'support@wcp.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Current server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        JobCard: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            jobNumber: { type: 'string', example: 'JC-2401-0001' },
            assetId: { type: 'string', format: 'uuid' },
            jobType: { type: 'string', enum: ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'REPAIR'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] },
            status: { type: 'string', enum: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'] },
            description: { type: 'string' },
            estimatedCost: { type: 'number' },
            actualCost: { type: 'number' },
            scheduledStart: { type: 'string', format: 'date-time' },
            scheduledEnd: { type: 'string', format: 'date-time' },
            actualStart: { type: 'string', format: 'date-time' },
            actualEnd: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            assetNumber: { type: 'string', example: 'AST-001' },
            name: { type: 'string' },
            categoryId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['OPERATIONAL', 'UNDER_REPAIR', 'STANDBY', 'OUT_OF_SERVICE', 'DISPOSED'] },
            location: { type: 'string' },
            currentMeterReading: { type: 'number' },
            acquisitionDate: { type: 'string', format: 'date' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            itemCode: { type: 'string' },
            name: { type: 'string' },
            class: { type: 'string' },
            unitOfMeasure: { type: 'string' },
            unitCost: { type: 'number' },
            reorderLevel: { type: 'number' },
            minimumLevel: { type: 'number' },
          },
        },
        MaterialRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            mrNumber: { type: 'string', example: 'MR-2401-0001' },
            requestType: { type: 'string', enum: ['STOCK', 'NON_STOCK', 'SERVICE'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            status: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_ISSUED', 'FULLY_ISSUED', 'CANCELLED'] },
          },
        },
        GRN: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            grnNumber: { type: 'string', example: 'GRN-2401-0001' },
            supplierId: { type: 'string', format: 'uuid' },
            storeId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'POSTED', 'CANCELLED'] },
            grnDate: { type: 'string', format: 'date' },
          },
        },
        PurchaseOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            poNumber: { type: 'string', example: 'PO-2401-0001' },
            supplierId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['DRAFT', 'PENDING', 'APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] },
            orderDate: { type: 'string', format: 'date' },
            totalValue: { type: 'number' },
          },
        },
        QualityInspection: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            inspectionNumber: { type: 'string' },
            entityType: { type: 'string', enum: ['JOB_CARD', 'GRN', 'ASSET', 'STORE', 'WORK_AREA'] },
            inspectionType: { type: 'string' },
            status: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] },
            result: { type: 'string', enum: ['PASS', 'FAIL', 'CONDITIONAL'] },
          },
        },
        StockTake: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            stockTakeNumber: { type: 'string' },
            storeId: { type: 'string', format: 'uuid' },
            countType: { type: 'string', enum: ['FULL', 'CYCLE', 'SPOT'] },
            status: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
            lastTriggeredAt: { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            action: { type: 'string' },
            entityType: { type: 'string' },
            entityId: { type: 'string' },
            userId: { type: 'string' },
            ipAddress: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Job Cards', description: 'Job card management operations' },
      { name: 'Assets', description: 'Asset and fleet management' },
      { name: 'Inventory', description: 'Stock and inventory operations' },
      { name: 'Material Requests', description: 'Material requisition workflow' },
      { name: 'Purchase Orders', description: 'Procurement operations' },
      { name: 'GRN', description: 'Goods received notes' },
      { name: 'Quality', description: 'Quality inspection management' },
      { name: 'Stock Take', description: 'Stock counting operations' },
      { name: 'Webhooks', description: 'Webhook management' },
      { name: 'Audit', description: 'Audit trail operations' },
      { name: 'Import/Export', description: 'Data migration operations' },
    ],
  },
  apis: [
    './src/app/api/**/*.ts',
    './src/app/api/**/route.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export function getOpenApiSpec() {
  return swaggerSpec;
}
