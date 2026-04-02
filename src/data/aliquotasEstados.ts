export interface AliquotaEstado {
  estado: string;
  aliquota: number;
  fcp: number;
  aliqInterestadualSul: number; // para estados S/SE (7%)
  aliqInterestadualOutros: number; // demais (12%)
}

const sulSudeste = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];

export const defaultAliquotasEstados: AliquotaEstado[] = [
  { estado: "AC", aliquota: 19, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "AL", aliquota: 19, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "AP", aliquota: 18, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "AM", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "BA", aliquota: 20.5, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "CE", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "DF", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "ES", aliquota: 17, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "GO", aliquota: 19, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "MA", aliquota: 22, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "MT", aliquota: 17, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "MS", aliquota: 17, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "MG", aliquota: 18, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "PA", aliquota: 19, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "PB", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "PR", aliquota: 19.5, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "PE", aliquota: 20.5, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "PI", aliquota: 21, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "RJ", aliquota: 22, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "RN", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "RS", aliquota: 17, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "RO", aliquota: 19.5, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "RR", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "SC", aliquota: 17, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "SP", aliquota: 18, fcp: 2, aliqInterestadualSul: 7, aliqInterestadualOutros: 12 },
  { estado: "SE", aliquota: 19, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
  { estado: "TO", aliquota: 20, fcp: 2, aliqInterestadualSul: 12, aliqInterestadualOutros: 12 },
];

export const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export function loadAliquotas(): AliquotaEstado[] {
  try {
    const stored = localStorage.getItem("aliquotas_estados");
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed && parsed.length > 0 ? parsed : defaultAliquotasEstados;
  } catch {
    return defaultAliquotasEstados;
  }
}

export function saveAliquotas(data: AliquotaEstado[]) {
  localStorage.setItem("aliquotas_estados", JSON.stringify(data));
}

export function getAliquotaByUF(uf: string): AliquotaEstado | undefined {
  const all = loadAliquotas();
  return all.find(a => a.estado === uf);
}
