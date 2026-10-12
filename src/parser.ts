// Tokenizer + pipeline parser: supports quotes, |, >, >>, <

/** raw[i] is true when argv[i] had no quotes (so it may be glob-expanded). */
export interface Cmd { argv: string[]; raw: boolean[]; redirect?: { path: string; append: boolean }; input?: string }

export class ParseError extends Error {}

type Tok = { t: "word"; v: string; q: boolean } | { t: "op"; v: "|" | ">" | ">>" | "<" };

/** Reads $NAME or ${NAME} at line[i] (which is the `$`). Returns the variable name and where it ends. */
function readVar(line: string, i: number): { name: string; end: number } | null {
  const m = /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/.exec(line.slice(i));
  return m ? { name: m[1] ?? m[2], end: i + m[0].length } : null;
}

/** With `vars`, $NAME is expanded outside single quotes. Without it, `$` is left alone. */
export function tokenize(line: string, vars?: Record<string, string>): Tok[] {
  const toks: Tok[] = [];
  let cur = "";
  let has = false;
  let wasQuoted = false;
  let quote: string | null = null;
  const push = () => { if (has) toks.push({ t: "word", v: cur, q: wasQuoted }); cur = ""; has = false; wasQuoted = false; };

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const v = vars && c === "$" && quote !== "'" ? readVar(line, i) : null;
    if (v) {
      const val = vars![v.name] ?? "";
      if (quote) cur += val;
      else {
        // Unquoted values are split on whitespace, like a real shell does.
        val.split(/\s+/).forEach((piece, n) => {
          if (n > 0) push();
          if (piece) { cur += piece; has = true; }
        });
      }
      i = v.end - 1;
    } else if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === "'" || c === '"') {
      quote = c; has = true; wasQuoted = true;
    } else if (c === " " || c === "\t") {
      push();
    } else if (c === "|") {
      push(); toks.push({ t: "op", v: "|" });
    } else if (c === "<") {
      push(); toks.push({ t: "op", v: "<" });
    } else if (c === ">") {
      push();
      if (line[i + 1] === ">") { toks.push({ t: "op", v: ">>" }); i++; }
      else toks.push({ t: "op", v: ">" });
    } else {
      cur += c; has = true;
    }
  }
  if (quote) throw new ParseError("unterminated quote");
  push();
  return toks;
}

export function parse(line: string, vars?: Record<string, string>): Cmd[] {
  const toks = tokenize(line, vars);
  const pipeline: Cmd[] = [];
  let cmd: Cmd = { argv: [], raw: [] };

  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    if (tk.t === "word") {
      cmd.argv.push(tk.v);
      cmd.raw.push(!tk.q);
    } else if (tk.v === "|") {
      if (!cmd.argv.length) throw new ParseError("syntax error near '|'");
      pipeline.push(cmd);
      cmd = { argv: [], raw: [] };
    } else {
      const target = toks[++i];
      if (!target || target.t !== "word") throw new ParseError("syntax error: missing file after redirect");
      if (tk.v === "<") cmd.input = target.v;
      else cmd.redirect = { path: target.v, append: tk.v === ">>" };
    }
  }
  if (!cmd.argv.length) {
    if (pipeline.length) throw new ParseError("syntax error: missing command after '|'");
    return [];
  }
  pipeline.push(cmd);
  return pipeline;
}

/** Split a line on `&&` and `;` (outside quotes). Each part remembers the operator that came BEFORE it. */
export function splitChain(line: string): { text: string; before: "&&" | ";" | null }[] {
  const parts: { text: string; before: "&&" | ";" | null }[] = [];
  let cur = "";
  let quote: string | null = null;
  let before: "&&" | ";" | null = null;
  const flush = (op: "&&" | ";") => {
    if (!cur.trim()) throw new ParseError(`syntax error near '${op}'`);
    parts.push({ text: cur, before });
    cur = "";
    before = op;
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; cur += c; }
    else if (c === "'" || c === '"') { quote = c; cur += c; }
    else if (c === "&" && line[i + 1] === "&") { flush("&&"); i++; }
    else if (c === ";") flush(";");
    else cur += c;
  }
  if (before !== null && !cur.trim()) {
    if (before === "&&") throw new ParseError("syntax error: missing command after '&&'");
  } else if (cur.trim() || parts.length === 0) parts.push({ text: cur, before });
  return parts;
}
