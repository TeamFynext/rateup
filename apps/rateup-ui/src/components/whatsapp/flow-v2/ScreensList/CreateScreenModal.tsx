"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";

import useFlowStoreV3 from "../utils/store.ts";

interface CreateScreenModalProps {
  opened: boolean;
  close: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Screen title is required" }),
});

// Modal for creating new screens
function CreateScreenModal({ opened, close }: CreateScreenModalProps) {
  const { t: translations } = useTranslation();
  const { addScreenWithTitle } = useFlowStoreV3();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  useEffect(() => {
    if (!opened) {
      form.reset();
    }
  }, [opened, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    addScreenWithTitle(values.title);
    form.reset();
    close();
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations("Create New Screen")}</DialogTitle>
          <DialogDescription>
            {translations("Add a new screen to your flow")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations("Screen Title")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translations("Enter screen title")}
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                {translations("Cancel")}
              </Button>
              <Button type="submit">{translations("Create Screen")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateScreenModal;
