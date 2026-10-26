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

Stuck? Type `hint`. Broke something? Type `reset`. Not sure how a command works? `help grep` or `grep --help`. Press Tab to complete commands and file names. Type `share` for a link to your current level. Progress is saved in your browser.

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
| 23 | Word count | `wc -w` |
| 24 | Append, don't overwrite | `>>` |
| 25 | Top of the file | `head` |
| 26 | Only the real config files | `find -type f` |
| 27 | Dotfile detective | `find -name ".*"` |
| 28 | Top 3 | `sort`, `uniq -c`, `head` |
| 29 | Eyes only | `chmod 700` |
| 30 | Save the evidence | `grep`, `>` |
| 31 | Count them all | `wc -l *.csv` |
| 32 | Boss: the heist | `find`, `cp`, `chmod` |
| 33 | Dig through everything | `grep -r` |
| 34 | Names only, please | `grep -l` |
| 35 | Shout it | `tr a-z A-Z`, `<` |
| 36 | Strip it | `tr -d` |
| 37 | Find and replace | `sed 's/a/b/g'` |
| 38 | Edit in place | `sed -i` |
| 39 | Delete a line | `sed 'Nd'` |
| 40 | Pick a column | `awk '{print $2}'` |
| 41 | Filter and print | `awk -F, '$3 > 100 {print $1}'` |
| 42 | Show and save | `tee` |
| 43 | Clone the folder | `cp -r` |
| 44 | Sort by column | `sort -t, -k2 -nr` |
| 45 | Boss: the breach report | `grep -r`, `awk`, `cut`, `sort -u`, `>` |
| 46 | Skip the header | `tail -n +2` |
| 47 | Newest first | `tac` |
| 48 | Only the repeats | `sort`, `uniq -d` |
| 49 | First three letters | `cut -c` |
| 50 | In both lists | `comm -12` |
| 51 | Who ghosted? | `comm -23` |
| 52 | Sweep the temp files | `find`, `xargs`, `rm` |
| 53 | Boss: the banned list | `sort -u`, `comm -12`, `>` |
| 54 | Two jobs, one line | `&&` |
| 55 | Say it with a variable | `NAME=value`, `$NAME` |
| 56 | Name it once | `$VAR` in a pipeline, `grep -c` |
| 57 | A command inside a command | `$(...)` |
| 58 | Add them up | `awk` `END`, `+=` |
| 59 | The average | `awk` `END`, `NR`, `/` |
| 60 | Count the big ones | `awk` condition, `n++`, `END` |
| 61 | What changed? | `diff`, `grep` |
| 62 | Boss: the quarterly report | `awk` `END`, `sales/*.csv`, `>` |
| 63 | Case-insensitive search | `grep -i` |
| 64 | Keep the clean lines | `grep -v` |
| 65 | Count the incidents | `wc -l`, input redirection |
| 66 | Top three headlines | `head` |
| 67 | Last two events | `tail` |
| 68 | Extract the usernames | `cut` |
| 69 | Unique sorted tags | `sort`, `uniq` |
| 70 | Normalize the labels | `tr` |
| 71 | Replace the old port | `sed` |
| 72 | Show it and save it | `tee` |
| 73 | Make a quick backup | `cp` |
| 74 | Rename the draft | `mv` |
| 75 | Backup only after success | `&&` |
| 76 | Use the home variable | `$HOME` |
| 77 | Count without typing the number | `wc -l`, pipes |
| 78 | Find the average score | `awk`, `END` |
| 79 | Keep only the repeated IDs | `sort`, `uniq -d` |
| 80 | Find the unfinished files | `find` |
| 81 | Compare two sorted lists | `comm -12` |
| 82 | Build the error report | `grep`, redirection |
| 83 | Two keys, one ranking | `sort -k2,2 -k3,3nr` |
| 84 | Pack it up | `tar -cf` |
| 85 | Peek inside | `tar -tf` |
| 86 | Unpack it somewhere else | `tar -xf -C` |
| 87 | Your first script | `echo >`, `chmod +x`, `./script` |
| 88 | Hand it an argument | `./script arg`, `$1` |
| 89 | No execute bit needed | `sh script` |
| 90 | Loop it | `for f in *.txt; do ...; done` |
| 91 | Boss: the nightly backup | scripts, `$1`, `tar`, `&&` |
| 92 | Count the logs | `find -name`, `wc -l`, pipes |
| 93 | Count the words | `wc -w` |
| 94 | Just the ending | `tail -n` |
| 95 | Skip the header | `tail -n +N` |
| 96 | Shout it | `tr a-z A-Z`, `<` |
| 97 | Strip the spaces | `tr -d` |
| 98 | Squeeze it | `tr -s` |
| 99 | Fix the extension | `mv` to rename |
| 100 | Century: the busiest visitor | `cut`, `sort`, `uniq -c`, `head` |
| 101 | Cat to dog | `sed s///g` |
| 102 | Edit in place | `sed -i` |
| 103 | Drop the comments | `grep -v`, `^` |
| 104 | Add up the costs | `awk` totals |
| 105 | Each name once | `sort -u` |
| 106 | Only the repeats | `uniq -d` |
| 107 | Glue it together | `cat` with several files, `>` |
| 108 | Add to the end | `>>` |
| 109 | What do we share | `comm -12` |
| 110 | Spot the difference | `diff` |
| 111 | Folders only | `find -type d` |
| 112 | Sweep the temp files | `find`, `xargs rm` |
| 113 | Look inside the archive | `tar -cf`, `tar -tf`, `&&` |
| 114 | Say your name | variables, `;` |
| 115 | Command inside a command | `$(command)` |
| 116 | Greeter script | scripts, `$1` |
| 117 | How many arguments | scripts, `$#` |
| 118 | Error census | `for` loops in scripts, `grep -c` |
| 119 | Who won | `sort -t -k -nr`, `head`, `cut` |
| 120 | Boss: the average | `awk` totals and `NR` |

