import { IconAutomation, IconMessage2Code, IconPlus, IconWaveSine } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils.ts";

import WaInboxAutomationDisplayModal from "../automationDisplayModal/index.tsx";
import WaInboxFlowDisplayModal from "../flowDisplayModel/index.tsx";
import WaInboxTemplateDisplayModal from "../templateDisplayModal/index.tsx";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData;
}

export default function WaInboxFooterMenu(props: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [flowModalOpened, setFlowModalOpened] = useState(false);
  const [automationModalOpened, setAutomationModalOpened] = useState(false);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <SessionBasedIndicatorRenderer sessionExpired={props.sessionExpired}>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="Message actions"
                size="icon"
                className={cn(
                  // Bigger where it is a touch target, smaller once it sits in a
                  // dense desktop toolbar.
                  "size-9 rounded-full transition-transform duration-300 lg:size-7.5",
                  menuOpen ? "rotate-[135deg]" : "rotate-0",
                )}
              />
            }
          >
            <IconPlus size={18} />
          </DropdownMenuTrigger>
        </SessionBasedIndicatorRenderer>
        <DropdownMenuContent align="start" className="min-w-[185px] w-full">
          {!props?.sessionExpired && (
            <>
              <DropdownMenuItem
                className="flex items-center gap-2 text-xs cursor-pointer"
                onClick={() => setAutomationModalOpened(true)}
              >
                <IconAutomation size={16} className="text-primary" />
                <span>Initiate Automation</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="flex items-center gap-2 text-xs cursor-pointer"
                onClick={() => setFlowModalOpened(true)}
              >
                <IconWaveSine size={16} className="text-primary" />
                <span>Send WhatsApp Flow</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="flex items-center justify-between text-xs cursor-pointer"
            onClick={() => setIsModalOpened(true)}
          >
            <div className="flex items-center gap-2">
              <IconMessage2Code size={16} className="text-primary" />
              <span>Send WhatsApp Template</span>
            </div>
            {props.sessionExpired && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WaInboxTemplateDisplayModal
        sessionExpired={props.sessionExpired}
        contact={props.contact}
        opened={isModalOpened}
        onClose={() => setIsModalOpened(false)}
      />
      <WaInboxFlowDisplayModal
        sessionExpired={props.sessionExpired}
        contact={props.contact}
        opened={flowModalOpened}
        close={() => setFlowModalOpened(false)}
      />
      <WaInboxAutomationDisplayModal
        sessionExpired={props.sessionExpired}
        contact={props.contact}
        opened={automationModalOpened}
        close={() => setAutomationModalOpened(false)}
      />
    </>
  );
}

const SessionBasedIndicatorRenderer = ({
  sessionExpired,
  children,
}: {
  sessionExpired: boolean;
  children?: React.ReactNode;
}) => {
  if (sessionExpired) {
    return (
      <div className="relative inline-block">
        {children}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
      </div>
    );
  }
  return <>{children}</>;
};
