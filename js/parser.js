/**
 * Lightweight protobuf IDL tokenizer + recursive-descent parser.
 * Handles proto2/proto3 messages, enums, services, oneofs, maps, options, imports.
 */

const KEYWORDS = new Set([
  "syntax", "package", "import", "option", "message", "enum", "service", "rpc",
  "returns", "stream", "repeated", "optional", "required", "map", "oneof",
  "reserved", "extensions", "extend", "to", "max", "true", "false", "public", "weak",
]);

export class ParseError extends Error {
  constructor(message, line, column) {
    super(line != null ? `${message} (line ${line}:${column})` : message);
    this.line = line;
    this.column = column;
  }
}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  const len = source.length;
  let line = 1;
  let col = 1;

  const peek = () => source[i];
  const advance = () => {
    const ch = source[i++];
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  };

  while (i < len) {
    const startLine = line;
    const startCol = col;
    const ch = peek();

    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }

    // line comment
    if (ch === "/" && source[i + 1] === "/") {
      advance();
      advance();
      let text = "";
      while (i < len && peek() !== "\n") text += advance();
      tokens.push({ type: "comment", value: text.trim(), line: startLine, column: startCol, style: "line" });
      continue;
    }

    // block comment
    if (ch === "/" && source[i + 1] === "*") {
      advance();
      advance();
      let text = "";
      while (i < len) {
        if (peek() === "*" && source[i + 1] === "/") {
          advance();
          advance();
          break;
        }
        text += advance();
      }
      tokens.push({ type: "comment", value: text.trim(), line: startLine, column: startCol, style: "block" });
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = advance();
      let value = "";
      while (i < len && peek() !== quote) {
        if (peek() === "\\") {
          advance();
          value += advance() ?? "";
        } else {
          value += advance();
        }
      }
      if (peek() === quote) advance();
      tokens.push({ type: "string", value, line: startLine, column: startCol });
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(source[i + 1] || ""))) {
      let value = "";
      if (ch === "-") value += advance();
      while (i < len && /[0-9a-fA-FxX.]/.test(peek())) value += advance();
      tokens.push({ type: "number", value, line: startLine, column: startCol });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let value = "";
      while (i < len && /[A-Za-z0-9_.]/.test(peek())) value += advance();
      const type = KEYWORDS.has(value) ? "keyword" : "ident";
      tokens.push({ type, value, line: startLine, column: startCol });
      continue;
    }

    if ("{}[]()<>=,;:+-*/".includes(ch)) {
      tokens.push({ type: "punct", value: advance(), line: startLine, column: startCol });
      continue;
    }

    // skip unknown char
    advance();
  }

  tokens.push({ type: "eof", value: "", line, column: col });
  return tokens;
}

class Parser {
  constructor(tokens, filename) {
    this.all = tokens;
    this.i = 0;
    this.filename = filename;
    this.pendingComments = [];
    this._syncComments();
  }

  _syncComments() {
    while (this.i < this.all.length && this.all[this.i].type === "comment") {
      this.pendingComments.push(this.all[this.i].value);
      this.i++;
    }
  }

  takeComments() {
    const c = this.pendingComments.join("\n");
    this.pendingComments = [];
    return c || null;
  }

  peek() {
    this._syncComments();
    return this.all[this.i] || { type: "eof", value: "" };
  }

  at(type, value) {
    const t = this.peek();
    if (type && t.type !== type) return false;
    if (value != null && t.value !== value) return false;
    return true;
  }

  consume(type, value) {
    const t = this.peek();
    if (type && t.type !== type) {
      throw new ParseError(`Expected ${type}${value ? ` '${value}'` : ""}, got ${t.type} '${t.value}'`, t.line, t.column);
    }
    if (value != null && t.value !== value) {
      throw new ParseError(`Expected '${value}', got '${t.value}'`, t.line, t.column);
    }
    this.i++;
    this._syncComments();
    return t;
  }

  tryConsume(type, value) {
    if (this.at(type, value)) {
      return this.consume(type, value);
    }
    return null;
  }

