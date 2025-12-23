"use client";

import { useState } from "react";
import Link from "next/link";

import { IconFolderCode } from "@tabler/icons-react";
import { ArrowUpRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Rule } from "@/types/rule";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { RuleCard } from "./rule-card";

interface CardViewProps {
  data: Rule[];
  viewMode: "grid" | "list";
  onToggleActive: (item: Rule) => void;
  onDelete: (id: string) => void;
}

export function CardView({
  data,
  viewMode,
  onToggleActive,
  onDelete,
}: Readonly<CardViewProps>) {
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const translations = useTranslations();

  const containerClass =
    viewMode === "grid"
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      : "space-y-3";

  return (
    <div className={containerClass}>
      {data.length === 0 ? (
        <div className="col-span-full">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconFolderCode />
              </EmptyMedia>
              <EmptyTitle>No Automation Yet</EmptyTitle>
              <EmptyDescription>
                You haven&apos;t created any automation yet. Get started by
                creating your first automation.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/dashboard/automation/new">Create Automation</Link>
              </Button>
            </EmptyContent>
            {/* <Button
              variant="link"
              asChild
              className="text-muted-foreground"
              size="sm"
              
            >
              <Link href="https://docs.rateup.app/automation/overview" target="_blank">
                Learn More <ArrowUpRightIcon />
              </Link>
            </Button> */}
          </Empty>
        </div>
      ) : (
        data.map((item) => (
          <Link href={`/dashboard/automation/${item.id}`} key={item.id}>
            <RuleCard
              item={item}
              viewMode={viewMode}
              onToggleActive={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleActive(item);
              }}
              onDelete={(e) => {
                e.preventDefault();
                setDeleteDialogOpened(true);
              }}
            />

            <ConfirmationModal
              forDeleteFunctionality
              opened={deleteDialogOpened}
              onClose={() => setDeleteDialogOpened(false)}
              headerLabel={translations(
                "Are you sure you want to delete this Rule?",
              )}
              headerTitle={translations("Delete Rule")}
              confirmLabel={translations("Delete")}
              onConfirm={() => {
                onDelete(item.id);
                setDeleteDialogOpened(false);
              }}
            />
          </Link>
        ))
      )}
    </div>
  );
}
