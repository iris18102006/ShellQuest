// Tokenizer + pipeline parser: supports quotes, |, >, >>

/** raw[i] is true when argv[i] had no quotes (so it may be glob-expanded). */
export interface Cmd { argv: string[]; raw: boolean[]; redirect?: { path: string; append: boolean } }

export class ParseError extends Error {}

type Tok = { t: "word"; v: string; q: boolean } | { t: "op"; v: "|" | ">" | ">>" };

export function tokenize(line: string): Tok[] {
  const toks: Tok[] = [];
  let cur = "";
  let has = false;
  let wasQuoted = false;
  let quote: string | null = null;
  const push = () => { if (has) toks.push({ t: "word", v: cur, q: wasQuoted }); cur = ""; has = false; wasQuoted = false; };

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === "'" || c === '"') {
      quote = c; has = true; wasQuoted = true;
    } else if (c === " " || c === "\t") {
      push();
    } else if (c === "|") {
      push(); toks.push({ t: "op", v: "|" });
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

export function parse(line: string): Cmd[] {
  const toks = tokenize(line);
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
      cmd.redirect = { path: target.v, append: tk.v === ">>" };
    }
  }
  if (!cmd.argv.length) {
    if (pipeline.length) throw new ParseError("syntax error: missing command after '|'");
    return [];
  }
  pipeline.push(cmd);
  return pipeline;
}
