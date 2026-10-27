import { api } from "../api.js";
import { MOODS, avatar, confirmBox, h, toast } from "../dom.js";
import { emit, refreshMe, state } from "../state.js";
import {
  BOX_STYLE_LABELS, DEFAULT_THEME, FONT_LABELS, PATTERN_LABELS, PRESETS, TRAIL_LABELS,
  applyTheme, startTrail, stopTrail,
} from "../theme.js";
import { profileDom } from "./profile.js";

const SAMPLE_COMMENTS = [
  { id: 1, username: "dj_nightowl", display_name: "DJ NightOwl", avatar_v: 0, created_at: new Date(Date.now() - 3600e3).toISOString(), body: "omg love the new layout!! ♥ add me back" },
  { id: 2, username: "bestie4ever", display_name: "bestie", avatar_v: 0, created_at: new Date(Date.now() - 86400e3).toISOString(), body: "ur page is sooo cool, how did u do the sparkles??" },
];

const COLOR_FIELDS = [
  ["page_bg", "Page background"], ["pattern_color", "Pattern color"], ["box_bg", "Box background"],
  ["box_border", "Box outline"], ["head_bg", "Box title bar"], ["head_text", "Box title text"],
  ["text", "Text"], ["link", "Links"], ["name_color", "Your name"],
];

