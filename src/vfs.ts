// In-memory virtual filesystem.

export interface Base { name: string; mode: number; owner: string }
export interface FileNode extends Base { type: "file"; content: string; exec?: string }
export interface DirNode extends Base { type: "dir"; children: Record<string, Node> }
export type Node = FileNode | DirNode;

/** path -> content, or { content, mode, exec } for files with custom perms. */
export type FsSpec = Record<string, string | { content: string; mode?: number; exec?: string }>;

export class FS {
  root: DirNode = { type: "dir", name: "", mode: 0o755, owner: "root", children: {} };

  static from(spec: FsSpec, user = "user"): FS {
    const fs = new FS();
    for (const [path, v] of Object.entries(spec)) {
      const file = typeof v === "string" ? { content: v } : v;
      fs.writeFile(path, file.content, { mode: file.mode ?? 0o644, exec: file.exec, owner: user });
    }
    return fs;
  }

  /** Turn any path into an absolute, normalized list of segments. */
  static segments(path: string, cwd = "/"): string[] {
    const full = path.startsWith("/") ? path : `${cwd}/${path}`;
    const out: string[] = [];
    for (const part of full.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    return out;
  }

  static abs(path: string, cwd = "/"): string {
    return "/" + FS.segments(path, cwd).join("/");
  }

  get(path: string, cwd = "/"): Node | null {
    let node: Node = this.root;
    for (const seg of FS.segments(path, cwd)) {
      if (node.type !== "dir") return null;
      const next: Node | undefined = node.children[seg];
      if (!next) return null;
      node = next;
    }
    return node;
  }

  mkdirp(path: string, cwd = "/", owner = "user"): DirNode | null {
    let node: DirNode = this.root;
    for (const seg of FS.segments(path, cwd)) {
      let next: Node | undefined = node.children[seg];
      if (!next) {
        next = { type: "dir", name: seg, mode: 0o755, owner, children: {} };
        node.children[seg] = next;
      }
      if (next.type !== "dir") return null;
      node = next;
    }
    return node;
  }

  writeFile(
    path: string,
    content: string,
    opts: { cwd?: string; mode?: number; exec?: string; owner?: string } = {},
  ): boolean {
    const segs = FS.segments(path, opts.cwd);
    const name = segs.pop();
    if (!name) return false;
    const dir = this.mkdirp("/" + segs.join("/"), "/", opts.owner);
    if (!dir) return false;
    const existing = dir.children[name];
    if (existing?.type === "dir") return false;
    dir.children[name] = {
      type: "file",
      name,
      content,
      mode: existing?.mode ?? opts.mode ?? 0o644,
      owner: existing?.owner ?? opts.owner ?? "user",
      exec: existing?.type === "file" ? existing.exec ?? opts.exec : opts.exec,
    };
    return true;
  }

  remove(path: string, cwd = "/"): boolean {
    const segs = FS.segments(path, cwd);
    const name = segs.pop();
    if (!name) return false;
    const parent = this.get("/" + segs.join("/"));
    if (!parent || parent.type !== "dir" || !parent.children[name]) return false;
    delete parent.children[name];
    return true;
  }
}

export function modeString(n: Node): string {
  const bits = "rwxrwxrwx";
  let s = n.type === "dir" ? "d" : "-";
  for (let i = 0; i < 9; i++) s += n.mode & (1 << (8 - i)) ? bits[i] : "-";
  return s;
}
