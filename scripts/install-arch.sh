#!/usr/bin/env bash
# Build and install ShellQuest on Arch Linux (and Arch-based distros).
#
#   ./scripts/install-arch.sh                 # per-user install into ~/.local
#   ./scripts/install-arch.sh --system        # system-wide into /usr/local (uses sudo)
#   ./scripts/install-arch.sh --uninstall     # remove what this script installed
#
# Options: --prefix DIR   install somewhere else
#          --yes          do not ask before running pacman
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

prefix="$HOME/.local"
use_sudo=""
uninstall=0
assume_yes=0

while [ $# -gt 0 ]; do
  case "$1" in
    --system)    prefix=/usr/local; use_sudo=sudo ;;
    --prefix)    shift; prefix="${1:?--prefix needs a directory}" ;;
    --uninstall) uninstall=1 ;;
    -y|--yes)    assume_yes=1 ;;
    -h|--help)   sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

say() { printf '\033[1;35m==>\033[0m %s\n' "$*"; }

if [ "$uninstall" -eq 1 ]; then
  say "Removing ShellQuest from $prefix"
  $use_sudo make uninstall PREFIX="$prefix"
  say "Done."
  exit 0
fi

if ! command -v pacman >/dev/null 2>&1; then
  echo "This script is for Arch Linux (pacman not found)." >&2
  echo "On other distros: install Node 18+, then run 'make build && make install PREFIX=$prefix'." >&2
  exit 1
fi

node_ok() {
  command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 \
    && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]
}

if ! node_ok; then
  say "Installing nodejs and npm with pacman"
  flags=(--needed)
  [ "$assume_yes" -eq 1 ] && flags+=(--noconfirm)
  sudo pacman -S "${flags[@]}" nodejs npm
fi

if ! command -v make >/dev/null 2>&1; then
  say "Installing make with pacman"
  flags=(--needed)
  [ "$assume_yes" -eq 1 ] && flags+=(--noconfirm)
  sudo pacman -S "${flags[@]}" make
fi

say "Installing dependencies and building"
make build

say "Installing to $prefix"
$use_sudo make install PREFIX="$prefix"

case ":$PATH:" in
  *":$prefix/bin:"*) ;;
  *) echo "Note: $prefix/bin is not in your PATH. Add this to your shell profile:"
     echo "  export PATH=\"$prefix/bin:\$PATH\"" ;;
esac

say "Done. Run: shellquest"