export async function render(root, _params, ctx) {
  const me = state.me.username;
  const p = await api(`/api/profile/${me}?count_view=0`);

  const form = {
    display_name: p.display_name, tagline: p.tagline, location: p.location, mood: p.mood,
    now_playing: p.now_playing, about: p.about, meet: p.meet, interests: p.interests,
    theme: { ...DEFAULT_THEME, ...p.theme }, avatar_v: p.avatar_v,
  };
  let top = p.top_friends.map((f) => f.username);
  let dirty = false;

  // ---------- live preview ----------
  const previewHost = h("div", { class: "preview-scroll" });
  let queued = false;
  function redraw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const info = (u) => state.friends.find((f) => f.username === u);
      const profile = {
        username: me, display_name: form.display_name.trim() || me, tagline: form.tagline, location: form.location,
        mood: form.mood, now_playing: form.now_playing, about: form.about, meet: form.meet, interests: form.interests,
        theme: form.theme, top_friends: top.map(info).filter(Boolean), friend_count: state.friends.length,
        avatar_v: form.avatar_v, views: p.views, member_since: p.member_since, rel: "self", online: true, last_seen: null,
      };
      previewHost.replaceChildren(profileDom(profile, { preview: true, comments: SAMPLE_COMMENTS, posts: [], viewer: me }));
      startTrail(form.theme.trail);
    });
  }
  const touch = () => {
    dirty = true;
    status.textContent = "● unsaved changes";
    redraw();
  };

  // ---------- form helpers ----------
  const field = (label, input, hint) =>
    h("label", { class: "fld" }, h("span", { class: "fld-label" }, label), input, hint ? h("small", { class: "hint" }, hint) : null);

  const textInput = (key, max, extra = {}) =>
    h("input", { type: "text", maxLength: max, value: form[key], oninput: (e) => { form[key] = e.target.value; touch(); }, ...extra });

  const area = (key, max) =>
    h("textarea", { rows: 4, maxLength: max, value: form[key], oninput: (e) => { form[key] = e.target.value; touch(); } });

  function select(options, current, onchange) {
    const el = h("select", { onchange: (e) => onchange(e.target.value) },
      Object.entries(options).map(([value, label]) => h("option", { value }, label)));
    el.value = current;
    return el;
  }

  const setTheme = (key, value) => {
    form.theme[key] = value;
    form.theme.preset = "custom";
    touch();
  };

  const section = (n, title, ...body) =>
    h("fieldset", { class: "cz-section" }, h("legend", {}, h("span", { class: "step" }, n), " ", title), body);

  // ---------- 1. picture ----------
  const picHost = h("div", { class: "pic-row" });
  const drawPic = () =>
    picHost.replaceChildren(
      avatar(me, form.avatar_v, "ava lg"),
      h("div", { class: "pic-actions" },
        h("label", { class: "xp-btn" }, "Upload picture…", h("input", { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp", class: "sr-only", onchange: (e) => pickPicture(e.target.files[0]) })),
        h("button", { class: "xp-btn", type: "button", disabled: !form.avatar_v, onclick: removePicture }, "Remove"),
        h("small", { class: "hint" }, "Any picture works, we shrink it to a square.")));

  async function pickPicture(file) {
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const size = 256, side = Math.min(bmp.width, bmp.height);
      const canvas = h("canvas", { width: size, height: size });
      canvas.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
      const r = await api("/api/profile/avatar", { method: "PUT", body: { data_url: canvas.toDataURL("image/jpeg", 0.88) } });
      form.avatar_v = r.avatar_v;
      state.me.avatar_v = r.avatar_v;
      emit("me");
      drawPic();
      redraw();
      toast("New picture saved!", { kind: "ok" });
    } catch (e) {
      toast(e.status ? e.message : "couldn't read that picture, try a jpg or png", { kind: "error" });
    }
  }

  async function removePicture() {
    await api("/api/profile/avatar", { method: "DELETE" });
    form.avatar_v = 0;
    state.me.avatar_v = 0;
    emit("me");
    drawPic();
    redraw();
  }

  // ---------- 3-6. look & feel (rebuilt when a preset is picked) ----------
  const lookHost = h("div");
  function drawLook() {
    const t = form.theme;
    const presets = h("div", { class: "presets" },
      Object.entries(PRESETS).map(([key, pr]) => {
        const sw = h("button", { type: "button", class: "preset" + (t.preset === key ? " picked" : ""), title: pr.label,
          onclick: () => { form.theme = { ...pr.theme, preset: key }; touch(); drawLook(); } },
          h("span", { class: "preset-box" }, h("i", {}), h("b", {})), h("span", { class: "preset-name" }, pr.label));
        applyTheme(sw.firstChild, pr.theme);
        return sw;
      }));

    const colors = h("div", { class: "colors" },
      COLOR_FIELDS.map(([key, label]) =>
        h("label", { class: "color-fld" }, h("input", { type: "color", value: t[key], oninput: (e) => setTheme(key, e.target.value) }), h("span", {}, label))));

    const range = (key, min, max, label, fmt) => {
      const out = h("output", {}, fmt(t[key]));
      const input = h("input", { type: "range", min, max, step: 1, value: t[key], oninput: (e) => { out.textContent = fmt(+e.target.value); setTheme(key, +e.target.value); } });
      return field(label, h("span", { class: "range-row" }, input, out));
    };

    lookHost.replaceChildren(
      section("3", "Pick a theme", h("p", { class: "hint" }, "Start with one of these, then tweak anything below. Nothing is saved until you hit Save."), presets),
      section("4", "Colors", colors),
      section("5", "Style",
        h("div", { class: "grid2" },
          field("Background pattern", select(PATTERN_LABELS, t.pattern, (v) => setTheme("pattern", v))),
          field("Font", select(FONT_LABELS, t.font, (v) => setTheme("font", v))),
          field("Box outline", select(BOX_STYLE_LABELS, t.box_style, (v) => setTheme("box_style", v))),
          field("Box corners", select({ square: "Square", rounded: "Rounded" }, t.corners, (v) => setTheme("corners", v))),
          range("box_opacity", 40, 100, "Box see-through-ness", (v) => `${v}% solid`),
          range("font_size", 10, 16, "Text size", (v) => `${v}px`))),
      section("6", "Glitter & extras",
        h("label", { class: "check" }, h("input", { type: "checkbox", checked: t.glitter, onchange: (e) => setTheme("glitter", e.target.checked) }), " Glitter name ✨"),
        field("Cursor trail (follows your mouse on your page)", select(TRAIL_LABELS, t.trail, (v) => setTheme("trail", v))),
        h("label", { class: "check" }, h("input", { type: "checkbox", checked: t.marquee_on, onchange: (e) => setTheme("marquee_on", e.target.checked) }), " Scrolling banner at the top"),
        field("Banner text", h("input", { type: "text", maxLength: 120, value: t.marquee_text, placeholder: "♥ welcome to my page ♥", oninput: (e) => setTheme("marquee_text", e.target.value) })))
    );
  }

  // ---------- 7. top 8 ----------
  const topHost = h("div");
  function drawTop() {
    const info = (u) => state.friends.find((f) => f.username === u);
    top = top.filter((u) => info(u));
    const move = (i, d) => { [top[i], top[i + d]] = [top[i + d], top[i]]; touch(); drawTop(); };
    const rows = top.map((u, i) =>
      h("li", { class: "top-row" },
        h("span", { class: "rank" }, `${i + 1}.`), avatar(u, info(u).avatar_v, "ava sm"), h("span", { class: "pname" }, info(u).display_name),
        h("span", { class: "spacer" }),
        h("button", { class: "xp-btn small", type: "button", disabled: i === 0, "aria-label": "Move up", onclick: () => move(i, -1) }, "▲"),
        h("button", { class: "xp-btn small", type: "button", disabled: i === top.length - 1, "aria-label": "Move down", onclick: () => move(i, 1) }, "▼"),
        h("button", { class: "xp-btn small", type: "button", "aria-label": "Remove from top friends", onclick: () => { top.splice(i, 1); touch(); drawTop(); } }, "✕")));
    const rest = state.friends.filter((f) => !top.includes(f.username));
    const add = h("select", { "aria-label": "Add a friend to your top 8", onchange: (e) => { if (e.target.value) { top.push(e.target.value); touch(); drawTop(); } } },
      h("option", { value: "" }, rest.length ? "Add a friend…" : "(all your friends are in)"), rest.map((f) => h("option", { value: f.username }, f.display_name)));
    add.disabled = !rest.length || top.length >= 8;
    topHost.replaceChildren(
      ...[state.friends.length ? null : h("p", { class: "hint" }, "Add some friends first, then you can rank them here."),
        h("ol", { class: "top-list" }, rows), add].filter(Boolean));
  }

  // ---------- assemble ----------
  const status = h("span", { class: "save-status", role: "status" }, "");
  const saveBtn = h("button", { class: "xp-btn primary", type: "button", onclick: save }, "💾 Save my page");

  async function save() {
    saveBtn.disabled = true;
    try {
      await api("/api/profile", { method: "PUT", body: {
        display_name: form.display_name, tagline: form.tagline, location: form.location, mood: form.mood,
        now_playing: form.now_playing, about: form.about, meet: form.meet, interests: form.interests,
        theme: form.theme, top_friends: top,
      } });
      dirty = false;
      status.textContent = "✓ saved!";
      await refreshMe();
      toast("Your page is saved! ✨", { kind: "ok" });
    } catch (e) {
      toast(e.message, { kind: "error" });
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function reset() {
    if (!(await confirmBox("Reset look", "Go back to the plain Classic Blue look? (Your words and pictures stay.)", "Reset"))) return;
    form.theme = { ...DEFAULT_THEME };
    touch();
    drawLook();
  }

  const moodSelect = h("select", { onchange: (e) => { form.mood = e.target.value; touch(); } },
    h("option", { value: "" }, "(no mood)"), MOODS.map((m) => h("option", { value: m }, m)));
  moodSelect.value = MOODS.includes(form.mood) ? form.mood : "";

  const panel = h("div", { class: "cz-panel" },
    h("h2", { class: "cz-title" }, "Customize my page"),
    h("p", { class: "hint" }, "No code needed. Change something and watch the preview on the right."),
    section("1", "Your picture", picHost),
    section("2", "About you",
      h("div", { class: "grid2" },
        field("Display name", textInput("display_name", 24), "This is what your friends see"),
        field("Location", textInput("location", 40)),
        field("Mood", moodSelect),
        field("Now playing", textInput("now_playing", 80, { placeholder: "song – artist" }))),
      field("Tagline", textInput("tagline", 80, { placeholder: "a short line under your name" })),
      field("About me", area("about", 2000)),
      field("Who I'd like to meet", area("meet", 2000)),
      field("Interests", area("interests", 2000))),
    lookHost,
    section("7", "My top 8 friends", topHost),
    h("div", { class: "cz-bar" }, saveBtn, h("button", { class: "xp-btn", type: "button", onclick: reset }, "Reset look"), h("a", { class: "xp-btn", href: "#/u/me" }, "View my page"), status));

  root.append(h("div", { class: "cz-layout" }, panel, h("aside", { class: "cz-preview" }, h("div", { class: "preview-label" }, "Live preview"), previewHost)));
  drawPic();
  drawLook();
  drawTop();
  redraw();

  ctx.cleanup(stopTrail);
  ctx.guard = () => !dirty || confirm("You have unsaved changes. Leave without saving?");
  const warn = (e) => dirty && (e.preventDefault(), (e.returnValue = ""));
  window.addEventListener("beforeunload", warn);
  ctx.cleanup(() => window.removeEventListener("beforeunload", warn));
}
