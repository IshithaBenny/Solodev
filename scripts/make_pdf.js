import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Minimal valid PDF with styled text
const pdfContent = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length 556
>>
stream
BT
/F1 28 Tf
70 700 Td
(CERTIFICATE OF WASTING TIME) Tj
/F2 14 Tf
0 -50 Td
(This certifies that the esteemed player has officially and successfully) Tj
0 -25 Td
(squandered 5 precious minutes of their human lifespan on an utterly) Tj
0 -25 Td
(useless 3D die challenge.) Tj
0 -60 Td
/F1 18 Tf
(Achievement: WIN CONDITION NOT FOUND) Tj
/F2 12 Tf
0 -40 Td
(Awarded by: TinkerHub Useless Projects 3.0) Tj
0 -20 Td
(Status: Time irreversibly lost) Tj
0 -20 Td
(Date: September 2026) Tj
0 -50 Td
(Signature: ______________________ (Chief Officer of Uselessness)) Tj
ET
endstream
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj
6 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000874 00000 n 
0000000945 00000 n 
trailer
<<
  /Size 7
  /Root 1 0 R
>>
startxref
1011
%%EOF`;

fs.writeFileSync(path.join(outDir, 'certificate_of_wasting_time.pdf'), pdfContent);
console.log('PDF generated at public/assets/certificate_of_wasting_time.pdf');
