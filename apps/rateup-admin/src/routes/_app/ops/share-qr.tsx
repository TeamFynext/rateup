import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/ds/copy-button";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The customer app, where public survey and menu links live. */
const CUSTOMER_APP = (import.meta.env.VITE_CUSTOMER_APP_URL ?? "https://app.rateup.app").replace(
  /\/$/,
  "",
);

const RESOURCES = [
  { value: "web-survey", label: "Web survey" },
  { value: "whatsapp-survey", label: "WhatsApp survey" },
  { value: "menu", label: "Menu feedback" },
] as const;
type Resource = (typeof RESOURCES)[number]["value"];

/**
 * A link for a survey or menu that does not exist yet. Printing QR stickers takes longer
 * than creating the survey, so the id is minted here first and the survey is created
 * against it later. `crypto.randomUUID` is the same generator the database uses.
 */
function mintLink(resource: Resource): string {
  const id = crypto.randomUUID();
  switch (resource) {
    case "web-survey":
      return `${CUSTOMER_APP}/public/survey/${id}`;
    case "whatsapp-survey":
      return `https://wa.me/PHONE_NUMBER?text=${encodeURIComponent(id)}`;
    case "menu":
      return `${CUSTOMER_APP}/public/menu/${crypto.randomUUID()}/feedback/${id}`;
  }
}

export const Route = createFileRoute("/_app/ops/share-qr")({
  component: ShareQrPage,
});

function ShareQrPage() {
  const [resource, setResource] = useState<Resource>("web-survey");
  const [link, setLink] = useState(() => mintLink("web-survey"));
  const [png, setPng] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(link, { width: 640, margin: 2, errorCorrectionLevel: "H" }).then(
      (url) => {
        if (!cancelled) setPng(url);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [link]);

  const regenerate = (next: Resource = resource) => {
    setResource(next);
    setLink(mintLink(next));
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Share QR"
        description="Mint a link and QR code for a survey or menu before it exists, so stickers can be printed first. Create the survey against this id afterwards."
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6 rounded-3xl border p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="qr-resource">What the link opens</Label>
            <Select value={resource} onValueChange={(value) => regenerate(value as Resource)}>
              <SelectTrigger id="qr-resource" className="h-11 w-full rounded-xl sm:w-72">
                <SelectValue>
                  {(value: Resource) => RESOURCES.find((option) => option.value === value)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RESOURCES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Link</Label>
            <div className="min-w-0 rounded-xl border px-3 py-2.5">
              <CopyButton value={link} className="w-full" />
            </div>
            {resource === "whatsapp-survey" && (
              <p className="text-xs text-muted-foreground">
                Replace <code className="font-mono">PHONE_NUMBER</code> with the organisation's
                WhatsApp number before printing.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11 rounded-xl px-4" onClick={() => regenerate()}>
              <IconRefresh />
              New id
            </Button>
            {png && (
              <Button
                className="h-11 rounded-xl px-4"
                render={<a href={png} download={`rateup-${resource}-qr.png`} />}
              >
                <IconDownload />
                Download PNG
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center rounded-3xl border bg-white p-6">
          {png ? (
            <img src={png} alt={`QR code for ${link}`} className="size-64 max-w-full" />
          ) : (
            <div className="size-64 rounded-2xl bg-muted" />
          )}
        </div>
      </div>
    </div>
  );
}
