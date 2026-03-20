import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for creating supplier
const createSupplierSchema = z.object({
  supplierCode: z.string().min(1, 'Supplier code is required'),
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  currency: z.string().default('LKR'),
  notes: z.string().optional(),
});

// GET /api/suppliers - List suppliers with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { supplierCode: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          supplierCode: true,
          name: true,
          contactPerson: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          paymentTerms: true,
          createdAt: true,
        },
      }),
      db.supplier.count({ where }),
    ]);

    return apiPaginated(suppliers, total, page, limit);
  } catch (error) {
    console.error('Get suppliers error:', error);
    return apiError('Failed to fetch suppliers', 500);
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = createSupplierSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }
    
    const data = result.data;
    
    // Check if supplier code already exists
    const existingSupplier = await db.supplier.findUnique({
      where: { supplierCode: data.supplierCode },
    });
    
    if (existingSupplier) {
      return apiError('Supplier code already exists', 400);
    }
    
    // Create supplier
    const supplier = await db.supplier.create({
      data: {
        supplierCode: data.supplierCode,
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        taxId: data.taxId || null,
        paymentTerms: data.paymentTerms || null,
        currency: data.currency || 'LKR',
        notes: data.notes || null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        supplierCode: true,
        name: true,
        contactPerson: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        status: true,
        paymentTerms: true,
        currency: true,
        createdAt: true,
      },
    });
    
    return apiSuccess(supplier, 'Supplier created successfully');
  } catch (error) {
    console.error('Create supplier error:', error);
    return apiError('Failed to create supplier', 500);
  }
}
