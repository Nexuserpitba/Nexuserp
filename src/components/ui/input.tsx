import * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  noUpperCase?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, noUpperCase, onChange, ...props }, ref) => {
    const skipUpperCase = noUpperCase || type === "email" || type === "number" || type === "password" || type === "date" || type === "datetime-local" || type === "time" || type === "url" || type === "hidden" || type === "file" || type === "color" || type === "range" || type === "tel" || props.readOnly;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!skipUpperCase && e.target.value !== undefined) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
      }
      onChange?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