  parse() {
    const file = {
      kind: "file",
      filename: this.filename,
      syntax: "proto3",
      package: "",
      imports: [],
      options: [],
      messages: [],
      enums: [],
      services: [],
      extends: [],
      comments: this.takeComments(),
      errors: [],
    };

    try {
      while (!this.at("eof")) {
        const leading = this.takeComments();
        if (this.at("keyword", "syntax")) {
          this.consume("keyword", "syntax");
          this.consume("punct", "=");
          file.syntax = this.consume("string").value;
          this.consume("punct", ";");
        } else if (this.at("keyword", "package")) {
          this.consume("keyword", "package");
          file.package = this.parseFullIdent();
          this.consume("punct", ";");
        } else if (this.at("keyword", "import")) {
          this.consume("keyword", "import");
          let weak = false;
          let pub = false;
          if (this.tryConsume("keyword", "public")) pub = true;
          else if (this.tryConsume("keyword", "weak")) weak = true;
          const path = this.consume("string").value;
          this.consume("punct", ";");
          file.imports.push({ path, public: pub, weak, comment: leading });
        } else if (this.at("keyword", "option")) {
          file.options.push(this.parseOption(leading));
        } else if (this.at("keyword", "message")) {
          file.messages.push(this.parseMessage(leading));
        } else if (this.at("keyword", "enum")) {
          file.enums.push(this.parseEnum(leading));
        } else if (this.at("keyword", "service")) {
          file.services.push(this.parseService(leading));
        } else if (this.at("keyword", "extend")) {
          file.extends.push(this.parseExtend(leading));
        } else {
          // skip unknown statement
          const t = this.peek();
          file.errors.push(`Unexpected token '${t.value}' at ${t.line}:${t.column}`);
          this.i++;
          this._syncComments();
        }
      }
    } catch (err) {
      file.errors.push(err.message || String(err));
    }

    return file;
  }

  parseFullIdent() {
    let name = this.consume("ident").value;
    while (this.tryConsume("punct", ".")) {
      // allow keyword-as-ident after dot rarely; use ident or keyword
      const t = this.peek();
      if (t.type === "ident" || t.type === "keyword") {
        name += "." + this.consume(t.type).value;
      } else {
        throw new ParseError("Expected identifier", t.line, t.column);
      }
    }
    return name;
  }

  parseTypeName() {
    let name = "";
    if (this.tryConsume("punct", ".")) name = ".";
    name += this.parseFullIdent();
    return name;
  }

  parseOption(leading) {
    this.consume("keyword", "option");
    let name = "";
    if (this.tryConsume("punct", "(")) {
      name = "(" + this.parseTypeName() + ")";
      this.consume("punct", ")");
      while (this.tryConsume("punct", ".")) {
        name += "." + this.consume("ident").value;
      }
    } else {
      name = this.parseFullIdent();
    }
    this.consume("punct", "=");
    const value = this.parseConstant();
    this.consume("punct", ";");
    return { name, value, comment: leading };
  }

  parseConstant() {
    if (this.at("string")) return { kind: "string", value: this.consume("string").value };
    if (this.at("number")) return { kind: "number", value: this.consume("number").value };
    if (this.at("keyword", "true") || this.at("keyword", "false")) {
      return { kind: "bool", value: this.consume("keyword").value === "true" };
    }
    if (this.at("ident") || this.at("keyword")) {
      return { kind: "ident", value: this.parseTypeName() };
    }
    if (this.at("punct", "{")) {
      // aggregate option — skip balanced braces as raw
      return { kind: "aggregate", value: this.skipBlock("{", "}") };
    }
    const t = this.peek();
    throw new ParseError("Expected constant", t.line, t.column);
  }

  skipBlock(open, close) {
    this.consume("punct", open);
    let depth = 1;
    let raw = open;
    while (!this.at("eof") && depth > 0) {
      const t = this.peek();
      this.i++;
      this._syncComments();
      raw += t.type === "string" ? JSON.stringify(t.value) : t.value;
      if (t.value === open) depth++;
      if (t.value === close) depth--;
      if (t.type !== "punct") raw += " ";
    }
    return raw;
  }

