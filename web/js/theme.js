// Profile looks. People choose options in a form; nobody writes CSS.
// The server keeps only whitelisted values (backend/theme.py), this file turns them into styles.

export const FONT_STACKS = {
  verdana: "Verdana, Geneva, sans-serif",
  tahoma: "Tahoma, Geneva, sans-serif",
  comic: "'Comic Sans MS', 'Comic Neue', cursive",
  trebuchet: "'Trebuchet MS', Helvetica, sans-serif",
  times: "'Times New Roman', Times, serif",
  georgia: "Georgia, 'Times New Roman', serif",
  courier: "'Courier New', Courier, monospace",
  lucida: "'Lucida Console', Monaco, monospace",
  impact: "Impact, 'Arial Narrow Bold', sans-serif",
};

export const FONT_LABELS = {
  verdana: "Verdana (classic)", tahoma: "Tahoma", comic: "Comic Sans (yes really)", trebuchet: "Trebuchet",
  times: "Times New Roman", georgia: "Georgia", courier: "Courier (hacker)", lucida: "Lucida Console", impact: "Impact (LOUD)",
};

export const PATTERN_LABELS = {
  none: "Plain color", dots: "Polka dots", checks: "Checkerboard", stripes: "Diagonal stripes", grid: "Graph paper",
  stars: "Stars", hearts: "Hearts", skulls: "Skulls", notes: "Music notes",
};

export const TRAIL_LABELS = {
  none: "None", sparkles: "Sparkles ✨", hearts: "Hearts 💖", stars: "Stars ★", skulls: "Skulls 💀",
  flowers: "Flowers 🌸", bats: "Bats 🦇", music: "Music notes ♪", snow: "Snow ❄",
};

export const BOX_STYLE_LABELS = { solid: "Solid", dashed: "Dashed", dotted: "Dotted", double: "Double line", ridge: "3D ridge" };

export const DEFAULT_THEME = {
  preset: "classic-blue", page_bg: "#6f9bd1", pattern: "none", pattern_color: "#ffffff",
  box_bg: "#ffffff", box_opacity: 100, box_border: "#17407f", box_style: "solid", corners: "square",
  head_bg: "#17407f", head_text: "#ffffff", text: "#111111", link: "#17407f", name_color: "#ff6600",
  font: "verdana", font_size: 12, glitter: false, trail: "none", marquee_on: false, marquee_text: "",
};

const P = (label, over) => ({ label, theme: { ...DEFAULT_THEME, ...over } });

export const PRESETS = {
  "classic-blue": P("Classic Blue", {}),
  "gothic-rose": P("Gothic Rose", {
    page_bg: "#0a0a0a", pattern: "skulls", pattern_color: "#2a0a0e", box_bg: "#130c0d", box_opacity: 92,
    box_border: "#8b0000", box_style: "ridge", head_bg: "#8b0000", head_text: "#ffd9dc", text: "#d9cfcf",
    link: "#ff4d5e", name_color: "#c1121f", font: "georgia", trail: "bats",
  }),
  "hot-pink": P("Hot Pink Glitter", {
    page_bg: "#ff8fc7", pattern: "hearts", pattern_color: "#ffc2e2", box_bg: "#fff0f7", box_border: "#ff1493",
    box_style: "dotted", corners: "rounded", head_bg: "#ff1493", text: "#5a0033", link: "#d4006e",
    name_color: "#ff1493", font: "comic", glitter: true, trail: "hearts", marquee_on: true, marquee_text: "♥ welcome to my page!! comment me ♥",
  }),
  "emo-night": P("Emo Night", {
    page_bg: "#14121f", pattern: "stripes", pattern_color: "#1d1a30", box_bg: "#1d1a2e", box_opacity: 90,
    box_border: "#7b5cff", box_style: "dashed", head_bg: "#4b3bb5", text: "#e6e1ff", link: "#b39cff",
    name_color: "#ff4fa3", font: "tahoma", trail: "stars",
  }),
  matrix: P("Hacker Green", {
    page_bg: "#000000", pattern: "grid", pattern_color: "#00280c", box_bg: "#020a04", box_border: "#00ff41",
    head_bg: "#003b12", head_text: "#00ff41", text: "#00ff41", link: "#7dffa0", name_color: "#00ff41",
    font: "courier", trail: "snow",
  }),
  "y2k-chrome": P("Y2K Chrome", {
    page_bg: "#c0c8d8", pattern: "dots", pattern_color: "#ffffff", box_bg: "#eef2fa", box_border: "#7f8fa9",
    box_style: "ridge", corners: "rounded", head_bg: "#5b6b8c", text: "#1c2340", link: "#2b4fd8",
    name_color: "#2b4fd8", font: "trebuchet", glitter: true, trail: "sparkles",
  }),
  "pastel-skater": P("Pastel Skater", {
    page_bg: "#ffe9a8", pattern: "checks", pattern_color: "#fff3c9", box_bg: "#fffdf2", box_border: "#ff8a5b",
    box_style: "dashed", head_bg: "#ff8a5b", text: "#4a3b2a", link: "#e4572e", name_color: "#e4572e",
    font: "comic", trail: "flowers",
  }),
  "scene-kid": P("Scene Kid", {
    page_bg: "#101010", pattern: "checks", pattern_color: "#1b1b1b", box_bg: "#1c1c1c", box_opacity: 90,
    box_border: "#39ff14", box_style: "dashed", head_bg: "#ff2e97", text: "#f2f2f2", link: "#39ff14",
    name_color: "#39ff14", font: "verdana", glitter: true, trail: "stars", marquee_on: true, marquee_text: "★ SCENE QUEEN ★ rawr means i love you in dinosaur ★",
  }),
  "starry-night": P("Starry Night", {
    page_bg: "#0b1033", pattern: "stars", pattern_color: "#8fa8ff", box_bg: "#121a4d", box_opacity: 85,
    box_border: "#6fb1ff", box_style: "double", corners: "rounded", head_bg: "#2c3fa8", text: "#e8efff",
    link: "#9cc8ff", name_color: "#ffd166", font: "georgia", trail: "sparkles",
  }),
  mixtape: P("Mixtape", {
    page_bg: "#2d2a32", pattern: "notes", pattern_color: "#46414f", box_bg: "#3a3641", box_border: "#f4a261",
    head_bg: "#e76f51", text: "#f1e9da", link: "#f4a261", name_color: "#f4a261", font: "courier", trail: "music",
  }),
};

