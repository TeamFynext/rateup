import { ActionIcon, Button, Group, Popover, Tooltip } from "@mantine/core";
import {
  IconBrandFacebookFilled,
  IconBrandLinkedinFilled,
  IconBrandWhatsappFilled,
  IconBrandXFilled,
  IconCheck,
  IconCopy,
  IconShare,
} from "@tabler/icons-react";
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "next-share";
import { useState } from "react";

export default function SharePopover() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="right">
      <Popover.Target>
        <ActionIcon variant="light" radius="xl" size="lg" onClick={() => setOpened((o) => !o)}>
          <IconShare size={18} />
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown className="flex flex-col gap-3 w-56">
        <Group justify="space-between">
          <Tooltip label="Copy link">
            <Button
              variant="subtle"
              leftSection={
                copied ? <IconCheck size={18} className="text-green-600" /> : <IconCopy size={18} />
              }
              onClick={handleCopy}
              fullWidth
            >
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </Tooltip>
        </Group>

        <Group gap="sm" grow>
          <FacebookShareButton url={url}>
            <ActionIcon component="div" radius="xl" color="blue" variant="filled" size="lg">
              <IconBrandFacebookFilled size={18} />
            </ActionIcon>
          </FacebookShareButton>

          <WhatsappShareButton url={url}>
            <ActionIcon component="div" radius="xl" color="green" variant="filled" size="lg">
              <IconBrandWhatsappFilled size={18} />
            </ActionIcon>
          </WhatsappShareButton>

          <TwitterShareButton url={url}>
            <ActionIcon component="div" radius="xl" color="black" variant="filled" size="lg">
              <IconBrandXFilled size={18} />
            </ActionIcon>
          </TwitterShareButton>

          <LinkedinShareButton url={url}>
            <ActionIcon component="div" radius="xl" color="blue" variant="filled" size="lg">
              <IconBrandLinkedinFilled size={18} />
            </ActionIcon>
          </LinkedinShareButton>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
