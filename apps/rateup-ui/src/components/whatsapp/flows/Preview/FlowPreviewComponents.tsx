import { IconCalendar, IconCamera, IconChevronRight, IconFileText } from "@tabler/icons-react";
import { useId } from "react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { FlowSheetShell } from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import type { WaFlowFormNonInputElementType } from "@/types/enums.ts";
import { WaFlowFormElementType } from "@/types/enums.ts";
import type { WaFlowFormElement } from "@/types/global";

import { markdownToPlainText } from "../../flow-v2/FlowScreensList/ScreenListItem.tsx";
import { getTextStyle } from "../FlowPage/EditFlow/FlowTextDetailedView.tsx";

import styles from "./preview.module.css";

function FlowTextPreview({
  text,
  type,
  fontWeight,
  strikethrough,
}: {
  text?: string;
  type: WaFlowFormNonInputElementType;
  fontWeight?: string;
  strikethrough?: boolean;
}) {
  return (
    <span
      className={styles[type]}
      style={{
        ...getTextStyle(fontWeight ?? "", true),
        textDecoration: strikethrough ? "line-through" : "normal",
      }}
    >
      {text}
    </span>
  );
}

function FlowTextInputPreview({ label = "Label" }: { label?: string }) {
  return (
    <InputGroup className={`${styles.textInput} ${styles.font} border-0 shadow-none`}>
      <InputGroupInput placeholder={label} readOnly />
    </InputGroup>
  );
}

function FlowTextAreaPreview({ label = "Label" }: { label?: string }) {
  return (
    <Textarea
      className={`${styles.textInput} ${styles.font} border-0 shadow-none`}
      rows={4}
      placeholder={label}
      readOnly
    />
  );
}

