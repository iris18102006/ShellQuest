# Install ShellQuest (the built game plus the `shellquest` launcher).
#   make build
#   sudo make install                      # to /usr/local
#   make install PREFIX=$HOME/.local       # per-user, no root
#   make install DESTDIR=pkg PREFIX=/usr   # for packaging (used by the PKGBUILD)

PREFIX  ?= /usr/local
DESTDIR ?=

libdir  = $(DESTDIR)$(PREFIX)/lib/shellquest
bindir  = $(DESTDIR)$(PREFIX)/bin
appdir  = $(DESTDIR)$(PREFIX)/share/applications
icondir = $(DESTDIR)$(PREFIX)/share/icons/hicolor/scalable/apps
licdir  = $(DESTDIR)$(PREFIX)/share/licenses/shellquest

.PHONY: all build test install uninstall clean

all: build

node_modules: package-lock.json
	npm ci
	@touch node_modules

build: node_modules
	npm run build

test: node_modules
	npm test

install:
	@test -f dist/index.html || { echo "dist/ is missing: run 'make build' first"; exit 1; }
	install -d "$(libdir)/bin" "$(bindir)" "$(appdir)" "$(icondir)" "$(licdir)"
	cp -r dist "$(libdir)/dist"
	install -m755 bin/shellquest.mjs "$(libdir)/bin/shellquest.mjs"
	install -m644 bin/server.mjs "$(libdir)/bin/server.mjs"
	install -m644 package.json "$(libdir)/package.json"
	ln -sf ../lib/shellquest/bin/shellquest.mjs "$(bindir)/shellquest"
	install -m644 packaging/shellquest.desktop "$(appdir)/shellquest.desktop"
	install -m644 packaging/assets/shellquest.svg "$(icondir)/shellquest.svg"
	install -m644 LICENSE "$(licdir)/LICENSE"

uninstall:
	rm -rf "$(libdir)" "$(licdir)"
	rm -f "$(bindir)/shellquest" "$(appdir)/shellquest.desktop" "$(icondir)/shellquest.svg"

clean:
	rm -rf dist
