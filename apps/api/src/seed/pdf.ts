interface PdfOptions {
  title: string;
  subtitle?: string;
  body?: string[];
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 64;

export function createPdf({ title, subtitle, body = [] }: PdfOptions): Buffer {
  const content = buildContentStream(title, subtitle, body);

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.7\n';
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

function buildContentStream(title: string, subtitle: string | undefined, body: string[]): string {
  const lines: string[] = [];
  let y = PAGE_HEIGHT - MARGIN - 24;

  lines.push('BT', '/F1 20 Tf', `1 0 0 1 ${MARGIN} ${y} Tm`, `(${escapeText(title)}) Tj`, 'ET');
  y -= 26;

  if (subtitle) {
    lines.push(
      'BT',
      '/F2 11 Tf',
      '0.45 0.45 0.45 rg',
      `1 0 0 1 ${MARGIN} ${y} Tm`,
      `(${escapeText(subtitle)}) Tj`,
      'ET',
      '0 0 0 rg',
    );
    y -= 30;
  }

  lines.push('0.85 0.85 0.85 RG', '0.8 w', `${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S`);
  y -= 28;

  for (const line of body) {
    if (line === '') {
      y -= 10;
      continue;
    }
    lines.push('BT', '/F2 11 Tf', `1 0 0 1 ${MARGIN} ${y} Tm`, `(${escapeText(line)}) Tj`, 'ET');
    y -= 17;
  }

  lines.push(
    'BT',
    '/F2 8 Tf',
    '0.6 0.6 0.6 rg',
    `1 0 0 1 ${MARGIN} ${MARGIN - 20} Tm`,
    '(Sample document generated for the Data Room demo. Not a real record.) Tj',
    'ET',
  );

  return lines.join('\n');
}

function escapeText(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '-')
    .split('\\')
    .join('\\\\')
    .split('(')
    .join('\\(')
    .split(')')
    .join('\\)');
}
