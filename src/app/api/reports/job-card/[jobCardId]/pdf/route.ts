import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET /api/reports/job-card/[jobCardId]/pdf - Generate PDF for individual job card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobCardId: string }> }
) {
  try {
    const { jobCardId } = await params;

    // Get job card with all related data for cost calculation
    const jobCard = await db.jobCard.findUnique({
      where: { id: jobCardId },
      include: {
        asset: {
          select: {
            assetNumber: true,
            name: true,
            category: true,
            make: true,
            model: true,
            currentLocation: true,
          }
        },
        creator: {
          select: { name: true, employeeId: true }
        },
        supervisor: {
          select: { name: true, employeeId: true }
        },
        technicianAssignments: {
          where: { isActive: true },
          include: {
            technician: { select: { name: true, employeeId: true } }
          }
        },
        timeLogs: {
          include: {
            employee: { select: { name: true, employeeNumber: true, hourlyRate: true } }
          }
        },
        materialIssues: {
          where: { status: 'ISSUED' },
          include: {
            lines: {
              include: {
                item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
              }
            }
          }
        },
        externalJobs: {
          where: { isActive: true },
          include: {
            subcontractor: { select: { name: true } }
          }
        },
      },
    });

    if (!jobCard) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Calculate costs
    // Material Cost - from material issues linked to this job card
    const materialLines: {
      miNumber: string;
      itemCode: string;
      itemName: string;
      quantity: number;
      unit: string;
      unitCost: number;
      totalCost: number;
    }[] = [];

    let materialCost = 0;
    for (const mi of jobCard.materialIssues) {
      for (const line of mi.lines) {
        const qty = Number(line.issuedQty);
        const unitCost = Number(line.unitCost || 0);
        const lineTotal = qty * unitCost;
        materialCost += lineTotal;
        materialLines.push({
          miNumber: mi.miNumber,
          itemCode: line.item?.itemCode || '-',
          itemName: line.item?.name || '-',
          quantity: qty,
          unit: line.item?.unitOfMeasure || '-',
          unitCost,
          totalCost: lineTotal,
        });
      }
    }

    // Labour Cost - from time logs
    const labourLines: {
      date: string;
      employee: string;
      hours: number;
      hourlyRate: number;
      totalCost: number;
    }[] = [];

    let labourHours = 0;
    let labourCost = 0;
    for (const tl of jobCard.timeLogs) {
      const hours = (tl.totalMinutes || 0) / 60;
      const hourlyRate = Number(tl.hourlyRate || tl.employee?.hourlyRate || 0);
      const lineTotal = Number(tl.totalCost || hours * hourlyRate);
      labourHours += hours;
      labourCost += lineTotal;
      labourLines.push({
        date: tl.logDate ? new Date(tl.logDate).toLocaleDateString() : '-',
        employee: tl.employee?.name || '-',
        hours,
        hourlyRate,
        totalCost: lineTotal,
      });
    }

    // External Cost - from external jobs
    const externalLines: {
      jobNumber: string;
      subcontractor: string;
      jobType: string;
      estimatedCost: number;
      actualCost: number;
    }[] = [];

    let externalCost = 0;
    for (const ej of jobCard.externalJobs) {
      const cost = Number(ej.actualCost || ej.estimatedCost || 0);
      externalCost += cost;
      externalLines.push({
        jobNumber: ej.jobNumber,
        subcontractor: ej.subcontractor?.name || '-',
        jobType: ej.jobType,
        estimatedCost: Number(ej.estimatedCost || 0),
        actualCost: Number(ej.actualCost || 0),
      });
    }

    // Calculate subtotal, sundry, and total
    const subtotal = materialCost + labourCost + externalCost;
    const sundry = subtotal * 0.10;
    const totalBill = subtotal + sundry;

    // Generate PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('WCP - Workshop Control Platform', 14, 20);

    doc.setFontSize(14);
    doc.text('Finished Job Card Report', 14, 30);

    // Job Card Info Box
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 42;

    doc.setFont('helvetica', 'bold');
    doc.text('Job Card Details', 14, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    const infoLines = [
      `Job Card Number: ${jobCard.jobCardNumber}`,
      `Asset: ${jobCard.asset?.assetNumber || '-'} - ${jobCard.asset?.name || '-'}`,
      `Make/Model: ${jobCard.asset?.make || '-'} ${jobCard.asset?.model || '-'}`,
      `Location: ${jobCard.asset?.currentLocation || '-'}`,
      `Job Type: ${jobCard.jobType}`,
      `Priority: ${jobCard.priority}`,
      `Status: ${jobCard.status}`,
      `Created By: ${jobCard.creator?.name || '-'}`,
      `Created At: ${new Date(jobCard.createdAt).toLocaleDateString()}`,
    ];

    for (const line of infoLines) {
      doc.text(line, 14, yPos);
      yPos += 5;
    }

    // Fault Description
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Fault Description:', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const faultLines = doc.splitTextToSize(jobCard.faultDescription || '-', 180);
    for (const line of faultLines) {
      doc.text(line, 14, yPos);
      yPos += 5;
    }

    // Work Performed
    if (jobCard.workPerformed) {
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Work Performed:', 14, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const workLines = doc.splitTextToSize(jobCard.workPerformed, 180);
      for (const line of workLines) {
        doc.text(line, 14, yPos);
        yPos += 5;
      }
    }

    // Technicians
    if (jobCard.technicianAssignments.length > 0) {
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Assigned Technicians:', 14, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      for (const ta of jobCard.technicianAssignments) {
        doc.text(`- ${ta.technician?.name || '-'} (${ta.role})`, 14, yPos);
        yPos += 5;
      }
    }

    // Material Costs Table
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Material Costs', 14, yPos);
    yPos += 5;

    if (materialLines.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['MI #', 'Item Code', 'Item Name', 'Qty', 'Unit', 'Unit Cost', 'Total']],
        body: materialLines.map(l => [
          l.miNumber,
          l.itemCode,
          l.itemName,
          l.quantity.toFixed(2),
          l.unit,
          `$${l.unitCost.toFixed(2)}`,
          `$${l.totalCost.toFixed(2)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 14 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('No material issues recorded', 14, yPos);
      yPos += 10;
    }

    // Labour Costs Table
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Labour Costs', 14, yPos);
    yPos += 5;

    if (labourLines.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Employee', 'Hours', 'Rate', 'Total']],
        body: labourLines.map(l => [
          l.date,
          l.employee,
          l.hours.toFixed(2),
          `$${l.hourlyRate.toFixed(2)}`,
          `$${l.totalCost.toFixed(2)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('No time logs recorded', 14, yPos);
      yPos += 10;
    }

    // External Costs Table
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('External Costs', 14, yPos);
    yPos += 5;

    if (externalLines.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Job #', 'Subcontractor', 'Type', 'Estimated', 'Actual']],
        body: externalLines.map(l => [
          l.jobNumber,
          l.subcontractor,
          l.jobType,
          `$${l.estimatedCost.toFixed(2)}`,
          `$${l.actualCost.toFixed(2)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] },
        margin: { left: 14 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('No external jobs recorded', 14, yPos);
      yPos += 10;
    }

    // Cost Summary Box
    yPos += 15;
    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, yPos, 180, 45, 'FD');

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Cost Summary', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const costLines = [
      { label: 'Material Cost', value: materialCost },
      { label: 'Labour Cost', value: labourCost },
      { label: 'External Cost', value: externalCost },
      { label: 'Subtotal', value: subtotal },
      { label: 'Sundry (10%)', value: sundry },
      { label: 'Total Bill', value: totalBill, bold: true },
    ];

    for (const line of costLines) {
      if (line.bold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(line.label, 20, yPos);
      doc.text(`$${line.value.toFixed(2)}`, 150, yPos, { align: 'right' });
      yPos += 6;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Return PDF as response
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="job-card-${jobCard.jobCardNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate job card PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
