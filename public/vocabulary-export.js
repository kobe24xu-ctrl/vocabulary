import { wordAvailableFor } from "./word-banks.js";

export const VOCABULARY_XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// The existing teacher-only API supplies this array. Exclude built-in examples
// and archived words, while applying the same shared-bank rules as the library.
export function exportableWords(words, program, subject) {
  if (!program || program === "all" || !subject || subject === "all") return [];
  return words.filter(
    (w) => !/^sample-\d+$/.test(w.id) && wordAvailableFor(w, program, subject),
  );
}

const groupOrder = (a, b) => a.localeCompare(b, "en", { numeric: true });
const wordOrder = (a, b) => {
  const left = [...(a.groups || [])].sort(groupOrder)[0] || "\uffff";
  const right = [...(b.groups || [])].sort(groupOrder)[0] || "\uffff";
  return (
    groupOrder(left, right) ||
    a.term.localeCompare(b.term, "en") ||
    a.translation.localeCompare(b.translation, "zh-CN")
  );
};
export function vocabularyExportFilename(
  program,
  subjectName,
  at = Date.now(),
) {
  const date = new Date(at + 8 * 3600000).toISOString().slice(0, 10);
  const clean = (s) =>
    String(s)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .trim()
      .slice(0, 70);
  return `${clean(program.split(" ")[0])}_${clean(subjectName)}_词库_${date}.xlsx`;
}

