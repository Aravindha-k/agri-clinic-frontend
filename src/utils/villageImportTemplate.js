/**
 * Minimal ZIP STORE writer + Excel OOXML template.
 * Avoids adding a spreadsheet library.
 */

export const TEMPLATE_SHEET_IMPORT = "Village Import";
export const TEMPLATE_SHEET_INSTRUCTIONS = "Instructions";
export const TEMPLATE_HEADERS = ["Employee ID", "Employee Name", "Village", "Village Tamil Name"];

export const TEMPLATE_EXAMPLE_ROWS = [
  ["KAC-0003", "Kaviyarasan", "Example Village 1", "உதாரண கிராமம் 1"],
  ["KAC-0004", "Sasikumar", "Example Village 2", "உதாரண கிராமம் 2"],
  ["KAC-0003", "Kaviyarasan", "Shared Village", "பகிரப்பட்ட கிராமம்"],
  ["KAC-0004", "Sasikumar", "Shared Village", "பகிரப்பட்ட கிராமம்"],
  ["", "", "Unassigned Village", "ஒதுக்கப்படாத கிராமம்"],
];

export const TEMPLATE_INSTRUCTIONS = [
  "Kavya Agri Clinic — Village Import",
  "These example rows are a template only. They are never imported automatically.",
  "",
  "Required column: Village",
  "Optional columns: Employee ID, Employee Name, Village Tamil Name",
  "",
  "Employee ID is recommended for assignment (existing Admin ID, e.g. KAC-0003).",
  "Employee Name is used for validation / fallback matching (e.g. Kaviyarasan).",
  "Village Tamil Name is optional (e.g. மடகடிப்பட்டு).",
  "Blank Employee ID and Employee Name imports the village without assignment.",
  "The same village may be assigned to multiple employees.",
  "Duplicate village names do not create duplicate Village Master records.",
  "Existing employees are reused. This import never creates employees.",
  "District, Taluk and Firka are not used and should not be included.",
  "Upload .xlsx only, then Validate File before Confirm Import.",
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeUtf8(text) {
  return new TextEncoder().encode(text);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u16(value) {
  const buf = new Uint8Array(2);
  buf[0] = value & 0xff;
  buf[1] = (value >>> 8) & 0xff;
  return buf;
}

function u32(value) {
  const buf = new Uint8Array(4);
  buf[0] = value & 0xff;
  buf[1] = (value >>> 8) & 0xff;
  buf[2] = (value >>> 16) & 0xff;
  buf[3] = (value >>> 24) & 0xff;
  return buf;
}

export function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encodeUtf8(file.name);
    const data = file.data instanceof Uint8Array ? file.data : encodeUtf8(String(file.data));
    const crc = crc32(data);
    const local = concatBytes([
      encodeUtf8("PK\u0003\u0004"),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ]);
    const central = concatBytes([
      encodeUtf8("PK\u0001\u0002"),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concatBytes(centrals);
  const eocd = concatBytes([
    encodeUtf8("PK\u0005\u0006"),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return concatBytes([...locals, centralDir, eocd]);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellXml(value, ref) {
  const text = xmlEscape(value);
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function colLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function sheetXml(rows) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row
        .map((value, colIndex) => cellXml(value, `${colLetter(colIndex)}${r}`))
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function relsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="${xmlEscape(TEMPLATE_SHEET_IMPORT)}" sheetId="1" r:id="rId1"/>
<sheet name="${xmlEscape(TEMPLATE_SHEET_INSTRUCTIONS)}" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`;
}

function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`;
}

export function buildVillageImportTemplateBytes() {
  const importRows = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE_ROWS];
  const instructionRows = TEMPLATE_INSTRUCTIONS.map((line) => [line]);
  return zipStore([
    { name: "[Content_Types].xml", data: contentTypesXml() },
    { name: "_rels/.rels", data: relsXml() },
    { name: "xl/workbook.xml", data: workbookXml() },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRelsXml() },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(importRows) },
    { name: "xl/worksheets/sheet2.xml", data: sheetXml(instructionRows) },
  ]);
}

export function downloadVillageImportTemplate() {
  const bytes = buildVillageImportTemplateBytes();
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Kavya_Village_Import_Template.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
