import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="page-container">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Construction size={48} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Em Desenvolvimento</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Este módulo está sendo construído. Em breve você terá acesso completo a todas as funcionalidades de {title.toLowerCase()}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