## Supported commands

`ls` `cd` `pwd` `cat` `echo` `grep` `head` `tail` `tac` `wc` `sort` `uniq` `find` `chmod` `mkdir` `touch` `rm` `cp` `mv` `cut` `tr` `sed` `awk` `tee` `comm` `diff` `tar` `sh` `bash` `xargs` `whoami`

Plus pipes (`|`), redirects (`>` `>>` `<`), chaining (`&&` runs the next command only if the last one worked, `;` always runs it), variables (`NAME=value`, then `$NAME` or `${NAME}`, plus `$USER` and `$HOME`), quotes, and `*` / `?` globs. Single quotes keep `$` literal, double quotes expand it. `$(command)` is replaced by whatever that command prints.

`sed` handles `s/a/b/[gi]`, `Nd`, `N,Md`, `/re/d`, `$d`, `p`, `-n` and `-i`. `awk` handles `print` with `$N`, `$NF`, `NR`, `NF`, an optional condition (`$3 > 100`, `/re/`, `$2 ~ /re/`) and `-F`. It also does totals with an `END` block: `{ s += $2 } END { print s }`, counters like `n++`, `NR`, and simple math such as `s / NR`. `grep` has `-r -l -h` on top of `-i -v -c -n`; `sort` has `-t` and `-k`, including ranges (`-k2,2`), several keys (`-k1,1 -k2,2nr`) and character offsets (`-k1.2,1.4`). `tail` understands `-n +N`, and `uniq` has `-c`, `-d` and `-u`. `cut` takes `-d` and `-f` for fields, or `-c` for character positions. `comm` compares two sorted files and takes `-1`, `-2`, `-3` to hide columns. `diff` shows what changed between two files in the classic format (`2c2`, `3a4`, `5d4` with `<` and `>` lines). `tar` bundles files into one archive: `tar -cf a.tar dir`, `tar -tf a.tar` to list it, `tar -xf a.tar -C dest` to unpack (`-v` shows each file). `sh` and `bash` run script files line by line (`./script.sh` needs `+x`): `$1`, `$#` and `$@` are the arguments, `#` starts a comment, and `for f in *.txt; do ...; done` loops work inside scripts. `xargs` turns what it receives on stdin into arguments for the command after it.

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
npm start         # serve dist/ with the shellquest launcher
```

## Install on Arch Linux

ShellQuest runs on Arch (and Arch-based distros like Manjaro, EndeavourOS and CachyOS). It needs `nodejs` 18+ and `npm`. The game itself still runs in your browser; the `shellquest` command just serves it locally and opens it for you.

```bash
git clone https://github.com/iris18102006/ShellQuest.git
cd ShellQuest
./scripts/install-arch.sh
shellquest
```

The script installs `nodejs`, `npm` and `make` with `pacman` if they are missing, builds the game and installs it into `~/.local`. If `~/.local/bin` is not in your `PATH`, it tells you what to add. For a system-wide install use `./scripts/install-arch.sh --system`, and to remove it again run `./scripts/install-arch.sh --uninstall`.

### As a pacman package

A `PKGBUILD` lives in `packaging/arch/`. It builds the latest `main` and installs it under `/usr`, so `pacman` tracks the files and can remove them cleanly:

```bash
cd packaging/arch
makepkg -si
```

It adds a `shellquest` command, a desktop entry (it shows up in your app launcher) and an icon.

### The `shellquest` command

```
shellquest                 # serve on http://127.0.0.1:4173 and open the browser
shellquest --port 8080     # pick a port (if it is taken, the next free one is used)
shellquest --no-open       # do not open a browser, just print the URL
shellquest --host 0.0.0.0  # also reachable from other machines on your network
```

It serves the files in `dist/` with no extra dependencies, and binds to `127.0.0.1` unless you say otherwise.

### Troubleshooting

- **`shellquest: command not found`**: add `~/.local/bin` to your `PATH` (`export PATH="$HOME/.local/bin:$PATH"` in `~/.bashrc` or `~/.zshrc`).
- **The browser does not open**: install `xdg-utils` (`sudo pacman -S xdg-utils`), or open the printed URL yourself.
- **`no build found`**: run `make build` in the repo (the install script and the package do this for you).
- **Node is too old**: `sudo pacman -Syu nodejs npm`. The game needs Node 18 or newer.

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

Create `src/levels/l92.ts` (next number up) and add it to the list in `src/levels/index.ts`:

```ts
import type { Level } from "./types";

export const level: Level = {
  title: "Level 92: Your title",
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

- [x] Tab completion (commands and file names, Tab twice to list)
- [x] `cp`, `mv`, `cut`
- [x] `tr`, `sed`, `awk`-lite, `tee`, `grep -r`, `cp -r`
- [x] `diff`
- [x] More commands: `tar`, `sort -k` ranges
- [x] `awk` sums (`END`)
- [x] Levels on variables and `&&`
- [x] Levels on shell scripts
- [x] Per-command help (`help grep` or `grep --help`)
- [x] Shareable links to a specific level (`#level=12`, or type `share`)
- [x] Arch Linux support: install script, `PKGBUILD`, `shellquest` command, desktop entry

## License

MIT

