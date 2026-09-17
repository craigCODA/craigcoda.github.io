export const TEXT_EXTENSIONS = new Set(['.css', '.csv', '.html', '.js', '.json', '.mjs', '.svg', '.txt']);
export const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
export const PUBLIC_FILE_EXTENSIONS = new Set(['.avif', '.css', '.html', '.jpeg', '.jpg', '.js', '.json', '.png', '.webp']);

const approvedWarehouseClaims = new Set([
  '176 pallet positions recovered',
  '22 storage bins freed'
]);
const warehouseCountSource = String.raw`\+?\d[\d,]*`;
const warehouseMetricSource = String.raw`(?:(?:pallet\s+)?positions?(?:\s+(?:recovered|freed))?|(?:storage\s+)?bins?(?:\s+(?:freed|recovered))?|(?:recovered|freed)\s+(?:pallet\s+)?positions?|(?:freed|recovered)\s+(?:storage\s+)?bins?)`;
const warehouseClaimSources = [
  String.raw`(?<![\p{L}\p{N}+])${warehouseCountSource}\s+${warehouseMetricSource}(?![\p{L}\p{N}])`,
  String.raw`(?<![\p{L}\p{N}_-])${warehouseMetricSource}\s*(?:(?:was|were|is|are|total(?:ed)?)\s+|[:=-]\s*)${warehouseCountSource}(?![\p{L}\p{N}])`,
  String.raw`\b(?:(?:historical|warehouse(?:\s+optimization)?|optimization|verified|synthetic)\s+)?(?:result|claim)\s*(?:(?:was|were|is|are)\s+|[:=-]\s*)${warehouseCountSource}\s*(?:\/|,|and)\s*${warehouseCountSource}(?![\p{L}\p{N}])`
];

function normalizeWarehouseClaim(claim) {
  return claim.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/gu, ' ');
}

export function hasUnapprovedWarehouseClaim(content) {
  if (typeof content !== 'string') return false;
  for (const source of warehouseClaimSources) {
    for (const match of content.matchAll(new RegExp(source, 'giu'))) {
      if (!approvedWarehouseClaims.has(normalizeWarehouseClaim(match[0]))) return true;
    }
  }
  return false;
}
export const warehouseInternalLabelPattern = /(?<![\p{L}\p{N}])(?:WH\d+|J\d+)(?![\p{L}\p{N}])/iu;
export const warehouseSensitiveDetailPattern = /(?:\braw\s+(?:sap(?:\s+(?:records?|data))?|records?|data)\b|\bconfidential(?:\s+|:\s*)(?:roster|data)\b|\bfacility(?:\s+|:\s*)(?:address|identifier|label)\b|\binternal\s+(?:bin(?:\s+(?:id|identifier))?|label|record)\b|\b(?:operator|employee|personnel)(?:\s+|:\s*)(?:name|e-?mail|id)\b|\b(?:material\s+number|inventory\s+record)(?:\s*:\s*\S|\s+\S)|(?<![\p{L}\p{N}])(?:WH\d+|J\d+)(?![\p{L}\p{N}])|\b(?:credentials?|api\s*keys?|secrets?|passwords?)\b|\btokens?\b(?!\.css\b))/iu;
export const publicSensitiveDetailPattern = /(?:\braw\s+(?:sap(?:\s+(?:records?|data))?|records?|data)\b|\bconfidential(?:\s+|:\s*)(?:roster|data)\b|\bfacility(?:\s+|:\s*)(?:address|identifier|label)\b|\binternal\s+(?:bin(?:\s+(?:id|identifier))?|label|record)\b|\b(?:operator|employee|personnel)(?:\s+|:\s*)(?:name|e-?mail|id)\b|\b(?:material\s+number|inventory\s+record)(?:\s*:\s*\S|\s+\S)|\b(?:api\s*keys?|secrets?|passwords?)\b|\btokens?\b(?!\.css\b))/iu;
export const warehouseSvgReferencePattern = /\.svg\b/i;
