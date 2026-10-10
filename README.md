# ShellQuest

Learn the Linux command line by solving puzzles in a terminal that runs entirely in your browser.

No backend, no real shell, nothing to install for players. Every command runs against an in-memory virtual filesystem, so you can `chmod`, `rm` and pipe things together without breaking anything.

<!-- Replace with a GIF of you solving a level: ![ShellQuest demo](docs/demo.gif) -->

**Play it:** https://iris18102006.github.io/ShellQuest/

## How it plays

Each level drops you into a fake machine with a goal. You solve it with real commands, and the game checks the result.

```
user@shellquest:~$ ls
todo.txt
user@shellquest:~$ ls -a
.hidden_note  todo.txt
user@shellquest:~$ cat .hidden_note
FLAG{dotfiles_are_not_invisible}

*** Level complete! Next up: Level 2: Needle in a log ***
```

Stuck? Type `hint`. Broke something? Type `reset`. Progress is saved in your browser.

## Levels

| # | Level | You practice |
| --- | --- | --- |
| 1 | Hidden in plain sight | `ls -a`, `cat` |
| 2 | Needle in a log | `grep` |
| 3 | Pipe dreams | `sort`, `uniq -c`, `head`, pipes |
| 4 | Permission denied | file permissions, `chmod` |
| 5 | Treasure hunt | `find` |
| 6 | Say it with echo | `echo`, `>` |
| 7 | Folders all the way down | `mkdir -p` |
| 8 | Spring cleaning | `rm`, `*` globs |
| 9 | Skip the noise | `grep -v` |
| 10 | Count the damage | `grep -c` |
| 11 | Last words | `tail` |
| 12 | Line number, please | `grep -n` |
| 13 | SHOUTING and whispering | `grep -i` |
| 14 | Glue it together | `cat`, `>` |
| 15 | Biggest number wins | `sort -n`, `tail` |
| 16 | Once is enough | `sort -u` |
| 17 | Lock it down | `chmod 600`, `ls -l` |
| 18 | Lost in the tree | `..`, relative paths |
| 19 | Rename it | `mv` |
| 20 | Backup first | `cp` |
| 21 | Column surgery | `cut` |
| 22 | Boss: the access log | chaining `grep` and `wc` |

## Supported commands

`ls` `cd` `pwd` `cat` `echo` `grep` `head` `tail` `wc` `sort` `uniq` `find` `chmod` `mkdir` `touch` `rm` `cp` `mv` `cut` `whoami`

Plus pipes (`|`), redirects (`>` `>>`), quotes, and `*` / `?` globs.

## Run it locally

You need Node 18 or newer.

```bash
git clone https://github.com/iris18102006/shellquest.git
cd shellquest
npm install
npm run dev       # http://localhost:5173
```

Other scripts:

```bash
npm test          # engine tests + a full playthrough of every level
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## How it works

The whole shell is written from scratch in TypeScript. [xterm.js](https://xtermjs.org/) only draws the terminal; everything it runs comes from this repo.

| File | Job |
| --- | --- |
| `src/vfs.ts` | Virtual filesystem with directories, files, owners and permission bits |
| `src/parser.ts` | Tokenizer for quotes, pipes and redirects |
| `src/commands.ts` | Every command, as a small function: `(ctx, args, stdin) => output` |
| `src/shell.ts` | Runs pipelines, expands globs, executes scripts that have `+x` |
| `src/levels/` | The puzzles, one file per level |
| `src/game.ts` | Level progression and built-ins (`help`, `hint`, `reset`) |
| `src/main.ts` | Terminal setup, line editing, command history |

Pipes work by passing each command's output as the next command's `stdin`, the same idea as a real shell.

## Add a level

Create `src/levels/l23.ts` (next number up) and add it to the list in `src/levels/index.ts`:

```ts
import type { Level } from "./types";

export const level: Level = {
  title: "Level 23: Your title",
  story: "What the player sees in the side panel.",
  hint: "Shown when they type `hint`.",
  files: { "/home/user/a.txt": "file contents" },
  solution: ["cat a.txt"],
  check: (a) => a.output.includes("FLAG{...}"),
};
```

- `files` is the starting filesystem. Use `{ content, mode, exec }` for files with custom permissions or script output.
- `check` runs after every command and gets `{ command, output, fs, cwd }`. Return `true` to complete the level. Use `fs` to check what the player changed (files created, permissions, deleted files). `fileText` and `listDir` in `types.ts` help.
- `solution` is the list of commands that solves it. The tests play every level with it, so an unsolvable level can never ship.

## Add a command

Add a function to the `commands` object in `src/commands.ts`. It gets the shell context, its arguments, and the previous command's output (or `null`), and returns `{ out, err? }`. Pipes, redirects and globs work for free.

## Deploy to GitHub Pages

The Vite `base` is set to `./`, so the build works under any repo name. Run `npm run build` and publish the `dist/` folder, or use a GitHub Actions workflow that builds and deploys on every push to `main`.

## Roadmap

- [ ] Tab completion
- [x] `cp`, `mv`, `cut`
- [ ] More commands: `sed`, `awk`-lite, `tar`, `tr`
- [ ] Levels on variables, `&&`, and shell scripts
- [ ] Per-command help
- [ ] Shareable links to a specific level

## License

MIT
