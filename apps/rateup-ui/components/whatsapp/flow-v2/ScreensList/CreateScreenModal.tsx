"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useExtracted } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import useFlowStoreV3 from "../utils/store";

interface CreateScreenModalProps {
  opened: boolean;
  close: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Screen title is required" }),
});

// Modal for creating new screens
function CreateScreenModal({ opened, close }: CreateScreenModalProps) {
  const translations = useExtracted();
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
