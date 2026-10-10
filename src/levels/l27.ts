import type { Level } from "./types";

export const level: Level = {
  title: "Level 27: Dotfile detective",
  story: "Your dotfiles folder is a mess. List every hidden FILE inside it (names starting with a dot), including ones in subfolders. Hidden folders don't count.",
  hint: "find dotfiles -name \".*\" -type f",
  files: {
    "/home/user/dotfiles/.bashrc": "alias ll='ls -la'\n",
    "/home/user/dotfiles/.gitconfig": "[user]\n",
    "/home/user/dotfiles/.vimrc": "set number\n",
    "/home/user/dotfiles/README.md": "my dotfiles\n",
    "/home/user/dotfiles/.config/starship.toml": "add_newline = false\n",
    "/home/user/dotfiles/.config/.keep": "",
  },
  solution: ['find dotfiles -name ".*"', 'find dotfiles -name ".*" -type f'],
  check: (a) => {
    const names = a.output.trim().split("\n").map((l) => l.split("/").pop()).sort();
    return /find/.test(a.command) && JSON.stringify(names) === JSON.stringify([".bashrc", ".gitconfig", ".keep", ".vimrc"]);
  },
};