// ---------- applying a theme ----------

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(",")},${a})`;

function glyphTile(glyph, color) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'>` +
    `<text x='6' y='24' font-size='20' fill='${color}'>${glyph}</text>` +
    `<text x='33' y='50' font-size='13' fill='${color}'>${glyph}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function patternStyle(pattern, c) {
  switch (pattern) {
    case "dots":
      return [`radial-gradient(circle, ${c} 2px, transparent 2.5px)`, "16px 16px"];
    case "checks":
      return [`conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0)`, "28px 28px"];
    case "stripes":
      return [`repeating-linear-gradient(45deg, ${c} 0 7px, transparent 7px 16px)`, "auto"];
    case "grid":
      return [`linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, "22px 22px"];
    case "stars":
      return [glyphTile("★", c), "56px 56px"];
    case "hearts":
      return [glyphTile("♥", c), "56px 56px"];
    case "skulls":
      return [glyphTile("☠", c), "56px 56px"];
    case "notes":
      return [glyphTile("♪", c), "56px 56px"];
    default:
      return ["none", "auto"];
  }
}

export function applyTheme(el, t) {
  const set = (k, v) => el.style.setProperty(k, v);
  const [image, size] = patternStyle(t.pattern, t.pattern_color);
  set("--pg-bg", t.page_bg);
  set("--pg-image", image);
  set("--pg-size", size);
  set("--box-bg", rgba(t.box_bg, t.box_opacity / 100));
  set("--box-border", t.box_border);
  set("--box-style", t.box_style);
  set("--box-width", t.box_style === "double" || t.box_style === "ridge" ? "4px" : t.box_style === "solid" ? "1px" : "2px");
  set("--box-radius", t.corners === "rounded" ? "12px" : "0");
  set("--head-bg", t.head_bg);
  set("--head-text", t.head_text);
  set("--text", t.text);
  set("--link", t.link);
  set("--name-color", t.name_color);
  set("--pf-font", FONT_STACKS[t.font] || FONT_STACKS.verdana);
  set("--pf-size", `${t.font_size}px`);
  el.classList.toggle("glitter-on", !!t.glitter);
}

// ---------- cursor trails ----------

const TRAILS = {
  sparkles: ["✨", "⭐", "✦", "✧"], hearts: ["💖", "💗", "💕", "♥"], stars: ["★", "☆", "✶", "✦"],
  skulls: ["💀", "☠", "🖤"], flowers: ["🌸", "🌼", "🌺", "🌷"], bats: ["🦇", "🖤", "🦇"],
  music: ["♪", "♫", "🎵", "♬"], snow: ["❄", "❅", "❆", "·"],
};

let stopCurrent = null;

export function startTrail(kind) {
  stopTrail();
  const glyphs = TRAILS[kind];
  if (!glyphs || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let lx = -100, ly = -100;
  const onMove = (e) => {
    if (Math.hypot(e.clientX - lx, e.clientY - ly) < 18) return;
    lx = e.clientX;
    ly = e.clientY;
    const s = document.createElement("span");
    s.className = "trail-bit";
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = `${e.clientX}px`;
    s.style.top = `${e.clientY}px`;
    s.style.setProperty("--dx", `${Math.round(Math.random() * 40 - 20)}px`);
    document.body.append(s);
    setTimeout(() => s.remove(), 900);
  };
  document.addEventListener("pointermove", onMove);
  stopCurrent = () => document.removeEventListener("pointermove", onMove);
}

export function stopTrail() {
  if (stopCurrent) stopCurrent();
  stopCurrent = null;
}
