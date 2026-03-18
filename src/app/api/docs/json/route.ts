import { NextRequest, NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/swagger';

/**
 * @openapi
 * /docs/json:
 *   get:
 *     tags:
 *       - Documentation
 *     summary: Get OpenAPI specification
 *     description: Returns the OpenAPI 3.0 specification for the WCP API
 *     responses:
 *       200:
 *         description: OpenAPI specification in JSON format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET(request: NextRequest) {
  const spec = getOpenApiSpec();
  return NextResponse.json(spec);
}
