/**
 * Centralized logo management utility.
 * Stores logos in localStorage (general + per-company).
 */

const LOGO_KEY = "gp_erp_logo";
const EMPRESA_LOGO_PREFIX = "gp_erp_logo_empresa_";
export const LOGO_CHANGED_EVENT = "gp_logo_changed";

function dispatchLogoChanged() {
  window.dispatchEvent(new Event(LOGO_CHANGED_EVENT));
}

// ========== General Logo ==========

export function getGeneralLogo(): string | null {
  return localStorage.getItem(LOGO_KEY);
}

export function setGeneralLogo(base64: string) {
  localStorage.setItem(LOGO_KEY, base64);
  dispatchLogoChanged();
}

export function removeGeneralLogo() {
  localStorage.removeItem(LOGO_KEY);
  dispatchLogoChanged();
}

// ========== Per-Company Logo ==========

export function getEmpresaLogo(empresaId: string): string | null {
  return localStorage.getItem(`${EMPRESA_LOGO_PREFIX}${empresaId}`);
}

export function setEmpresaLogo(empresaId: string, base64: string) {
  localStorage.setItem(`${EMPRESA_LOGO_PREFIX}${empresaId}`, base64);
  dispatchLogoChanged();
}

export function removeEmpresaLogo(empresaId: string) {
  localStorage.removeItem(`${EMPRESA_LOGO_PREFIX}${empresaId}`);
  dispatchLogoChanged();
}

// ========== Resolve Logo (company-specific → general → default) ==========

export function getActiveLogo(empresaId?: string): string | null {
  if (empresaId) {
    const empresaLogo = getEmpresaLogo(empresaId);
    if (empresaLogo) return empresaLogo;
  }
  return getGeneralLogo();
}

/**
 * Get the selected company ID from localStorage (empresas data).
 */
export function getSelectedEmpresaId(): string | null {
  try {
    const stored = localStorage.getItem("empresas");
    if (!stored) return null;
    const empresas = JSON.parse(stored);
    const selected = empresas.find((e: any) => e.selecionada);
    return selected?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Read a File as base64 data URI. Max 2MB.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("Arquivo muito grande. Máximo: 2MB"));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}
