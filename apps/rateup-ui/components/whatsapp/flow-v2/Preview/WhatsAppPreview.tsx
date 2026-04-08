"use client";

import { useEffect, useState } from "react";

import { MoreVertical, Smartphone, X } from "lucide-react";
import { useExtracted } from "next-intl";

import { QuestionType2 } from "@/types/enums";
import MarkdownToReact from "@/components/RichTextEditor/MarkdownToReact";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import useFlowStoreV3 from "../utils/store";

function WhatsAppPreview() {
  const translations = useExtracted();
  const { getCurrentScreen } = useFlowStoreV3();
  const [formData, setFormData] = useState<Record<string, any>>({});

  const screen = getCurrentScreen();

  useEffect(() => {
    // Reset form data when screen changes
    setFormData({});
  }, [screen?.id]);

  if (!screen) {
    return (
      <div className="flex flex-col h-full bg-muted">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-0.5">
            <Smartphone className="w-4 h-4" />
            <h2 className="text-base font-semibold">
              {translations("Preview")}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {translations("See how your flow looks on mobile")}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {translations("No screen selected")}
          </p>
        </div>
      </div>
    );
  }

  const allElements = (screen.layout.children || []).filter(
    (el: any) => el.visible !== false,
  );

  const footerElement = allElements.find(
    (el: any) =>
      el.type === QuestionType2.Footer ||
      el.type === "Footer" ||
      el.metaType === "Footer",
  );
  const elements = allElements.filter(
    (el: any) =>
      el.type !== QuestionType2.Footer &&
      el.type !== "Footer" &&
      el.metaType !== "Footer",
  );

  // Renders only the input control widget, no label/description wrapper
  const renderControl = (element: any) => {
    switch (element.type || element.metaType) {
      case QuestionType2.TextInput:
      case "TextInput":
        return (
          <Input
            placeholder={
              element["helper-text"] || translations("Type your answer")
            }
            type={element["input-type"] || "text"}
            value={formData[element.id] || ""}
            onChange={(e) =>
              setFormData({ ...formData, [element.id]: e.target.value })
            }
          />
        );

      case QuestionType2.TextArea:
      case "TextArea":
        return (
          <Textarea
            placeholder={
              element["helper-text"] || translations("Type your answer")
            }
            rows={3}
            value={formData[element.id] || ""}
            onChange={(e) =>
              setFormData({ ...formData, [element.id]: e.target.value })
            }
          />
        );

      case QuestionType2.CheckboxGroup:
      case "CheckboxGroup":
        return (
          <div className="space-y-4">
            {(element["data-source"] || []).map((option: any) => (
              <div
                key={option.id}
                className="flex items-center space-x-2 justify-between"
              >
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
                        [element.id]: current.filter(
                          (id: string) => id !== option.id,
                        ),
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
            onValueChange={(value) =>
              setFormData({ ...formData, [element.id]: value })
            }
          >
            <div className="space-y-4">
              {(element["data-source"] || []).map((option: any) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-2 justify-between"
                >
                  <Label
                    htmlFor={`${element.id}-${option.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.title}
                  </Label>
                  <RadioGroupItem
                    value={option.id}
                    id={`${element.id}-${option.id}`}
                  />
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
            onValueChange={(value) =>
              setFormData({ ...formData, [element.id]: value })
            }
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
            onSelect={(date) =>
              setFormData({ ...formData, [element.id]: date })
            }
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
                variant={
                  formData[element.id] === option.id ? "default" : "outline"
                }
                onClick={() =>
                  setFormData({ ...formData, [element.id]: option.id })
                }
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
          <div
            key={key}
            className="text-[15px] font-bold text-foreground leading-snug pt-3 pb-1"
          >
            {element.text || translations("Heading")}
          </div>
        );
      case QuestionType2.TextSubheading:
      case "TextSubheading":
        return (
          <div
            key={key}
            className="text-[13px] font-semibold text-foreground leading-snug py-0.5"
          >
            {element.text || translations("Subheading")}
          </div>
        );
      case QuestionType2.TextBody:
      case "TextBody":
        return (
          <div
            key={key}
            className="text-[13px] text-muted-foreground leading-relaxed py-0.5"
          >
            {element.text || translations("Body text")}
          </div>
        );
      case QuestionType2.TextCaption:
      case "TextCaption":
        return (
          <div
            key={key}
            className="text-[11px] text-muted-foreground leading-snug py-0.5"
          >
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
          <Label className="text-[13px] text-foreground mb-3">
            {element?.label}
          </Label>
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
    <div className="flex flex-col h-full bg-muted">
      {/* Panel Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-2 mb-0.5">
          <Smartphone className="w-4 h-4" />
          <h2 className="text-base font-semibold">{translations("Preview")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {translations("See how your flow looks on mobile")}
        </p>
      </div>
      {/* Phone Mockup */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        <div className="w-[320px] h-145 bg-foreground rounded-[28px] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.2)] relative my-5 shrink-0">
          {/* Phone Screen */}
          <div className="w-full h-full rounded-[20px] overflow-hidden flex flex-col relative">
            {/* WhatsApp Header */}
            <div className="bg-[#09b838] px-4 py-5 flex flex-col gap-0.5 shrink-0">
              {/* when the flow sheet becomes draggable then original business name and other details should be displayed */}
              {/* <div className="text-white font-semibold text-sm">
                {translations("Business Name")}
              </div>
              <div className="text-white/80" style={{ fontSize: "10px" }}>
                {translations("Online")}
              </div> */}
            </div>

            {/* Chat background */}
            <div className="flex-1 bg-[#e5ddd5]" />

            {/* Flow Sheet — bottom sheet overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-[calc(100%-25px)] bg-background rounded-t-2xl flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-8 h-1 rounded-full bg-border" />
              </div>

              {/* Flow Header: × | Title | ⋮ */}
              <div className="flex items-center justify-between px-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                >
                  <X size={18} />
                </Button>
                <span className="text-[13px] font-semibold text-foreground flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  {screen.title || translations("Screen")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                >
                  <MoreVertical size={18} />
                </Button>
              </div>
              <div className="h-px bg-border shrink-0" />

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-3 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&:hover::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                <div className="space-y-0">
                  {elements.map((element, index) =>
                    renderElement(element, index),
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-3 pt-2 pb-2.5 bg-background flex flex-col items-center gap-1.5 shrink-0">
                <Button className="bg-[#25d366] hover:bg-[#1da851] text-white rounded-3xl font-semibold text-[13px] py-2.5 w-full h-auto">
                  {footerElement?.label || translations("Continue")}
                </Button>
                <p className="text-[9px] text-muted-foreground text-center m-0">
                  {translations("Managed by the business.")}{" "}
                  <span className="text-[#25d366] cursor-pointer">
                    {translations("Learn more")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppPreview;
