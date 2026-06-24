import { IconBrandInstagram, IconBrandWhatsapp } from "@tabler/icons-react";
import { Send } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { MessagePlatform } from "@/types/enums.ts";

import { AccountSelector } from "../input/AccountSelector.tsx";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Label } from "../ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Textarea } from "../ui/textarea.tsx";

const SendMessageModal = ({ opened, setOpened, selectedContact }) => {
  const [whatsappSettingsPhoneId, setWhatsappSettingsPhoneId] = useState("");
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<string>(MessagePlatform.WHATSAPP);
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContact.id,
    null,
    whatsappSettingsPhoneId,
    platform as MessagePlatform,
  );
  function handleSendMessage() {
    sendnewWaMessage.mutate(
      { type: "text", text: message },
      {
        onSuccess: () => {
          toast.success("message has been sent");
          setOpened(false);
        },
      },
    );
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>{`Send a message to ${selectedContact.name}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 w-full">
            <Label htmlFor="message-channel">Select Channel</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="message-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MessagePlatform.WHATSAPP}>
                  <div className="flex items-center gap-2">
                    <IconBrandWhatsapp className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </div>
                </SelectItem>
                <SelectItem value={MessagePlatform.INSTAGRAM}>
                  <div className="flex items-center gap-2">
                    <IconBrandInstagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-full">
            <Label htmlFor="message-account">Account</Label>
            <AccountSelector
              value={whatsappSettingsPhoneId}
              onChange={(value) => setWhatsappSettingsPhoneId(value)}
              platform={platform as MessagePlatform}
            />
          </div>
          <div className="space-y-2 w-full">
            <Label htmlFor="message-text">Message</Label>
            <Textarea
              id="message-text"
              placeholder="Type your message here..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (message.trim()) {
                handleSendMessage();
              } else {
                toast.error("Please enter a message");
              }
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageModal;
