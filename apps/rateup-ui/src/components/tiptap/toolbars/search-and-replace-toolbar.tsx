/* oxlint-disable */
// @ts-nocheck
import { IconArrowLeft, IconArrowRight, IconRepeat, IconX } from "@tabler/icons-react";
import { useId, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { type SearchAndReplaceStorage } from "../extensions/search-and-replace";
import { useToolbar } from "./toolbar-provider";

export function SearchAndReplaceToolbar() {
  const uid = useId();
  const { editor } = useToolbar();

  const [open, setOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [checked, setChecked] = useState(false);

  // Only present when the SearchAndReplace extension is registered on the editor,
  // and not every editor mounting this toolbar registers it.
  const storage = editor?.storage?.searchAndReplace as SearchAndReplaceStorage | undefined;
  const results = storage?.results;
  const selectedResult = storage?.selectedResult;

  const supported = !!storage;

  const replace = () => editor?.chain().replace().run();
  const replaceAll = () => editor?.chain().replaceAll().run();
  const selectNext = () => editor?.chain().selectNextResult().run();
  const selectPrevious = () => editor?.chain().selectPreviousResult().run();

  useEffect(() => {
    if (!supported) return;
    editor?.chain().setSearchTerm(searchText).run();
  }, [searchText, editor, supported]);

  useEffect(() => {
    if (!supported) return;
    editor?.chain().setReplaceTerm(replaceText).run();
  }, [replaceText, editor, supported]);

  useEffect(() => {
    if (!supported) return;
    editor?.chain().setCaseSensitive(checked).run();
  }, [checked, editor, supported]);

  useEffect(() => {
    if (!open) {
      setReplaceText("");
      setSearchText("");
      setReplacing(false);
    }
  }, [open]);

  if (!supported) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              disabled={!editor}
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(!open);
                  }}
                  className={cn("h-8 w-max px-3 font-normal")}
                />
              }
            />
          }
        >
          <IconRepeat className="mr-2 h-4 w-4" />
          <p>Search & Replace</p>
        </TooltipTrigger>
        <TooltipContent>
          <span>Search & Replace</span>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="relative flex w-[400px] px-3 py-2.5"
      >
        {!replacing ? (
          <div className={cn("relative flex gap-1.5 items-center")}>
            <Input
              value={searchText}
              className=" w-48"
              onChange={(e) => {
                setSearchText(e.target.value);
              }}
              placeholder="Search..."
            />
            <span>
              {results?.length === 0 ? selectedResult : (selectedResult ?? 0) + 1}/{results?.length}
            </span>
            <Button onClick={selectPrevious} size="icon" variant="ghost" className="size-7">
              <IconArrowLeft className="size-4" />
            </Button>
            <Button onClick={selectNext} size="icon" className="size-7" variant="ghost">
              <IconArrowRight className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-7 mx-0.5" />
            <Button
              onClick={() => {
                setReplacing(true);
              }}
              size="icon"
              className="size-7"
              variant="ghost"
            >
              <IconRepeat className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
              }}
              size="icon"
              className="size-7"
              variant="ghost"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className={cn("relative w-full")}>
            <IconX
              onClick={() => {
                setOpen(false);
              }}
              className="absolute right-3 top-3 h-4 w-4 cursor-pointer"
            />
            <div className="flex w-full items-center gap-3">
              <Button
                size="icon"
                className="size-7 rounded-full"
                variant="ghost"
                onClick={() => {
                  setReplacing(false);
                }}
              >
                <IconArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm font-medium">Search and replace</h2>
            </div>

            <div className="my-2 w-full">
              <Field className="mb-3">
                <FieldLabel htmlFor={`${uid}-search`} className="mb-1 text-xs text-gray-11">
                  Search
                </FieldLabel>
                <Input
                  id={`${uid}-search`}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                  }}
                  placeholder="Search..."
                />
                {results?.length === 0 ? selectedResult : (selectedResult ?? 0) + 1}/
                {results?.length}
              </Field>
              <Field className="mb-2">
                <FieldLabel htmlFor={`${uid}-replace-with`} className="mb-1 text-xs text-gray-11">
                  Replace with
                </FieldLabel>
                <Input
                  id={`${uid}-replace-with`}
                  className="w-full"
                  value={replaceText}
                  onChange={(e) => {
                    setReplaceText(e.target.value);
                  }}
                  placeholder="Replace..."
                />
              </Field>
              <Field orientation="horizontal" className="gap-2 mt-3">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(checked: boolean) => {
                    setChecked(checked);
                  }}
                  id="match_case"
                />
                <FieldLabel
                  htmlFor="match_case"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Match case
                </FieldLabel>
              </Field>
            </div>

            <div className="actions mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={selectPrevious}
                  size="icon"
                  className="h-7 w-7"
                  variant="secondary"
                >
                  <IconArrowLeft className="h-4 w-4" />
                </Button>
                <Button onClick={selectNext} size="icon" className="h-7 w-7" variant="secondary">
                  <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="main-actions flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  variant="secondary"
                  onClick={replaceAll}
                >
                  Replace All
                </Button>
                <Button onClick={replace} size="sm" className="h-7 px-3 text-xs">
                  Replace
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
