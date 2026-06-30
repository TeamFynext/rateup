import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import MarkdownToReact from "@/components/RichTextEditor/MarkdownToReact.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  FlowSheetShell,
  WhatsAppChatHeader,
} from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import { QuestionType2 } from "@/types/enums.ts";

import useFlowStoreV3 from "../utils/store.ts";

/** Renders just the flow-sheet bottom-sheet content (header/elements/footer) for a screen, with no outer phone chrome. Reused by both the embedded mockup and the global phone simulator. */
export function FlowScreenSheet() {
  const { t: translations } = useTranslation();
  const { getCurrentScreen } = useFlowStoreV3();
  const [formData, setFormData] = useState<Record<string, any>>({});

  const screen = getCurrentScreen();

  useEffect(() => {
    // Reset form data when screen changes
    setFormData({});
  }, [screen?.id]);

  if (!screen) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">{translations("No screen selected")}</p>
      </div>
    );
  }

  const allElements = (screen.layout.children || []).filter((el: any) => el.visible !== false);

  const footerElement = allElements.find(
    (el: any) =>
      el.type === QuestionType2.Footer || el.type === "Footer" || el.metaType === "Footer",
  );
  const elements = allElements.filter(
    (el: any) =>
      el.type !== QuestionType2.Footer && el.type !== "Footer" && el.metaType !== "Footer",
  );

  // Renders only the input control widget, no label/description wrapper
  const renderControl = (element: any) => {
    switch (element.type || element.metaType) {
      case QuestionType2.TextInput:
      case "TextInput":
        return (
          <Input
            placeholder={element["helper-text"] || translations("Type your answer")}
            type={element["input-type"] || "text"}
            value={formData[element.id] || ""}
            onChange={(e) => setFormData({ ...formData, [element.id]: e.target.value })}
          />
        );

      case QuestionType2.TextArea:
      case "TextArea":
        return (
          <Textarea
            placeholder={element["helper-text"] || translations("Type your answer")}
            rows={3}
            value={formData[element.id] || ""}
            onChange={(e) => setFormData({ ...formData, [element.id]: e.target.value })}
          />
        );

      case QuestionType2.CheckboxGroup:
      case "CheckboxGroup":
        return (
          <div className="space-y-4">
            {(element["data-source"] || []).map((option: any) => (
              <div key={option.id} className="flex items-center space-x-2 justify-between">
                <Label
                  htmlFor={`${element.id}-${option.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.title}
                </Label>
                <Checkbox
                  id={`${element.id}-${option.id}`}
                  checked={formData[element.id]?.includes(option.id) || false}
                  onCheckedChange={(checked) => {
                    const current = formData[element.id] || [];
                    if (checked) {
                      setFormData({
                        ...formData,
                        [element.id]: [...current, option.id],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        [element.id]: current.filter((id: string) => id !== option.id),
                      });
                    }
                  }}
                />
              </div>
            ))}
          </div>
        );

      case QuestionType2.RadioButtonsGroup:
      case "RadioButtonsGroup":
      case QuestionType2.LD:
      case QuestionType2.YN:
        return (
          <RadioGroup
            value={formData[element.id] || ""}
            onValueChange={(value) => setFormData({ ...formData, [element.id]: value })}
          >
            <div className="space-y-4">
              {(element["data-source"] || []).map((option: any) => (
                <div key={option.id} className="flex items-center space-x-2 justify-between">
                  <Label
                    htmlFor={`${element.id}-${option.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.title}
                  </Label>
                  <RadioGroupItem value={option.id} id={`${element.id}-${option.id}`} />
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case QuestionType2.Dropdown:
      case "Dropdown":
        return (
          <Select
            value={formData[element.id] || ""}
            onValueChange={(value) => setFormData({ ...formData, [element.id]: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={translations("Select an option")} />
            </SelectTrigger>
            <SelectContent>
              {(element["data-source"] || []).map((opt: any) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case QuestionType2.DatePicker:
      case "DatePicker":
        return (
          <Calendar
            mode="single"
            selected={formData[element.id]}
            onSelect={(date) => setFormData({ ...formData, [element.id]: date })}
            className="rounded-md border"
          />
        );

      case QuestionType2.Rating:
      case "Rating":
      case QuestionType2.Smiley:
      case "Smiley":
        return (
          <div className="flex gap-2 flex-wrap">
            {(element["data-source"] || []).map((option: any) => (
              <Button
                key={option.id}
                size="sm"
                variant={formData[element.id] === option.id ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, [element.id]: option.id })}
              >
                {option.title}
              </Button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const renderElement = (element: any, index: number) => {
    const key = element.id || index;
    const type = element.type || element.metaType;

    // Non-input types — no label/description wrapper
    switch (type) {
      case QuestionType2.TextHeading:
      case "TextHeading":
        return (
          <div key={key} className="text-[15px] font-bold text-foreground leading-snug pt-3 pb-1">
            {element.text || translations("Heading")}
          </div>
        );
      case QuestionType2.TextSubheading:
      case "TextSubheading":
        return (
          <div key={key} className="text-[13px] font-semibold text-foreground leading-snug py-0.5">
            {element.text || translations("Subheading")}
          </div>
        );
      case QuestionType2.TextBody:
      case "TextBody":
        return (
          <div key={key} className="text-[13px] text-muted-foreground leading-relaxed py-0.5">
            {element.text || translations("Body text")}
          </div>
        );
      case QuestionType2.TextCaption:
      case "TextCaption":
        return (
          <div key={key} className="text-[11px] text-muted-foreground leading-snug py-0.5">
            {element.text || translations("Caption")}
          </div>
        );
      case QuestionType2.Image:
      case "Image":
        return (
          <div key={key}>
            {element.src && (
              <img
                src={element.src}
                alt={element["alt-text"] || "Image"}
                className="rounded-md max-w-full h-auto"
              />
            )}
          </div>
        );
      case QuestionType2.Footer:
      case "Footer":
        return null;
    }

    // Input types — common label + description header
    const control = renderControl(element);

    return (
      <div key={key} className="py-6 border-b border-border last:border-b-0">
        {element?.header && (
          <p className="text-foreground mb-1.5! leading-snug flex flex-wrap">
            {<MarkdownToReact content={element.header} />}
          </p>
        )}
        {element?.label && (
          <Label className="text-[13px] text-foreground mb-3">{element?.label}</Label>
        )}
        {element.description && (
          <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
            {element.description}
          </p>
        )}
        {control ?? <p className="text-sm text-muted-foreground">{type}</p>}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col">
      <WhatsAppChatHeader />

      {/* Chat background */}
      <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a]" />

      {/* Flow Sheet — bottom sheet overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[calc(100%-9px)] bg-background rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
        <FlowSheetShell title={screen.title} footerLabel={footerElement?.label}>
          {elements.map((element, index) => renderElement(element, index))}
        </FlowSheetShell>
      </div>
    </div>
  );
}
