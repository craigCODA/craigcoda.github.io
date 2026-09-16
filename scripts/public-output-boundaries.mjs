export const TEXT_EXTENSIONS = new Set(['.css', '.csv', '.html', '.js', '.json', '.mjs', '.svg', '.txt']);
export const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
export const PUBLIC_FILE_EXTENSIONS = new Set(['.avif', '.css', '.html', '.jpeg', '.jpg', '.js', '.json', '.png', '.webp']);

export const warehouseDisclosurePattern = /(?<![\p{L}\p{N}+])\+?(?:222|26)(?![\p{L}\p{N}])/u;
export const warehouseSensitiveDetailPattern = /(?:\braw\s+(?:sap(?:\s+(?:records?|data))?|records?|data)\b|\bconfidential(?:\s+|:\s*)(?:roster|data)\b|\bfacility(?:\s+|:\s*)(?:address|identifier|label)\b|\binternal\s+(?:bin(?:\s+(?:id|identifier))?|label|record)\b|\b(?:operator|employee|personnel)(?:\s+|:\s*)(?:name|e-?mail|id)\b|\b(?:material\s+number|inventory\s+record)(?:\s*:\s*\S|\s+\S)|\b(?:WH\d+|[A-Z]\d{2})\b|\b(?:credentials?|api\s*keys?|secrets?|passwords?)\b|\btokens?\b(?!\.css\b))/iu;
export const publicSensitiveDetailPattern = /(?:\braw\s+(?:sap(?:\s+(?:records?|data))?|records?|data)\b|\bconfidential(?:\s+|:\s*)(?:roster|data)\b|\bfacility(?:\s+|:\s*)(?:address|identifier|label)\b|\binternal\s+(?:bin(?:\s+(?:id|identifier))?|label|record)\b|\b(?:operator|employee|personnel)(?:\s+|:\s*)(?:name|e-?mail|id)\b|\b(?:material\s+number|inventory\s+record)(?:\s*:\s*\S|\s+\S)|\b(?:api\s*keys?|secrets?|passwords?)\b|\btokens?\b(?!\.css\b))/iu;
export const warehouseSvgReferencePattern = /\.svg\b/i;
