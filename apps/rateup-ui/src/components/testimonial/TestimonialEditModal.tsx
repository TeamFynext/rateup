import { useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImmer } from "use-immer";

import { useUpdateCollection } from "@/backend/testimonials/testimonial.query";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import type { Testimonial, TestimonialStyleType } from "@/types/global";

import CustomColorPicker from "../Survey/SurveyTheme/components/customelements/CustomColorPicker.tsx";
import { FontWeights } from "../Survey/SurveyTheme/SurveyTheme.constants";
import TestimonialCard from "./TestimonialCard.tsx";

interface TestimonialEditModalProps {
  opened: boolean;
  onClose: () => void;
  theme: TestimonialStyleType;
}

enum BlockTabEnum {
  Background = "Background",
  DescriptionBlock = "Description Block",
  ProfileBlock = "Profile Block",
  RatingBlock = "Rating Block",
}

const TestimonialEditModal = ({ opened, onClose, theme }: Readonly<TestimonialEditModalProps>) => {
  const [currentStyle, setCurrentstyle] = useImmer<TestimonialStyleType>(
    theme || ({} as TestimonialStyleType),
  );
  const { t: translations } = useTranslation();

  useEffect(() => {
    if (theme) {
      setCurrentstyle(theme);
    }
  }, [theme, setCurrentstyle]);

  const testimonialSample: Testimonial = {
    testimonial: {
      name: "Profile Name",
      jobTitle: "Profile Position",
      testimonial:
        "Excellent food. Menu is extensive and seasonal to a particularly high standard. Definitely fine dining. It can be expensive but worth it and they do different deals on different nights so it's worth checking them out before you book. Highly recommended.",
      rating: 5,
    },
    id: "",
    survey: { id: "", name: "" },
    teamId: "",
    createdAt: Date.now().toString(),
  };

  const fonts = [
    {
      name: "Profile Name",
      color: currentStyle?.profileBlock?.profileName?.color,
      fontSize: currentStyle?.profileBlock?.profileName?.fontSize,
      fontWeight: currentStyle?.profileBlock?.profileName?.fontWeight,
    },
    {
      name: "Profile Position",
      color: currentStyle?.profileBlock?.profilePos?.color,
      fontSize: currentStyle?.profileBlock?.profilePos?.fontSize,
      fontWeight: currentStyle?.profileBlock?.profilePos?.fontWeight,
    },
    {
      name: "Description",
      color: currentStyle?.descBlock?.desc?.color,
      fontSize: currentStyle?.descBlock?.desc?.fontSize,
      fontWeight: currentStyle?.descBlock?.desc?.fontWeight,
    },
    {
      name: "Date",
      color: currentStyle?.date?.color,
      fontSize: currentStyle?.date?.fontSize,
      fontWeight: currentStyle?.date?.fontWeight,
    },
  ];

  function handleFontColorChange(value: string, type: string) {
    switch (type) {
      case "Profile Name":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.profileName.color = value;
        });
        break;
      case "Profile Position":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.profilePos.color = value;
        });
        break;
      case "Description":
        setCurrentstyle((draft) => {
          if (draft.descBlock) draft.descBlock.desc.color = value;
        });
        break;
      case "Date":
        setCurrentstyle((draft) => {
          if (draft.date) draft.date.color = value;
        });
        break;
    }
  }

  function handleFontWeightChange(value: string, type: string) {
    switch (type) {
      case "Profile Name":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.profileName.fontWeight = value;
        });
        break;
      case "Profile Position":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.profilePos.fontWeight = value;
        });
        break;
      case "Description":
        setCurrentstyle((draft) => {
          if (draft.descBlock) draft.descBlock.desc.fontWeight = value;
        });
        break;
      case "Date":
        setCurrentstyle((draft) => {
          if (draft.date) draft.date.fontWeight = value;
        });
        break;
    }
  }

  function handleFontSizeChange(value: string, type: string) {
    switch (type) {
      case "Profile Name":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.profileName.fontSize = value;
        });
        break;
      case "Profile Position":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.profilePos.fontSize = value;
        });
        break;
      case "Description":
        setCurrentstyle((draft) => {
          if (draft.descBlock) draft.descBlock.desc.fontSize = value;
        });
        break;
      case "Date":
        setCurrentstyle((draft) => {
          if (draft.date) draft.date.fontSize = value;
        });
        break;
    }
  }

  function handleLayout(value: string) {
    setCurrentstyle({ ...currentStyle, layout: value as TestimonialStyleType["layout"] });
  }

  const blocks = [
    {
      name: BlockTabEnum.Background,
      bg: currentStyle?.root?.bg,
    },
    {
      name: BlockTabEnum.ProfileBlock,
      bg: currentStyle?.profileBlock?.bg,
    },
    {
      name: BlockTabEnum.DescriptionBlock,
      bg: currentStyle?.descBlock?.bg,
    },
    {
      name: BlockTabEnum.RatingBlock,
      bg: currentStyle?.ratingBlock?.bg,
    },
  ];

  const handleBgColor = (block: string, value: string) => {
    switch (block) {
      case "Background":
        setCurrentstyle((draft) => {
          if (draft.root) draft.root.bg = value;
          if (draft.profileBlock) draft.profileBlock.bg = value;
          if (draft.descBlock) draft.descBlock.bg = value;
          if (draft.ratingBlock) draft.ratingBlock.bg = value;
        });
        break;
      case "Profile Block":
        setCurrentstyle((draft) => {
          if (draft.profileBlock) draft.profileBlock.bg = value;
        });
        break;
      case "Description Block":
        setCurrentstyle((draft) => {
          if (draft.descBlock) draft.descBlock.bg = value;
        });
        break;
      case "Rating Block":
        setCurrentstyle((draft) => {
          if (draft.ratingBlock) draft.ratingBlock.bg = value;
        });
        break;
    }
  };

  const params = useParams({
    strict: false,
  });
  const collectionId = params.collectionId as string;
  const updateCollection = useUpdateCollection(collectionId);

  const handleUpdate = () => {
    updateCollection.mutate(
      { data: { theme: currentStyle }, collectionId },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const [activeBlockTab, setActiveBlockTab] = useState<BlockTabEnum>(BlockTabEnum.Background);

  useEffect(() => {
    setCurrentstyle(theme);
    setActiveBlockTab(BlockTabEnum.Background);
  }, [theme]);

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="min-w-5xl max-w-5xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{translations("Edit Testimonial Style")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {translations("Customize the appearance of your testimonial cards")}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-5 gap-0">
          {/* Left Panel - Controls */}
          <ScrollArea className="col-span-3 h-130">
            <div className="p-6 space-y-8">
              {/* Colors Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {translations("Change Color")}
                </h3>
                <Tabs
                  value={activeBlockTab}
                  onValueChange={(v) => setActiveBlockTab(v as BlockTabEnum)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value={BlockTabEnum.Background} className="text-xs">
                      {BlockTabEnum.Background}
                    </TabsTrigger>
                    <TabsTrigger value={BlockTabEnum.ProfileBlock} className="text-xs">
                      {BlockTabEnum.ProfileBlock}
                    </TabsTrigger>
                    <TabsTrigger value={BlockTabEnum.DescriptionBlock} className="text-xs">
                      {BlockTabEnum.DescriptionBlock}
                    </TabsTrigger>
                    <TabsTrigger value={BlockTabEnum.RatingBlock} className="text-xs">
                      {BlockTabEnum.RatingBlock}
                    </TabsTrigger>
                  </TabsList>
                  {blocks.map((block) => (
                    <TabsContent key={block.name} value={block.name} className="mt-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          {translations("Background Color")}
                        </label>
                        <CustomColorPicker
                          value={block.bg}
                          onChange={(color) => handleBgColor(block.name, color)}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <Separator />

              {/* Typography Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {translations("Change Font")}
                </h3>
                <Tabs defaultValue={fonts[0]?.name}>
                  <TabsList className="w-full">
                    {fonts.map((font) => (
                      <TabsTrigger key={font.name} value={font.name} className="text-xs">
                        {font.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {fonts.map((font) => (
                    <TabsContent key={font.name} value={font.name} className="mt-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            {translations("Color")}
                          </label>
                          <CustomColorPicker
                            value={font.color}
                            onChange={(color) => handleFontColorChange(color, font.name)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            {translations("Font Weight")}
                          </label>
                          <Select
                            value={font.fontWeight}
                            onValueChange={(value) => handleFontWeightChange(value, font.name)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FontWeights.map((weight) => (
                                <SelectItem key={weight.value} value={weight.value}>
                                  {weight.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            {translations("Font Size")}
                          </label>
                          <Input
                            type="number"
                            value={font.fontSize || ""}
                            onChange={(e) => handleFontSizeChange(e.target.value, font.name)}
                            placeholder="px"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <Separator />

              {/* Layout & Rating Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {translations("Layout")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {translations("Layout")}
                    </label>
                    <Select value={currentStyle?.layout} onValueChange={handleLayout}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="layout1">Layout 1</SelectItem>
                        <SelectItem value="layout2">Layout 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {translations("Rating Style")}
                    </label>
                    <Select
                      value={currentStyle?.ratingBlock?.ratingType}
                      onValueChange={(value) =>
                        setCurrentstyle((draft) => {
                          if (draft.ratingBlock) draft.ratingBlock.ratingType = value;
                        })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="star">Star</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>

          {/* Right Panel - Preview */}
          <div className="col-span-2 border-l bg-muted/40 flex flex-col">
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {translations("Preview")}
              </h3>
            </div>
            <Separator />
            <ScrollArea className="flex-1 h-117.5">
              <div className="p-4 flex flex-col items-center gap-5">
                <TestimonialCard testimonial={testimonialSample} currentStyle={currentStyle} />
                {currentStyle?.date && (
                  <div className="w-full space-y-2.5 rounded-lg border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      {translations("Visibility")}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remove-rating"
                        checked={currentStyle?.ratingBlock?.isRemoved || false}
                        onCheckedChange={(checked) => {
                          setCurrentstyle((draft) => {
                            if (draft.ratingBlock) draft.ratingBlock.isRemoved = !!checked;
                          });
                        }}
                      />
                      <label htmlFor="remove-rating" className="text-sm cursor-pointer">
                        {translations("Remove Rating")}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remove-date"
                        checked={currentStyle?.date?.isRemoved || false}
                        onCheckedChange={(checked) => {
                          setCurrentstyle((draft) => {
                            if (draft.date) draft.date.isRemoved = !!checked;
                          });
                        }}
                      />
                      <label htmlFor="remove-date" className="text-sm cursor-pointer">
                        {translations("Remove Date")}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remove-pic"
                        checked={currentStyle?.profileBlock?.profilePic?.isRemoved || false}
                        onCheckedChange={(checked) => {
                          setCurrentstyle((draft) => {
                            if (draft.profileBlock?.profilePic)
                              draft.profileBlock.profilePic.isRemoved = !!checked;
                          });
                        }}
                      />
                      <label htmlFor="remove-pic" className="text-sm cursor-pointer">
                        {translations("Remove Profile Picture")}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentstyle(theme);
              onClose();
            }}
          >
            {translations("cancel")}
          </Button>
          <Button onClick={handleUpdate}>{translations("Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestimonialEditModal;
