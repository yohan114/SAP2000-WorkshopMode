import { NextRequest, NextResponse } from 'next/server';

// POST /api/reports/generate-pdf - Generate PDF report
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // For now, return a simple text-based PDF
    // In production, you would use jsPDF or a similar library
    const { title, generatedAt, period, summary, data: rows, columns } = data;
    
    // Generate a simple HTML-based PDF content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; font-size: 24px; margin-bottom: 5px; }
          h2 { color: #666; font-size: 16px; font-weight: normal; }
          .meta { color: #888; font-size: 12px; margin-bottom: 20px; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .summary h3 { margin: 0 0 10px 0; font-size: 14px; color: #333; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .summary-item { }
          .summary-item label { display: block; font-size: 11px; color: #666; }
          .summary-item value { display: block; font-size: 14px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #10b981; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; }
        </style>
      </head>
      <body>
        <h1>WCP - Workshop Control Platform</h1>
        <h2>${title}</h2>
        <div class="meta">
          Period: ${period.start} to ${period.end}<br>
          Generated: ${generatedAt}
        </div>
        
        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-grid">
            ${Object.entries(summary).map(([key, value]) => `
              <div class="summary-item">
                <label>${key}</label>
                <value>${value}</value>
              </div>
            `).join('')}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              ${columns.map((col: any) => `<th class="${col.align === 'right' ? 'text-right' : ''}">${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 100).map((row: any) => `
              <tr>
                ${columns.map((col: any) => `<td class="${col.align === 'right' ? 'text-right' : ''}">${row[col.key] || '-'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>WCP v2.0 - Workshop Control Platform | Page 1 of 1</p>
        </div>
      </body>
      </html>
    `;
    
    // Return HTML content with PDF headers for download
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${title.toLowerCase().replace(/\s+/g, '-')}.html"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
