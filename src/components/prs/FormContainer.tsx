import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type FormContainerProps = {
  title: string;
  description: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function FormContainer({ title, description, icon, onClose, children }: FormContainerProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:bg-secondary"
          aria-label="Close form"
        >
          <X className="h-5 w-5" />
        </Button>
        <CardTitle className="font-headline flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
