import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { validarCPF, validarCNPJ } from "@/lib/validationUtils";
import { maskCpfCnpj, maskCnpj } from "@/lib/maskUtils";
import { cn } from "@/lib/utils";

interface CpfCnpjInputProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "cpfcnpj" | "cnpj";
  placeholder?: string;
  className?: string;
}

export function CpfCnpjInput({ value, onChange, mode = "cpfcnpj", placeholder, className }: CpfCnpjInputProps) {
  const digits = value.replace(/\D/g, "");
  const mask = mode === "cnpj" ? maskCnpj : maskCpfCnpj;

  let status: "empty" | "typing" | "valid" | "invalid" = "empty";
  if (digits.length === 0) {
    status = "empty";
  } else if (mode === "cnpj") {
    status = digits.length < 14 ? "typing" : validarCNPJ(value) ? "valid" : "invalid";
  } else {
    if (digits.length < 11) {
      status = "typing";
    } else if (digits.length === 11) {
      status = validarCPF(value) ? "valid" : "invalid";
    } else if (digits.length < 14) {
      status = "typing";
    } else {
      status = validarCNPJ(value) ? "valid" : "invalid";
    }
  }

  const defaultPlaceholder = mode === "cnpj" ? "00.000.000/0000-00" : "CPF ou CNPJ";

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        onChange={e => onChange(mask(e.target.value))}
        placeholder={placeholder || defaultPlaceholder}
        noUpperCase
        className={cn(
          "pr-9 font-mono transition-colors",
          status === "valid" && "border-green-500 focus-visible:ring-green-500/30",
          status === "invalid" && "border-destructive focus-visible:ring-destructive/30"
        )}
      />
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
        {status === "typing" && <AlertCircle size={16} className="text-muted-foreground animate-pulse" />}
        {status === "valid" && <CheckCircle2 size={16} className="text-green-500" />}
        {status === "invalid" && <XCircle size={16} className="text-destructive" />}
      </div>
      {status === "invalid" && (
        <p className="text-xs text-destructive mt-1">
          {digits.length === 11 ? "CPF inválido" : "CNPJ inválido"}
        </p>
      )}
    </div>
  );
}
