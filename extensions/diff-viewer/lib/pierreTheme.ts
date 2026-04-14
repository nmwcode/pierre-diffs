import type { Theme } from "@mariozechner/pi-coding-agent";
import type { PierreAppearance } from "../types.js";

type PaletteInput = { colors?: Record<string, string>; fg?: string; bg?: string };

export interface PierreTerminalPalette {
  appearance: PierreAppearance;
  editorBg: string;
  titleBg: string;
  titleFg: string;
  titleAccentFg: string;
  contextFg: string;
  contextRowBg: string;
  additionFg: string;
  additionRowBg: string;
  deletionFg: string;
  deletionRowBg: string;
  lineNumberFg: string;
  metadataFg: string;
  metadataBg: string;
  pendingFg: string;
  pendingBg: string;
  successFg: string;
  successBg: string;
  errorFg: string;
  errorBg: string;
}

const GRUVBOX_DARK: PaletteInput = {
  bg: "#1d2021",
  fg: "#ebdbb2",
  colors: {
    "sideBar.background": "#1d2021",
    "sideBar.foreground": "#a89984",
    "textLink.foreground": "#d3869b",
    "gitDecoration.modifiedResourceForeground": "#fe8019",
    "terminal.foreground": "#a89984",
    "terminal.ansiGreen": "#b8bb26",
    "terminal.ansiRed": "#fb4934",
    "gitDecoration.addedResourceForeground": "#b8bb26",
    "gitDecoration.deletedResourceForeground": "#fb4934",
    "diffEditor.insertedTextBackground": "#b8bb261a",
    "diffEditor.deletedTextBackground": "#fb49341a",
    "editorLineNumber.foreground": "#665c54",
  },
};

const GRUVBOX_LIGHT: PaletteInput = {
  bg: "#fbf1c7",
  fg: "#3c3836",
  colors: {
    "sideBar.background": "#fbf1c7",
    "sideBar.foreground": "#504945",
    "textLink.foreground": "#8f3f71",
    "gitDecoration.modifiedResourceForeground": "#af3a03",
    "terminal.foreground": "#504945",
    "terminal.ansiGreen": "#79740e",
    "terminal.ansiRed": "#9d0006",
    "gitDecoration.addedResourceForeground": "#79740e",
    "gitDecoration.deletedResourceForeground": "#9d0006",
    "diffEditor.insertedTextBackground": "#79740e1a",
    "diffEditor.deletedTextBackground": "#9d00061a",
    "editorLineNumber.foreground": "#928374",
  },
};

const PALETTES: Record<PierreAppearance, PierreTerminalPalette> = {
  dark: buildPalette("dark", GRUVBOX_DARK),
  light: buildPalette("light", GRUVBOX_LIGHT),
};

export function getPierreAppearance(theme: Theme): PierreAppearance {
  return theme.name?.toLowerCase().includes("light") ? "light" : "dark";
}

export function getPierrePalette(theme: Theme): PierreTerminalPalette {
  return PALETTES[getPierreAppearance(theme)];
}

function buildPalette(
  appearance: PierreAppearance,
  resolved: { colors?: Record<string, string>; fg?: string; bg?: string },
): PierreTerminalPalette {
  const colors = resolved.colors ?? {};
  const editorBg = resolved.bg ?? fallback(appearance, "#070707", "#ffffff");
  const additionFg = colors["gitDecoration.addedResourceForeground"] ?? colors["terminal.ansiGreen"] ?? "#00cab1";
  const deletionFg = colors["gitDecoration.deletedResourceForeground"] ?? colors["terminal.ansiRed"] ?? "#ff2e3f";
  return {
    appearance,
    editorBg,
    titleBg: colors["sideBar.background"] ?? colors["panel.background"] ?? editorBg,
    titleFg: colors["sideBar.foreground"] ?? colors.foreground ?? resolved.fg ?? fallback(appearance, "#fbfbfb", "#070707"),
    titleAccentFg:
      colors["textLink.foreground"] ??
      colors["gitDecoration.modifiedResourceForeground"] ??
      colors.foreground ??
      resolved.fg ??
      fallback(appearance, "#009fff", "#0062cc"),
    contextFg: colors["terminal.foreground"] ?? resolved.fg ?? fallback(appearance, "#adadb1", "#6C6C71"),
    contextRowBg: editorBg,
    additionFg,
    additionRowBg: compositeOverBg(colors["diffEditor.insertedTextBackground"], editorBg) ?? fallback(appearance, "#0c1f1d", "#e6fbf8"),
    deletionFg,
    deletionRowBg: compositeOverBg(colors["diffEditor.deletedTextBackground"], editorBg) ?? fallback(appearance, "#261214", "#ffe9eb"),
    lineNumberFg: colors["editorLineNumber.foreground"] ?? colors["terminal.foreground"] ?? fallback(appearance, "#84848A", "#909095"),
    metadataFg: colors["editorLineNumber.foreground"] ?? colors["terminal.foreground"] ?? fallback(appearance, "#84848A", "#909095"),
    metadataBg: editorBg,
    pendingFg: colors["textLink.foreground"] ?? colors.foreground ?? fallback(appearance, "#009fff", "#0062cc"),
    pendingBg: editorBg,
    successFg: additionFg,
    successBg: compositeOverBg(colors["diffEditor.insertedTextBackground"], editorBg) ?? fallback(appearance, "#0c1f1d", "#e6fbf8"),
    errorFg: deletionFg,
    errorBg: compositeOverBg(colors["diffEditor.deletedTextBackground"], editorBg) ?? fallback(appearance, "#261214", "#ffe9eb"),
  };
}

function compositeOverBg(foreground: string | undefined, background: string | undefined) {
  const fg = toRgbWithAlpha(foreground);
  const bg = toRgb(background);
  if (!fg || !bg) {
    return undefined;
  }

  const alpha = fg.a / 255;
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
  return toHex({ r, g, b });
}

function toRgbWithAlpha(hex: string | undefined) {
  const normalized = hex?.trim();
  if (!normalized || !/^#[0-9a-fA-F]{8}$/.test(normalized)) {
    const rgb = toRgb(normalized);
    return rgb ? { ...rgb, a: 255 } : undefined;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
    a: Number.parseInt(normalized.slice(7, 9), 16),
  };
}

function toRgb(hex: string | undefined) {
  const normalized = hex?.trim();
  if (!normalized || !/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return undefined;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function toHex(rgb: { r: number; g: number; b: number }) {
  return `#${toHexPart(rgb.r)}${toHexPart(rgb.g)}${toHexPart(rgb.b)}`;
}

function toHexPart(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

function fallback(appearance: PierreAppearance, dark: string, light: string) {
  return appearance === "dark" ? dark : light;
}