  parseMessage(leading) {
    this.consume("keyword", "message");
    const name = this.consume("ident").value;
    const msg = {
      kind: "message",
      name,
      comment: leading,
      fields: [],
      oneofs: [],
      messages: [],
      enums: [],
      options: [],
      reserved: [],
      mapFields: [],
      line: this.peek().line,
    };
    this.consume("punct", "{");
    while (!this.at("punct", "}") && !this.at("eof")) {
      const c = this.takeComments();
      if (this.at("keyword", "option")) {
        msg.options.push(this.parseOption(c));
      } else if (this.at("keyword", "message")) {
        msg.messages.push(this.parseMessage(c));
      } else if (this.at("keyword", "enum")) {
        msg.enums.push(this.parseEnum(c));
      } else if (this.at("keyword", "oneof")) {
        msg.oneofs.push(this.parseOneof(c));
      } else if (this.at("keyword", "map")) {
        msg.fields.push(this.parseMapField(c));
      } else if (this.at("keyword", "reserved") || this.at("keyword", "extensions")) {
        msg.reserved.push(this.parseReserved(c));
      } else if (this.at("keyword", "extend")) {
        // rare inside message
        this.parseExtend(c);
      } else {
        msg.fields.push(this.parseField(c));
      }
    }
    this.consume("punct", "}");
    return msg;
  }

  parseField(leading) {
    let label = null;
    if (this.at("keyword", "repeated") || this.at("keyword", "optional") || this.at("keyword", "required")) {
      label = this.consume("keyword").value;
    }
    const type = this.parseFieldType();
    const name = this.consume("ident").value;
    this.consume("punct", "=");
    const number = this.consume("number").value;
    const options = this.parseFieldOptions();
    this.consume("punct", ";");
    // trailing comment already in pending from sync — absorb same-line? already handled
    return {
      kind: "field",
      label,
      type,
      name,
      number: Number(number),
      options,
      comment: leading,
    };
  }

  parseFieldType() {
    if (this.at("keyword", "map")) {
      // shouldn't normally hit here
      return this.parseMapType();
    }
    return this.parseTypeName();
  }

  parseMapType() {
    this.consume("keyword", "map");
    this.consume("punct", "<");
    const keyType = this.parseTypeName();
    this.consume("punct", ",");
    const valueType = this.parseTypeName();
    this.consume("punct", ">");
    return { kind: "map", keyType, valueType, text: `map<${keyType}, ${valueType}>` };
  }

  parseMapField(leading) {
    const type = this.parseMapType();
    const name = this.consume("ident").value;
    this.consume("punct", "=");
    const number = this.consume("number").value;
    const options = this.parseFieldOptions();
    this.consume("punct", ";");
    return {
      kind: "field",
      label: "repeated", // maps are repeated entry semantically
      type,
      name,
      number: Number(number),
      options,
      comment: leading,
      isMap: true,
    };
  }

  parseFieldOptions() {
    const options = [];
    if (!this.tryConsume("punct", "[")) return options;
    do {
      let name;
      if (this.tryConsume("punct", "(")) {
        name = "(" + this.parseTypeName() + ")";
        this.consume("punct", ")");
        while (this.tryConsume("punct", ".")) name += "." + this.consume("ident").value;
      } else {
        name = this.parseFullIdent();
      }
      this.consume("punct", "=");
      const value = this.parseConstant();
      options.push({ name, value });
    } while (this.tryConsume("punct", ","));
    this.consume("punct", "]");
    return options;
  }

  parseOneof(leading) {
    this.consume("keyword", "oneof");
    const name = this.consume("ident").value;
    const oneof = { kind: "oneof", name, comment: leading, fields: [] };
    this.consume("punct", "{");
    while (!this.at("punct", "}") && !this.at("eof")) {
      const c = this.takeComments();
      if (this.at("keyword", "option")) {
        this.parseOption(c);
        continue;
      }
      const field = this.parseField(c);
      field.oneof = name;
      oneof.fields.push(field);
    }
    this.consume("punct", "}");
    return oneof;
  }

