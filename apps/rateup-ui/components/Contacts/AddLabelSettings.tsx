"use client";

import React from "react";

import { Indicator } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCircleX } from "@tabler/icons-react";

import { useChatFilterStore } from "../whatsapp/inbox/chatselect/chatFilter";
import { LabelForm } from "./label-form";

const AddLabelModal = () => {
  return <LabelForm close={modals.closeAll} />;
};

export default AddLabelModal;

export const ClearLabelIcon = (props) => {
  const chatFilterStore = useChatFilterStore();
  if (!chatFilterStore?.filter?.labels?.length)
    return <IconCircleX {...props} />;
  return (
    <div className="flex">
      <Indicator
        label={chatFilterStore?.filter?.labels?.length}
        inline
        size={16}
        color="black"
      >
        <IconCircleX {...props} />
      </Indicator>
    </div>
  );
};
