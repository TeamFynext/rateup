"use client";

import { useState } from "react";

import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { useTranslations } from "next-intl";

import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { FlowMaxScreens } from "../../whatsappConfig";
import useFlowStoreV3 from "../utils/store";
import CreateScreenModal from "./CreateScreenModal";
import styles from "./ScreensList.module.css";

const cx = classNames.bind(styles);

function ScreensList() {
  const translations = useTranslations();
  const [createModalOpened, setCreateModalOpened] = useState(false);

  const { screens, currentScreenId, setCurrentScreenId, deleteScreen } =
    useFlowStoreV3();

  const handleAddScreen = () => {
    if (screens.length >= FlowMaxScreens) {
      alert(`Maximum ${FlowMaxScreens} screens allowed`);
      return;
    }
    setCreateModalOpened(true);
  };

  return (
    <div className={styles["screens-list-container"]}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold">{translations("Screens")}</h2>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleAddScreen}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <IconPlus size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{translations("Add Screen")}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <p className="text-xs text-muted-foreground ">
        {translations("Build your flow step by step")}
      </p>

      <div className="space-y-2 mt-4">
        {screens.map((screen, index) => (
          <ScreenCard
            key={screen.id}
            screen={screen}
            index={index}
            isSelected={screen.id === currentScreenId}
            onSelect={() => setCurrentScreenId(screen.id)}
            onDelete={() => deleteScreen(screen.id)}
          />
        ))}
      </div>

      <CreateScreenModal
        opened={createModalOpened}
        close={() => setCreateModalOpened(false)}
      />
    </div>
  );
}

interface ScreenCardProps {
  screen: any;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ScreenCard({
  screen,
  index,
  isSelected,
  onSelect,
  onDelete,
}: ScreenCardProps) {
  const translations = useTranslations();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const handleDelete = () => {
    onDelete();
    setDeleteModalOpened(false);
  };

  return (
    <>
      <div
        className={cx("screen-card", { selected: isSelected })}
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          <IconGripVertical size={16} className={styles["drag-handle"]} />
          <div className={styles["screen-number"]}>{index + 1}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate leading-5">
              {screen.title || `Screen ${index + 1}`}
            </p>
            <p className="text-xs text-muted-foreground leading-4 mt-0.5">
              {screen.layout?.children?.filter((c) => c.type !== "Footer")
                .length || 0}{" "}
              {translations("elements")}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModalOpened(true);
            }}
          >
            <IconTrash size={14} />
          </Button>
        </div>
      </div>

      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        headerLabel={translations(
          "Are you sure you want to delete this screen? All elements will be deleted.",
        )}
        headerTitle={translations("Delete Screen?")}
        confirmLabel={translations("Delete")}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default ScreensList;