  parseReserved(leading) {
    const keyword = this.consume("keyword").value;
    const items = [];
    do {
      if (this.at("string")) {
        items.push({ kind: "name", value: this.consume("string").value });
      } else {
        const start = this.consume("number").value;
        if (this.tryConsume("keyword", "to")) {
          const end = this.at("keyword", "max")
            ? this.consume("keyword", "max").value
            : this.consume("number").value;
          items.push({ kind: "range", start, end });
        } else {
          items.push({ kind: "number", value: start });
        }
      }
    } while (this.tryConsume("punct", ","));
    this.consume("punct", ";");
    return { kind: keyword, items, comment: leading };
  }

  parseEnum(leading) {
    this.consume("keyword", "enum");
    const name = this.consume("ident").value;
    const en = {
      kind: "enum",
      name,
      comment: leading,
      values: [],
      options: [],
      reserved: [],
    };
    this.consume("punct", "{");
    while (!this.at("punct", "}") && !this.at("eof")) {
      const c = this.takeComments();
      if (this.at("keyword", "option")) {
        en.options.push(this.parseOption(c));
      } else if (this.at("keyword", "reserved")) {
        en.reserved.push(this.parseReserved(c));
      } else {
        const vname = this.consume("ident").value;
        this.consume("punct", "=");
        const number = this.consume("number").value;
        const options = this.parseFieldOptions();
        this.consume("punct", ";");
        en.values.push({ name: vname, number: Number(number), options, comment: c });
      }
    }
    this.consume("punct", "}");
    return en;
  }

  parseService(leading) {
    this.consume("keyword", "service");
    const name = this.consume("ident").value;
    const svc = {
      kind: "service",
      name,
      comment: leading,
      methods: [],
      options: [],
    };
    this.consume("punct", "{");
    while (!this.at("punct", "}") && !this.at("eof")) {
      const c = this.takeComments();
      if (this.at("keyword", "option")) {
        svc.options.push(this.parseOption(c));
      } else if (this.at("keyword", "rpc")) {
        svc.methods.push(this.parseRpc(c));
      } else {
        const t = this.peek();
        throw new ParseError(`Unexpected in service: ${t.value}`, t.line, t.column);
      }
    }
    this.consume("punct", "}");
    return svc;
  }

  parseRpc(leading) {
    this.consume("keyword", "rpc");
    const name = this.consume("ident").value;
    this.consume("punct", "(");
    const clientStreaming = !!this.tryConsume("keyword", "stream");
    const requestType = this.parseTypeName();
    this.consume("punct", ")");
    this.consume("keyword", "returns");
    this.consume("punct", "(");
    const serverStreaming = !!this.tryConsume("keyword", "stream");
    const responseType = this.parseTypeName();
    this.consume("punct", ")");
    const options = [];
    if (this.tryConsume("punct", "{")) {
      while (!this.at("punct", "}") && !this.at("eof")) {
        if (this.at("keyword", "option")) options.push(this.parseOption(this.takeComments()));
        else {
          this.i++;
          this._syncComments();
        }
      }
      this.consume("punct", "}");
    } else {
      this.consume("punct", ";");
    }
    return {
      kind: "rpc",
      name,
      requestType,
      responseType,
      clientStreaming,
      serverStreaming,
      options,
      comment: leading,
    };
  }

  parseExtend(leading) {
    this.consume("keyword", "extend");
    const type = this.parseTypeName();
    const fields = [];
    this.consume("punct", "{");
    while (!this.at("punct", "}") && !this.at("eof")) {
      fields.push(this.parseField(this.takeComments()));
    }
    this.consume("punct", "}");
    return { kind: "extend", type, fields, comment: leading };
  }
}

export function parseProto(source, filename = "untitled.proto") {
  const tokens = tokenize(source);
  const parser = new Parser(tokens, filename);
  const ast = parser.parse();
  ast.source = source;
  return ast;
}

export function typeRefText(type) {
  if (type && typeof type === "object" && type.kind === "map") {
    return type.text || `map<${type.keyType}, ${type.valueType}>`;
  }
  return String(type || "");
}

export const SCALAR_TYPES = new Set([
  "double", "float", "int32", "int64", "uint32", "uint64",
  "sint32", "sint64", "fixed32", "fixed64", "sfixed32", "sfixed64",
  "bool", "string", "bytes",
]);