// Explicit inline-string cells prevent formula execution. OOXML escapes retain
// control characters and literal strings such as "_x0000_" without invalid XML.
const xmlText = (value) =>
  String(value ?? "")
    .replace(/_x[0-9a-f]{4}_/gi, (s) => `_x005F_${s.slice(1)}`)
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,
      (c) => `_x${c.charCodeAt(0).toString(16).padStart(4, "0")}_`,
    )
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
const columnName = (index) => {
  let result = "";
  for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
};
function worksheet(rows, widths) {
  const columns = Math.max(...rows.map((r) => r.length));
  const end = `${columnName(columns - 1)}${rows.length}`;
  const data = rows
    .map(
      (row, index) =>
        `<row r="${index + 1}"${index === 0 ? ' ht="32" customHeight="1"' : ""}>${row
          .map((value, col) => {
            const ref = `${columnName(col)}${index + 1}`,
              style = index === 0 ? 1 : index % 2 === 0 ? 2 : 0;
            if (typeof value === "number" && Number.isFinite(value))
              return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
            if (String(value ?? "").length > 32767)
              throw new Error(
                "词库中有超过 Excel 单元格长度限制的内容，请先缩短对应文本。",
              );
            return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${end}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="48"/><cols>${Array.from({ length: columns }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${widths[i] || 26}" customWidth="1"/>`).join("")}</cols><sheetData>${data}</sheetData><autoFilter ref="A1:${end}"/></worksheet>`;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function concatenate(parts) {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
// Standards-compliant ZIP STORE avoids external packages, scripts or services.
function zip(files) {
  const encode = new TextEncoder(),
    local = [],
    central = [];
  let offset = 0;
  for (const [path, value] of files) {
    const name = encode.encode(path),
      bytes = encode.encode(value),
      crc = crc32(bytes);
    const head = new Uint8Array(30),
      h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint16(12, 33, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, bytes.length, true);
    h.setUint32(22, bytes.length, true);
    h.setUint16(26, name.length, true);
    local.push(head, name, bytes);
    const directory = new Uint8Array(46),
      d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x0800, true);
    d.setUint16(14, 33, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, bytes.length, true);
    d.setUint32(24, bytes.length, true);
    d.setUint16(28, name.length, true);
    d.setUint32(42, offset, true);
    central.push(directory, name);
    offset += head.length + name.length + bytes.length;
  }
  const directory = concatenate(central),
    end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, directory.length, true);
  e.setUint32(16, offset, true);
  return concatenate([...local, directory, end]);
}

export function buildVocabularyWorkbook(
  words,
  { program, subjectName, exportedAt = Date.now() },
) {
  if (!Array.isArray(words) || !words.length)
    throw new Error("所选科目暂无已录入词汇，无法导出。");
  const sorted = [...words].sort(wordOrder);
  const groups = [
    ...new Set(
      sorted.flatMap((w) => (w.groups?.length ? w.groups : ["未分组"])),
    ),
  ].sort(groupOrder);
  const columns = [
    "序号",
    "周次 / Topic",
    "英文单词",
    "中文释义",
    "词性",
    "词性用法介绍",
    "英文例句",
    "中文例句",
    "可接受中文答案",
    "可接受英文答案",
    "补充说明",
    "来源标识",
    "原始文件",
    "来源项目",
    "来源科目",
    "词条ID",
  ];
  const content = (w, index, group) => [
    index,
    group ?? (w.groups || []).join("；"),
    w.term,
    w.translation,
    w.partOfSpeech || "",
    w.partOfSpeechNote || "",
    w.sentence || "",
    w.sentenceZh || "",
    (w.aliases || []).join("；"),
    (w.enAliases || []).join("；"),
    w.explanation || "",
    w.source || "",
    [
      ...new Set(
        [...(w.originalRows || []), ...(w.references || [])]
          .map((r) => r.file)
          .filter(Boolean),
      ),
    ].join("；"),
    w.program || "",
    w.subject || "",
    w.id || "",
  ];
  const main = [columns, ...sorted.map((w, i) => content(w, i + 1))];
  const weekly = [columns];
  for (const group of groups)
    for (const w of sorted)
      if (group === "未分组" ? !w.groups?.length : w.groups?.includes(group))
        weekly.push(content(w, weekly.length, group));
  const raw = [
    [
      "词条ID",
      "英文单词",
      "JSON分段",
      "完整原始内容JSON（按同一词条的分段顺序拼接）",
    ],
  ];
  for (const word of sorted) {
    const chars = Array.from(JSON.stringify(word));
    for (let i = 0; i < chars.length; i += 15000)
      raw.push([
        word.id,
        word.term,
        i / 15000 + 1,
        chars.slice(i, i + 15000).join(""),
      ]);
  }
  const overview = [
    ["项目 / 指标", "值 / 说明"],
    ["导出项目", program],
    ["导出科目", subjectName],
    [
      "导出时间（北京时间）",
      new Date(exportedAt + 8 * 3600000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
    ],
    ["网站词条记录数", sorted.length],
    [
      "不同英文词形数（忽略大小写）",
      new Set(sorted.map((w) => w.term.toLowerCase())).size,
    ],
    ["按周展开记录数", weekly.length - 1],
    [
      "范围说明",
      "导出所选科目的全部已录入词汇，不受搜索、周次筛选或页面显示条数限制。内置示例与已归档词条不导出。",
    ],
    ["共用词库", "沿用课程词库的共用规则；来源项目、科目及原始记录保持原样。"],
    [
      "完整字段",
      "完整JSON表保留全部词条字段。超长JSON按同一词条分段存储，可按分段序号拼接还原。",
    ],
    [
      "数量说明",
      "同一词条跨周出现时按周表会重复；同词不同释义仍保留独立记录。",
    ],
  ];
  for (const group of groups)
    overview.push([
      group,
      weekly.slice(1).filter((r) => r[1] === group).length,
    ]);
  const sheets = [
    ["导出说明", overview, [35, 110]],
    [
      "词库总表",
      main,
      [8, 32, 25, 26, 24, 50, 85, 85, 30, 30, 35, 35, 45, 26, 24, 40],
    ],
    [
      "按周词表",
      weekly,
      [8, 32, 25, 26, 24, 50, 85, 85, 30, 30, 35, 35, 45, 26, 24, 40],
    ],
    ["完整JSON", raw, [40, 28, 12, 140]],
  ];
  const types = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Microsoft YaHei"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFB64A24"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF5EF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const relations = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zip([
    ["[Content_Types].xml", types],
    [
      "_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="workbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], i) => `<sheet name="${xmlText(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    ],
    ["xl/_rels/workbook.xml.rels", relations],
    ["xl/styles.xml", styles],
    ...sheets.map(([, rows, widths], i) => [
      `xl/worksheets/sheet${i + 1}.xml`,
      worksheet(rows, widths),
    ]),
  ]);
}
