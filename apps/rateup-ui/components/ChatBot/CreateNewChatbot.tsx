"use client";

import { useState } from "react";

import { Button, Modal, Stack, TextInput } from "@mantine/core";

import { RateupButtonBlue } from "../Button/RateupButtons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const CreateNewChatbot = ({ isOpen, onClose, onCreate }: Props) => {
  const [newChatbotName, setNewChatbotName] = useState("");

  const handleSubmit = () => {
    if (!newChatbotName.trim()) return;
    onCreate(newChatbotName);
    setNewChatbotName("");
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Create New Chatbot"
      centered
      size="sm"
      overlayProps={{ blur: 2, opacity: 0.2 }}
    >
      <Stack p="sm">
        <TextInput
          label="Chatbot Name"
          placeholder="e.g. Customer Support Bot"
          value={newChatbotName}
          onChange={(e) => setNewChatbotName(e.currentTarget.value)}
          required
          radius="md"
        />
        <RateupButtonBlue title="Create New Chatbot" onClick={handleSubmit} />
      </Stack>
    </Modal>
  );
};

export default CreateNewChatbot;
