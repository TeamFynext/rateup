import { Button } from "@rateup/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@rateup/ui/components/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import { IconPencil } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { SafeHtml } from "@/components/common/SafeHtml.tsx";
import CustomTextEditor from "@/components/RichTextEditor/CustomTextEditor.tsx";

interface ThemeTitleProps {
  value: string;
  onChange: (value: string) => void;
  styles?: CSSProperties;
}

const ThemeTitle = ({ value, onChange, styles }: ThemeTitleProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <SafeHtml html={value} style={styles} />
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} />}
        >
          <IconPencil data-icon />
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Edit title</DialogTitle>
          <CustomTextEditor content={value} onUpdate={onChange} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThemeTitle;
