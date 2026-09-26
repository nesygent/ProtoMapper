/** Minimal protobuf-ish syntax highlighter (HTML-escaped). */

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function highlightProto(source) {
  const escaped = escapeHtml(source);
  // crude but readable: comments, strings, keywords, numbers
  const patterns = [
    { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, cls: "tok-cm" },
    { re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, cls: "tok-str" },
    {
      re: /\b(syntax|package|import|option|message|enum|service|rpc|returns|stream|repeated|optional|required|map|oneof|reserved|extensions|extend|to|max|true|false|public|weak)\b/g,
      cls: "tok-kw",
    },
    {
      re: /\b(double|float|int32|int64|uint32|uint64|sint32|sint64|fixed32|fixed64|sfixed32|sfixed64|bool|string|bytes)\b/g,
      cls: "tok-type",
    },
    { re: /\b(0x[0-9a-fA-F]+|\d+)\b/g, cls: "tok-num" },
  ];

  // Protect already-matched via placeholders
  let out = escaped;
  const slots = [];
  for (const { re, cls } of patterns) {
    out = out.replace(re, (match) => {
      // skip if inside existing slot markers
      if (match.includes("\u0000")) return match;
      const idx = slots.length;
      slots.push(`<span class="${cls}">${match}</span>`);
      return `\u0000${idx}\u0000`;
    });
  }
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[Number(i)]);
  return out;
}
