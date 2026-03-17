"use client";

import { useEffect, useState } from "react";

import { Smartphone } from "lucide-react";
import { useExtracted } from "next-intl";

import { QuestionType2 } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import styles from "./WhatsAppPreview.module.css";

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
      <div className="flex flex-col h-full bg-gray-50">
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

  const elements = (screen.layout.children || []).filter(
    (el: any) => el.visible !== false,
  );

  const renderElement = (element: any, index: number) => {
    const key = element.id || index;

    switch (element.type || element.metaType) {
      case QuestionType2.TextHeading:
      case "TextHeading":
        return (
          <div key={key} className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {element.text || translations("Heading")}
            </h3>
          </div>
        );

      case QuestionType2.TextSubheading:
      case "TextSubheading":
        return (
          <div key={key} className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {element.text || translations("Subheading")}
            </p>
          </div>
        );

      case QuestionType2.TextBody:
      case "TextBody":
        return (
          <div key={key} className="space-y-1">
            <p className="text-sm text-gray-600">
              {element.text || translations("Body text")}
            </p>
          </div>
        );

      case QuestionType2.TextCaption:
      case "TextCaption":
        return (
          <div key={key} className="space-y-1">
            <p className="text-xs text-muted-foreground italic">
              {element.text || translations("Caption")}
            </p>
          </div>
        );

      case QuestionType2.TextInput:
      case "TextInput":
        return (
          <div key={key} className="space-y-2">
            <Label>
              {element.label || translations("Text Input")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
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
          </div>
        );

      case QuestionType2.TextArea:
      case "TextArea":
        return (
          <div key={key} className="space-y-2">
            <Label>
              {element.label || translations("Text Area")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
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
          </div>
        );

      case QuestionType2.CheckboxGroup:
      case "CheckboxGroup":
        return (
          <div key={key} className="space-y-3">
            <Label>
              {element.label || translations("Multiple Select")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {element.description && (
              <p className="text-xs text-muted-foreground">
                {element.description}
              </p>
            )}
            <div className="space-y-2">
              {(element["data-source"] || []).map((option: any) => (
                <div key={option.id} className="flex items-center space-x-2">
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
                  <label
                    htmlFor={`${element.id}-${option.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.title}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case QuestionType2.RadioButtonsGroup:
      case "RadioButtonsGroup":
      case QuestionType2.LD:
      case QuestionType2.YN:
        return (
          <div key={key} className="space-y-3">
            <Label>
              {element.label || translations("Single Select")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {element.description && (
              <p className="text-xs text-muted-foreground">
                {element.description}
              </p>
            )}
            <RadioGroup
              value={formData[element.id] || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, [element.id]: value })
              }
            >
              <div className="space-y-2">
                {(element["data-source"] || []).map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option.id}
                      id={`${element.id}-${option.id}`}
                    />
                    <label
                      htmlFor={`${element.id}-${option.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.title}
                    </label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case QuestionType2.Dropdown:
      case "Dropdown":
        return (
          <div key={key} className="space-y-2">
            <Label>
              {element.label || translations("Dropdown")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={formData[element.id] || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, [element.id]: value })
              }
            >
              <SelectTrigger>
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
          </div>
        );

      case QuestionType2.DatePicker:
      case "DatePicker":
        return (
          <div key={key} className="space-y-2">
            <Label>
              {element.label || translations("Date Picker")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Calendar
              mode="single"
              selected={formData[element.id]}
              onSelect={(date) =>
                setFormData({ ...formData, [element.id]: date })
              }
              className="rounded-md border"
            />
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

      case QuestionType2.Rating:
      case "Rating":
      case QuestionType2.Smiley:
      case "Smiley":
        return (
          <div key={key} className="space-y-3">
            <Label>
              {element.label || translations("Rating")}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
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
          </div>
        );

      case QuestionType2.Footer:
      case "Footer":
        return (
          <div key={key} className="pt-4">
            <Button className="w-full" size="lg">
              {element.label || translations("Continue")}
            </Button>
          </div>
        );

      default:
        return (
          <div key={key}>
            <p className="text-sm text-muted-foreground">
              {element.type ||
                element.metaType ||
                translations("Unknown element")}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b bg-white">
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
        <div className={styles["phone-frame"]}>
          {/* Phone Screen */}
          <div className={styles["phone-screen"]}>
            {/* WhatsApp Header */}
            <div className={styles["whatsapp-header"]}>
              <div className="text-white font-semibold text-sm">
                {translations("Business Name")}
              </div>
              <div className="text-white/80" style={{ fontSize: "10px" }}>
                {translations("Online")}
              </div>
            </div>

            {/* Content Area */}
            <div className={styles["phone-content"]}>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {screen.title || "Screen"}
                  </CardTitle>
                  {elements.length > 0 && (
                    <CardDescription className="text-xs">
                      {elements.find((e) => e.label)?.label || ""}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {elements.map((element, index) =>
                    renderElement(element, index),
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppPreview;
