import type { FormEventHandler, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { FieldGroup } from "@/components/ui/field.tsx";

/**
 * The one form card every integration uses, so a credential form reads the same whichever
 * service you opened.
 *
 * Fields are capped at `max-w-lg` rather than filling the page: these are short credential
 * forms, and an input stretched across the full 265 measure is harder to scan, not more
 * generous. Actions sit in the footer, left-aligned, primary first — never a full-width
 * button, which on a settings form reads as a call to action rather than a save.
 *
 * Pass `onSubmit` and the body becomes a real `<form>`, so Enter submits instead of doing
 * nothing. The form carries the card's own column gap, because header/content/footer are
 * inside it and would otherwise collapse together.
 */
export function IntegrationFormCard({
  title,
  description,
  actions,
  onSubmit,
  children,
  className,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  className?: string;
}>) {
  const body = (
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <FieldGroup className="max-w-lg gap-4">{children}</FieldGroup>
      </CardContent>
      {actions && <CardFooter className="gap-2">{actions}</CardFooter>}
    </>
  );

  return (
    <Card className={className}>
      {onSubmit ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-(--card-spacing)">
          {body}
        </form>
      ) : (
        body
      )}
    </Card>
  );
}
