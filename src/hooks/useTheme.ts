import { useState, useEffect, useCallback } from "react";

export interface ThemeConfig {
  sidebarBg: string;
  sidebarText: string;
  sidebarActive: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  success: string;
  warning: string;
  inputBorder: string;
  inputRequiredBorder: string;
}

export interface TypographyConfig {
  fontFamily: string;
  fontSize: string;
  spacing: string;
}

export interface DarkScheduleConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

// Map font family to Google Fonts name for dynamic loading
const googleFontsMap: Record<string, string> = {
  "'Space Grotesk', system-ui, sans-serif": "Space+Grotesk:wght@300;400;500;600;700",
  "'Inter', system-ui, sans-serif": "Inter:wght@300;400;500;600;700",
  "'Roboto', system-ui, sans-serif": "Roboto:wght@300;400;500;700",
  "'Open Sans', system-ui, sans-serif": "Open+Sans:wght@300;400;500;600;700",
  "'Lato', system-ui, sans-serif": "Lato:wght@300;400;700",
  "'Poppins', system-ui, sans-serif": "Poppins:wght@300;400;500;600;700",
  "'Nunito', system-ui, sans-serif": "Nunito:wght@300;400;500;600;700",
};

const loadedFonts = new Set<string>();

function loadGoogleFont(fontFamily: string) {
  const googleFont = googleFontsMap[fontFamily];
  if (!googleFont || loadedFonts.has(googleFont)) return;
  loadedFonts.add(googleFont);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`;
  document.head.appendChild(link);
}

export const fontOptions = [
  { label: "Space Grotesk (Padrão)", value: "'Space Grotesk', system-ui, sans-serif" },
  { label: "Inter", value: "'Inter', system-ui, sans-serif" },
  { label: "Roboto", value: "'Roboto', system-ui, sans-serif" },
  { label: "Open Sans", value: "'Open Sans', system-ui, sans-serif" },
  { label: "Lato", value: "'Lato', system-ui, sans-serif" },
  { label: "Poppins", value: "'Poppins', system-ui, sans-serif" },
  { label: "Nunito", value: "'Nunito', system-ui, sans-serif" },
  { label: "Sistema", value: "system-ui, -apple-system, sans-serif" },
];

export const fontSizeOptions = [
  { label: "Pequeno", value: "14px" },
  { label: "Normal (Padrão)", value: "16px" },
  { label: "Grande", value: "18px" },
  { label: "Extra Grande", value: "20px" },
];

export const spacingOptions = [
  { label: "Compacto", value: "compact" },
  { label: "Normal (Padrão)", value: "normal" },
  { label: "Confortável", value: "comfortable" },
  { label: "Espaçoso", value: "spacious" },
];

export const defaultTheme: ThemeConfig = {
  sidebarBg: "222 30% 10%",
  sidebarText: "220 18% 78%",
  sidebarActive: "212 55% 52%",
  primary: "212 55% 48%",
  primaryForeground: "0 0% 100%",
  accent: "198 55% 45%",
  accentForeground: "0 0% 100%",
  background: "220 20% 97%",
  foreground: "222 25% 10%",
  card: "0 0% 100%",
  border: "220 13% 89%",
  muted: "220 14% 94%",
  mutedForeground: "220 10% 46%",
  destructive: "0 84% 60%",
  success: "160 60% 42%",
  warning: "38 92% 50%",
  inputBorder: "220 13% 89%",
  inputRequiredBorder: "0 84% 60%",
};

export const defaultTypography: TypographyConfig = {
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: "16px",
  spacing: "normal",
};

export const defaultSchedule: DarkScheduleConfig = {
  enabled: false,
  startHour: 18,
  endHour: 6,
};

export const presetPalettes: { name: string; description: string; theme: Partial<ThemeConfig> }[] = [
  {
    name: "Profissional e Sereno",
    description: "Azul Marinho + Branco + Cinza Claro",
    theme: {
      primary: "217 91% 30%",
      sidebarBg: "217 50% 15%",
      sidebarActive: "217 80% 55%",
      accent: "217 60% 45%",
      background: "0 0% 98%",
      card: "0 0% 100%",
    },
  },
  {
    name: "Moderno e Criativo",
    description: "Roxo + Rosa Claro + Fundo Claro",
    theme: {
      primary: "270 70% 50%",
      sidebarBg: "270 40% 15%",
      sidebarActive: "270 70% 60%",
      accent: "330 70% 55%",
      background: "280 20% 97%",
      card: "0 0% 100%",
    },
  },
  {
    name: "Alto Contraste",
    description: "Preto + Branco + Amarelo",
    theme: {
      primary: "45 100% 50%",
      primaryForeground: "0 0% 0%",
      sidebarBg: "0 0% 8%",
      sidebarActive: "45 100% 50%",
      accent: "45 100% 50%",
      accentForeground: "0 0% 0%",
      background: "0 0% 100%",
      foreground: "0 0% 5%",
      card: "0 0% 100%",
    },
  },
  {
    name: "Modo Escuro",
    description: "Dark mode — azul aço moderno",
    theme: {
      sidebarBg: "222 35% 5%",
      sidebarText: "220 18% 72%",
      sidebarActive: "212 55% 58%",
      primary: "212 55% 55%",
      primaryForeground: "0 0% 100%",
      accent: "198 55% 50%",
      accentForeground: "0 0% 100%",
      background: "222 30% 7%",
      foreground: "220 18% 92%",
      card: "222 28% 11%",
      border: "222 22% 18%",
      muted: "222 22% 14%",
      mutedForeground: "220 12% 55%",
      destructive: "0 62% 30%",
      success: "160 60% 42%",
      warning: "38 92% 50%",
      inputBorder: "222 22% 18%",
      inputRequiredBorder: "0 62% 40%",
    },
  },
  {
    name: "Escuro Cobre",
    description: "Dark mode com tons quentes de cobre e âmbar",
    theme: {
      sidebarBg: "20 25% 7%",
      sidebarText: "30 15% 70%",
      sidebarActive: "25 80% 55%",
      primary: "25 85% 52%",
      primaryForeground: "0 0% 100%",
      accent: "160 55% 40%",
      accentForeground: "0 0% 100%",
      background: "20 18% 9%",
      foreground: "30 15% 88%",
      card: "20 20% 13%",
      border: "20 15% 20%",
      muted: "20 15% 16%",
      mutedForeground: "30 10% 52%",
      destructive: "0 65% 42%",
      success: "155 60% 38%",
      warning: "42 90% 50%",
      inputBorder: "20 15% 22%",
      inputRequiredBorder: "0 60% 45%",
    },
  },
  {
    name: "Escuro Esmeralda",
    description: "Dark mode com tons de verde esmeralda e menta",
    theme: {
      sidebarBg: "160 30% 6%",
      sidebarText: "155 15% 68%",
      sidebarActive: "160 70% 45%",
      primary: "160 72% 42%",
      primaryForeground: "0 0% 100%",
      accent: "200 75% 50%",
      accentForeground: "0 0% 100%",
      background: "165 22% 8%",
      foreground: "155 14% 90%",
      card: "162 25% 12%",
      border: "160 18% 18%",
      muted: "162 18% 15%",
      mutedForeground: "155 10% 50%",
      destructive: "0 60% 38%",
      success: "142 65% 40%",
      warning: "38 88% 50%",
      inputBorder: "160 15% 20%",
      inputRequiredBorder: "0 55% 42%",
    },
  },
  {
    name: "Escuro Roxo Neon",
    description: "Dark mode vibrante com roxo e rosa neon",
    theme: {
      sidebarBg: "270 30% 7%",
      sidebarText: "275 15% 70%",
      sidebarActive: "280 80% 65%",
      primary: "280 85% 60%",
      primaryForeground: "0 0% 100%",
      accent: "330 75% 55%",
      accentForeground: "0 0% 100%",
      background: "270 25% 8%",
      foreground: "275 14% 90%",
      card: "272 28% 12%",
      border: "270 20% 20%",
      muted: "272 20% 16%",
      mutedForeground: "275 10% 52%",
      destructive: "0 65% 40%",
      success: "145 65% 40%",
      warning: "38 90% 52%",
      inputBorder: "270 18% 22%",
      inputRequiredBorder: "340 60% 45%",
    },
  },
  {
    name: "Padrão do Sistema",
    description: "Azul + Verde + Cinza — tema original",
    theme: { ...defaultTheme },
  },
];

const STORAGE_KEY = "gp-theme-config";
const DARK_MODE_KEY = "gp-dark-mode";
const DARK_AUTO_KEY = "gp-dark-auto";
const TYPOGRAPHY_KEY = "gp-typography";
const SCHEDULE_KEY = "gp-dark-schedule";

export const darkTheme: ThemeConfig = {
  ...defaultTheme,
  ...presetPalettes.find(p => p.name === "Modo Escuro")!.theme,
};

export function isAutoDarkMode(): boolean {
  return localStorage.getItem(DARK_AUTO_KEY) === "true";
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function syncDarkClass(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

const THEME_VERSION_KEY = "gp-theme-version";
const CURRENT_THEME_VERSION = "4"; // Blue steel refined

function loadTheme(): ThemeConfig {
  try {
    const version = localStorage.getItem(THEME_VERSION_KEY);
    if (version !== CURRENT_THEME_VERSION) {
      // Force reset to new purple/cyan palette
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(THEME_VERSION_KEY, CURRENT_THEME_VERSION);
      return { ...defaultTheme };
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultTheme, ...JSON.parse(stored) };
    }
  } catch { /* erro ignorado */ }
  return { ...defaultTheme };
}

function loadTypography(): TypographyConfig {
  try {
    const stored = localStorage.getItem(TYPOGRAPHY_KEY);
    if (stored) return { ...defaultTypography, ...JSON.parse(stored) };
  } catch { /* erro ignorado */ }
  return { ...defaultTypography };
}

function loadSchedule(): DarkScheduleConfig {
  try {
    const stored = localStorage.getItem(SCHEDULE_KEY);
    if (stored) return { ...defaultSchedule, ...JSON.parse(stored) };
  } catch { /* erro ignorado */ }
  return { ...defaultSchedule };
}

export function isDarkMode(): boolean {
  return localStorage.getItem(DARK_MODE_KEY) === "true";
}

function isInDarkSchedule(schedule: DarkScheduleConfig): boolean {
  if (!schedule.enabled) return false;
  const hour = new Date().getHours();
  if (schedule.startHour > schedule.endHour) {
    // e.g. 18-6: dark from 18 to midnight and midnight to 6
    return hour >= schedule.startHour || hour < schedule.endHour;
  }
  return hour >= schedule.startHour && hour < schedule.endHour;
}

function applyThemeToDOM(theme: ThemeConfig, dark?: boolean) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", theme.primaryForeground);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-foreground", theme.accentForeground);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--card-foreground", theme.foreground);
  root.style.setProperty("--popover", theme.card);
  root.style.setProperty("--popover-foreground", theme.foreground);
  root.style.setProperty("--secondary", theme.muted);
  root.style.setProperty("--secondary-foreground", theme.foreground);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--input", theme.inputBorder);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--muted-foreground", theme.mutedForeground);
  root.style.setProperty("--destructive", theme.destructive);
  root.style.setProperty("--success", theme.success);
  root.style.setProperty("--warning", theme.warning);
  root.style.setProperty("--ring", theme.primary);
  root.style.setProperty("--sidebar-background", theme.sidebarBg);
  root.style.setProperty("--sidebar-foreground", theme.sidebarText);
  root.style.setProperty("--sidebar-primary", theme.sidebarActive);
  root.style.setProperty("--sidebar-primary-foreground", theme.primaryForeground);
  root.style.setProperty("--sidebar-accent", theme.background === defaultTheme.background ? "222 25% 18%" : `${theme.sidebarBg.split(" ")[0]} 20% 22%`);
  root.style.setProperty("--sidebar-border", theme.border);

  // Also sync glow/gradient tokens
  root.style.setProperty("--glow-primary", theme.primary);
  root.style.setProperty("--glow-accent", theme.accent);
  root.style.setProperty("--gradient-start", theme.primary);
  root.style.setProperty("--gradient-end", theme.accent);

  if (dark !== undefined) {
    syncDarkClass(dark);
  }
}

function applyTypographyToDOM(typo: TypographyConfig) {
  loadGoogleFont(typo.fontFamily);
  const root = document.documentElement;
  root.style.setProperty("--font-family", typo.fontFamily);
  document.body.style.fontFamily = typo.fontFamily;
  root.style.fontSize = typo.fontSize;

  // Spacing via a CSS variable
  const spacingMap: Record<string, string> = {
    compact: "0.75",
    normal: "1",
    comfortable: "1.25",
    spacious: "1.5",
  };
  root.style.setProperty("--spacing-scale", spacingMap[typo.spacing] || "1");
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeConfig>(loadTheme);
  const [dark, setDark] = useState(isDarkMode);
  const [typography, setTypographyState] = useState<TypographyConfig>(loadTypography);
  const [schedule, setScheduleState] = useState<DarkScheduleConfig>(loadSchedule);

  const [autoDark, setAutoDarkState] = useState(() => isAutoDarkMode());

  useEffect(() => {
    applyThemeToDOM(theme, dark);
  }, [theme, dark]);

  useEffect(() => {
    applyTypographyToDOM(typography);
  }, [typography]);

  useEffect(() => {
    const t = loadTheme();
    const d = isDarkMode();
    applyThemeToDOM(t, d);
    applyTypographyToDOM(loadTypography());
  }, []);

  // OS preference listener for auto mode
  useEffect(() => {
    if (!autoDark) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const shouldBeDark = e.matches;
      localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
      setDark(shouldBeDark);
      const palette = shouldBeDark ? darkTheme : defaultTheme;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
      setThemeState(palette);
    };
    // Apply current OS preference immediately
    const shouldBeDark = mq.matches;
    if (shouldBeDark !== dark) {
      localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
      setDark(shouldBeDark);
      const palette = shouldBeDark ? darkTheme : defaultTheme;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
      setThemeState(palette);
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [autoDark]);

  // Auto dark mode schedule check
  useEffect(() => {
    if (!schedule.enabled) return;

    const check = () => {
      const shouldBeDark = isInDarkSchedule(schedule);
      const currentlyDark = isDarkMode();
      if (shouldBeDark !== currentlyDark) {
        localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
        setDark(shouldBeDark);
        const palette = shouldBeDark ? darkTheme : defaultTheme;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
        setThemeState(palette);
      }
    };

    check();
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  }, [schedule]);

  const setTheme = useCallback((updates: Partial<ThemeConfig>) => {
    setThemeState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setTypography = useCallback((updates: Partial<TypographyConfig>) => {
    setTypographyState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(TYPOGRAPHY_KEY, JSON.stringify(next));
      applyTypographyToDOM(next);
      return next;
    });
  }, []);

  const setSchedule = useCallback((updates: Partial<DarkScheduleConfig>) => {
    setScheduleState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TYPOGRAPHY_KEY);
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.setItem(DARK_MODE_KEY, "false");
    localStorage.removeItem(DARK_AUTO_KEY);
    setDark(false);
    setAutoDarkState(false);
    setThemeState({ ...defaultTheme });
    setTypographyState({ ...defaultTypography });
    setScheduleState({ ...defaultSchedule });
    applyTypographyToDOM(defaultTypography);
  }, []);

  const applyPalette = useCallback((palette: Partial<ThemeConfig>) => {
    const next = { ...defaultTheme, ...palette };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setThemeState(next);
  }, []);

  const toggleDarkMode = useCallback(() => {
    // Disable auto mode when manually toggling
    localStorage.removeItem(DARK_AUTO_KEY);
    setAutoDarkState(false);
    setDark(prev => {
      const next = !prev;
      localStorage.setItem(DARK_MODE_KEY, String(next));
      const palette = next ? darkTheme : defaultTheme;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
      setThemeState(palette);
      return next;
    });
  }, []);

  const setAutoDark = useCallback((enabled: boolean) => {
    localStorage.setItem(DARK_AUTO_KEY, String(enabled));
    setAutoDarkState(enabled);
    if (enabled) {
      const shouldBeDark = getSystemPrefersDark();
      localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
      setDark(shouldBeDark);
      const palette = shouldBeDark ? darkTheme : defaultTheme;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
      setThemeState(palette);
    }
  }, []);

  return { theme, setTheme, resetTheme, applyPalette, dark, toggleDarkMode, autoDark, setAutoDark, typography, setTypography, schedule, setSchedule };
}

/** Lightweight hook that only runs the dark mode schedule check (no full theme state). */
export function useThemeSchedule() {
  useEffect(() => {
    const sched = loadSchedule();
    if (!sched.enabled) return;

    const check = () => {
      const shouldBeDark = isInDarkSchedule(sched);
      const currentlyDark = isDarkMode();
      if (shouldBeDark !== currentlyDark) {
        localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
        const palette = shouldBeDark ? darkTheme : defaultTheme;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
        applyThemeToDOM(palette);
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);
}

export function initializeTheme() {
  // Check auto dark mode (OS preference)
  if (isAutoDarkMode()) {
    const shouldBeDark = getSystemPrefersDark();
    localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
    const palette = shouldBeDark ? darkTheme : defaultTheme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
    applyThemeToDOM(palette, shouldBeDark);
    applyTypographyToDOM(loadTypography());
    return;
  }

  const dark = isDarkMode();
  applyThemeToDOM(loadTheme(), dark);
  applyTypographyToDOM(loadTypography());

  // Auto-schedule on init
  const sched = loadSchedule();
  if (sched.enabled) {
    const shouldBeDark = isInDarkSchedule(sched);
    if (shouldBeDark !== dark) {
      localStorage.setItem(DARK_MODE_KEY, String(shouldBeDark));
      const palette = shouldBeDark ? darkTheme : defaultTheme;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
      applyThemeToDOM(palette, shouldBeDark);
    }
  }
}