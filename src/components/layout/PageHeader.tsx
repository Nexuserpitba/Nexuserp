import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Set to false to hide back button (e.g. on Dashboard) */
  showBack?: boolean;
}

export function PageHeader({ title, description, actions, showBack = true }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0 flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 h-9 w-9 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      {/* Gradient divider line */}
      <div className="h-px mb-4 rounded-full" style={{
        background: 'linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.15), transparent)'
      }} />
    </div>
  );
}