function FlowDateInputPreview({ label = "Label" }: { label?: string }) {
  const uid = useId();
  return (
    <Field>
      <FieldLabel htmlFor={`${uid}-field`} className={`${styles.inputLabel} ${styles.font}`}>
        {label}
      </FieldLabel>
      <InputGroup className={`${styles.textInput} ${styles.font} border-0 shadow-none`}>
        <InputGroupInput id={`${uid}-field`} placeholder="dd/mm/yyyy" readOnly />
        <InputGroupAddon align="inline-end">
          <IconCalendar />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

function FlowFileInputPreview({
  label = "Label",
  type = "photo",
}: {
  label?: string;
  type: "photo" | "document";
}) {
  return (
    <div>
      <p>{label}</p>
      <p className="text-sm">automated description</p>
      <Button variant="outline" className="w-full rounded-full">
        {type === "photo" ? <IconCamera /> : <IconFileText />}
        {type === "photo" ? "Take photo" : "Upload Document"}
      </Button>
    </div>
  );
}

function FlowRadioPreview({
  label = "Label",
  options,
}: {
  label?: string;
  options?: string[] | false;
}) {
  return (
    <Field>
      <p className={`${styles.inputLabel} ${styles.font}`}>{label}</p>
      <RadioGroup className="mt-2 flex flex-col gap-2">
        {(options || []).map((option) => (
          <FieldLabel key={option} className="flex w-full items-center justify-between">
            {option}
            <RadioGroupItem value={option} />
          </FieldLabel>
        ))}
      </RadioGroup>
    </Field>
  );
}

function FlowCheckBoxPreview({
  label = "Label",
  options,
}: {
  label?: string;
  options?: string[] | false;
}) {
  const uid = useId();
  return (
    <Field>
      <p className={`${styles.inputLabel} ${styles.font}`}>{label}</p>
      <Field className="mt-2">
        {(options || []).map((option, idx) => (
          <FieldTitle key={option} className="flex w-full items-center justify-between">
            {option}
            <Checkbox id={`${uid}-field-2-${idx}`} value={option} />
          </FieldTitle>
        ))}
      </Field>
    </Field>
  );
}

function FlowChipsSelectorPreview({
  label = "Label",
  options,
}: {
  label?: string;
  options?: string[] | false;
}) {
  return (
    <div>
      <p className="text-sm">{label}</p>
      <div className="flex flex-wrap gap-2">
        {(options || []).map((option) => (
          <Badge key={option} variant="outline" className="rounded-full px-3 py-1">
            {option}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function DropDownPreview({ label = "Label" }: Readonly<{ label?: string }>) {
  return (
    <InputGroup className={`${styles.textInput} cursor-pointer border-0 shadow-none`}>
      <InputGroupInput
        placeholder={label}
        value=""
        onChange={() => {}}
        className="cursor-pointer caret-transparent"
      />
      <InputGroupAddon align="inline-end" className="cursor-pointer">
        <IconChevronRight />
      </InputGroupAddon>
    </InputGroup>
  );
}

function FlowOptInPreview({ label = "Label" }: Readonly<{ label?: string }>) {
  return (
    <FieldTitle className={`${styles.inputLabel} ${styles.font} flex items-center gap-2`}>
      <Checkbox />
      {label}
    </FieldTitle>
  );
}

interface FlowImagePreviewProps {
  src?: string;
  width?: number;
  height?: number;
}
function FlowImagePreview({ src, width, height }: FlowImagePreviewProps) {
  return (
    <img
      className="mx-auto my-0"
      src={`data:image/png;base64,${src}`}
      style={{ maxWidth: width, height }}
      alt=""
    />
  );
}

function FlowImageCarouselPreview({
  label = "Label",
  fe,
}: {
  label?: string;
  fe: WaFlowFormElement;
}) {
  return (
    <div>
      <p>{label}</p>
      <Carousel className="w-full">
        <CarouselContent>
          {fe.images?.map(
            (img: { src?: string; "alt-text"?: string; [key: string]: unknown }, idx: number) => (
              <CarouselItem key={idx}>
                <img
                  src={`data:image/png;base64,${img.src}`}
                  alt={img["alt-text"]}
                  className="max-h-50"
                  style={{
                    aspectRatio: fe?.["aspect-ratio"] || "4/3",
                  }}
                />
              </CarouselItem>
            ),
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

/** Renders v1 flow form elements inside the shared bottom-sheet shell (same chrome as v2). */
export function FlowPreviewContainer({
  children,
  title,
  footerLabel,
}: Readonly<{ children: React.ReactNode; title?: string; footerLabel?: string }>) {
  return (
    <FlowSheetShell title={title} footerLabel={footerLabel}>
      {children}
    </FlowSheetShell>
  );
}

interface FlowFormElementPreviewProps {
  fe: WaFlowFormElement;
}

export function FlowFormElementPreview({ fe }: FlowFormElementPreviewProps) {
  const label = fe.header ? markdownToPlainText(fe.header) : fe.label;
  switch (fe.type) {
    case WaFlowFormElementType.textHeading:
    case WaFlowFormElementType.textSubHeading:
    case WaFlowFormElementType.textBody:
    case WaFlowFormElementType.textCaption:
    case WaFlowFormElementType.nonInputText:
      return (
        <FlowTextPreview
          text={fe.text}
          type={fe.type}
          fontWeight={fe["font-weight"]}
          strikethrough={fe.strikethrough}
        />
      );

    case WaFlowFormElementType.textInput:
      return <FlowTextInputPreview label={label} />;
    case WaFlowFormElementType.textArea:
      return <FlowTextAreaPreview label={label} />;
    case WaFlowFormElementType.datePicker:
      return <FlowDateInputPreview label={label} />;
    case WaFlowFormElementType.radioButtonsGroup:
      return (
        <FlowRadioPreview
          label={label}
          options={
            typeof fe["data-source"] !== "string" && fe["data-source"]?.map((ds) => ds.title)
          }
        />
      );
    case WaFlowFormElementType.checkboxGroup:
      return (
        <FlowCheckBoxPreview
          label={label}
          options={
            typeof fe["data-source"] !== "string" && fe["data-source"]?.map((ds) => ds.title)
          }
        />
      );
    case WaFlowFormElementType.dropDown:
      return (
        <DropDownPreview
          label={label}
          // options={
          //   typeof fe["data-source"] !== "string" && fe["data-source"]?.map((ds) => ds.title)
          // }
        />
      );
    case WaFlowFormElementType.optIn:
      return <FlowOptInPreview label={label} />;
    case WaFlowFormElementType.embeddedLink:
      return <p className="text-center text-blue-600">{fe?.text}</p>;
    case WaFlowFormElementType.image:
      return <FlowImagePreview src={fe.src} width={fe.width} height={fe.height} />;
    case WaFlowFormElementType.photoPicker:
      return <FlowFileInputPreview label={label} type={"photo"} />;
    case WaFlowFormElementType.documentPicker:
      return <FlowFileInputPreview label={label} type={"document"} />;
    case WaFlowFormElementType.chipsSelector:
      return (
        <FlowChipsSelectorPreview
          label={label}
          options={
            typeof fe["data-source"] !== "string" && fe["data-source"]?.map((ds) => ds.title)
          }
        />
      );
    case WaFlowFormElementType.imageCarousel:
      return <FlowImageCarouselPreview label={label} fe={fe} />;
    default:
      throw new Error("Invalid form element type");
  }
}
