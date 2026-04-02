import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Formats a numeric value (in cents or as a float) to Brazilian currency display.
 * Input: raw number (e.g., 1234.56)
 * Output: "1.234,56"
 */
export function formatCurrencyBRL(value: number): string {
  if (isNaN(value) || value === 0) return "0,00";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a Brazilian currency string back to a number.
 * Input: "1.234,56" → 1234.56
 */
export function parseCurrencyBRL(value: string): number {
  if (!value) return 0;
  // Remove R$, spaces, dots (thousands separator), replace comma with dot
  const cleaned = value
    .replace(/R$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Masks input as user types — integer-based approach (shifts digits).
 * User types "123456" → displays "1.234,56"
 */
function maskCurrency(rawDigits: string): string {
  // Keep only digits
  const digits = rawDigits.replace(/\D/g, "");
  if (!digits || digits === "0" || digits === "00") return "0,00";

  // Remove leading zeros but keep at least 1
  const trimmed = digits.replace(/^0+/, "") || "0";

  // Pad to at least 3 digits (for cents)
  const padded = trimmed.padStart(3, "0");

  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);

  // Add thousands separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formattedInt},${decPart}`;
}

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Numeric value (e.g., 1234.56) */
  value: number | string;
  /** Called with the numeric value when changed */
  onValueChange: (value: number) => void;
  /** Show "R$ " prefix inside input */
  showPrefix?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, showPrefix = true, onFocus, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => {
      const num = typeof value === "string" ? parseFloat(value) || 0 : (value || 0);
      return maskCurrency(Math.round(num * 100).toString());
    });
    const [focused, setFocused] = React.useState(false);

    // Sync from outside when not focused
    React.useEffect(() => {
      if (!focused) {
        const num = typeof value === "string" ? parseFloat(value) || 0 : (value || 0);
        setDisplayValue(maskCurrency(Math.round(num * 100).toString()));
      }
    }, [value, focused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      const masked = maskCurrency(raw);
      setDisplayValue(masked);
      onValueChange(parseCurrencyBRL(masked));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    return (
      <div className="relative">
        {showPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
            R$
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono text-right",
            showPrefix && "pl-10",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
