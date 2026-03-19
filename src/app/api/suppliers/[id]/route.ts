import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for updating supplier
const updateSupplierSchema = z.object({
  supplierCode: z.string().min(1, 'Supplier code is required').optional(),
  name: z.string().min(1, 'Supplier name is required').optional(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  currency: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  performanceRating: z.number().min(0).max(5).optional().nullable(),
  isHoApproved: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// GET /api/suppliers/[id] - Get a single supplier by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            grnHeaders: true,
            purchaseOrders: true,
            quotations: true,
            invoices: true,
          },
        },
      },
    });

    if (!supplier) {
      return apiNotFound('Supplier');
    }

    // Transform the response to include counts and convert decimals
    return apiSuccess({
      ...supplier,
      performanceRating: supplier.performanceRating ? Number(supplier.performanceRating) : null,
      _count: supplier._count,
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    return apiError('Failed to fetch supplier', 500);
  }
}

// PUT /api/suppliers/[id] - Update a supplier
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = updateSupplierSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }

    const data = result.data;

    // Check if supplier exists
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return apiNotFound('Supplier');
    }

    // If supplierCode is being updated, check for duplicates
    if (data.supplierCode && data.supplierCode !== existingSupplier.supplierCode) {
      const duplicateCode = await db.supplier.findUnique({
        where: { supplierCode: data.supplierCode },
      });

      if (duplicateCode) {
        return apiError('Supplier code already exists', 400);
      }
    }

    // Build update data object, filtering out undefined values
    const updateData: Record<string, unknown> = {};
    
    if (data.supplierCode !== undefined) updateData.supplierCode = data.supplierCode;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.performanceRating !== undefined) updateData.performanceRating = data.performanceRating;
    if (data.isHoApproved !== undefined) updateData.isHoApproved = data.isHoApproved;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Update supplier
    const supplier = await db.supplier.update({
      where: { id },
      data: updateData,
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        },
      },
    });

    return apiSuccess({
      ...supplier,
      performanceRating: supplier.performanceRating ? Number(supplier.performanceRating) : null,
    }, 'Supplier updated successfully');
  } catch (error) {
    console.error('Update supplier error:', error);
    return apiError('Failed to update supplier', 500);
  }
}

// DELETE /api/suppliers/[id] - Soft delete a supplier (set status to INACTIVE)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if supplier exists
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return apiNotFound('Supplier');
    }

    // Check if supplier is already inactive
    if (existingSupplier.status === 'INACTIVE') {
      return apiError('Supplier is already inactive', 400);
    }

    // Check for related records that would prevent deactivation
    const [
      grnCount,
      purchaseOrderCount,
      quotationCount,
      invoiceCount,
      returnToSupplierCount,
      activeRfqSupplierCount,
    ] = await Promise.all([
      db.grnHeader.count({ where: { supplierId: id } }),
      db.purchaseOrder.count({ where: { supplierId: id } }),
      db.quotation.count({ where: { supplierId: id } }),
      db.supplierInvoice.count({ where: { supplierId: id } }),
      db.returnToSupplier.count({ where: { supplierId: id } }),
      db.rfqSupplier.count({ 
        where: { 
          supplierId: id,
          status: { in: ['INVITED', 'PENDING'] }
        } 
      }),
    ]);

    const hasRelatedRecords = 
      grnCount > 0 || 
      purchaseOrderCount > 0 || 
      quotationCount > 0 || 
      invoiceCount > 0 || 
      returnToSupplierCount > 0;

    if (hasRelatedRecords) {
      const relatedInfo: string[] = [];
      if (grnCount > 0) relatedInfo.push(`${grnCount} GRN(s)`);
      if (purchaseOrderCount > 0) relatedInfo.push(`${purchaseOrderCount} purchase order(s)`);
      if (quotationCount > 0) relatedInfo.push(`${quotationCount} quotation(s)`);
      if (invoiceCount > 0) relatedInfo.push(`${invoiceCount} invoice(s)`);
      if (returnToSupplierCount > 0) relatedInfo.push(`${returnToSupplierCount} return(s)`);
      
      return apiError(
        `Cannot delete supplier with related records: ${relatedInfo.join(', ')}`,
        400
      );
    }

    // Check for active RFQ invitations
    if (activeRfqSupplierCount > 0) {
      return apiError(
        `Cannot delete supplier with ${activeRfqSupplierCount} active RFQ invitation(s)`,
        400
      );
    }

    // Soft delete by setting status to INACTIVE
    await db.supplier.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return apiSuccess(null, 'Supplier deactivated successfully');
  } catch (error) {
    console.error('Delete supplier error:', error);
    return apiError('Failed to delete supplier', 500);
  }
}
