import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";

import CustomTextEditor from "@/components/RichTextEditor/CustomTextEditor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

interface ThemeTitleProps {
  value: string;
  onChange;
  styles?;
}

const ThemeTitle = ({ value, onChange, styles }: ThemeTitleProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div style={styles} dangerouslySetInnerHTML={{ __html: value }} />
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
