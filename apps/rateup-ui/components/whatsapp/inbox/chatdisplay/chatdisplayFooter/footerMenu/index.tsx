import { ActionIcon, Indicator, Menu } from "@mantine/core";
import { IconMessage2Code, IconPlus, IconWaveSine } from "@tabler/icons-react";
import classes from "./styles.module.css";
import WaInboxTemplateDisplayModal from "../templateDisplayModal";
import { WaContact } from "../../../../../../types/global";
import WaInboxFlowDisplayModal from "../flowDisplayModel";
import { useRef } from "react";

interface Props {
  sessionExpired: boolean;
  waContact: WaContact;
}
export default function WaInboxFooterMenu(props: Props) {
  const ref = useRef(null);
  function onOpen() {
    if (ref?.current === null) return;
    ref.current.classList.add(classes.action_icon_rotate);
  }
  function onClose() {
    if (ref?.current === null) return;
    ref.current.classList.remove(classes.action_icon_rotate);
  }
  return (
    <Menu
      position="top-start"
      openDelay={10}
      onOpen={onOpen}
      onClose={onClose}
      closeOnItemClick={false}
      closeOnClickOutside={false}
      zIndex={0}
    >
      <SessionBasedIndicatorRenderer sessionExpired={props.sessionExpired}>
        <Menu.Target>
          <ActionIcon
            ref={ref}
            className={classes.action_icon}
            onClick={(e) => {
              console.log(
                e.currentTarget.classList.add(classes.action_icon_rotate),
              );
            }}
          >
            <IconPlus size={25} />
          </ActionIcon>
        </Menu.Target>
      </SessionBasedIndicatorRenderer>
      <Menu.Dropdown className={classes.menu_dropdown}>
        <Menu.Item
          leftSection={
            <IconMessage2Code color="var(--mantine-primary-color-6)" />
          }
          rightSection={
            <SessionBasedIndicatorRenderer
              sessionExpired={props.sessionExpired}
            />
          }
        >
          <WaInboxTemplateDisplayModal {...props} />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

const SessionBasedIndicatorRenderer = ({
  sessionExpired,
  children,
}: {
  sessionExpired: boolean;
  children?: any;
}) => {
  if (sessionExpired) {
    return (
      <Indicator processing color="green">
        {children}
      </Indicator>
    );
  }
  return children;
};
