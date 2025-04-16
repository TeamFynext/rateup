import { useRef } from "react";

import { ActionIcon, Divider, Indicator, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconMessage2Code, IconPlus, IconWaveSine } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import WaInboxFlowDisplayModal from "../flowDisplayModel";
import WaInboxTemplateDisplayModal from "../templateDisplayModal";
import classes from "./styles.module.css";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData;
  disabled: boolean;
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

  const [isModalOpened, { close: onModalClose, open: openModal }] =
    useDisclosure(false);
  const [flowModalOpened, { close: flowModalClose, open: openFlowModal }] =
    useDisclosure(false);
  const { translations } = useTranslations();
  return (
    <>
      <Menu
        position="top-start"
        openDelay={10}
        onOpen={onOpen}
        onClose={onClose}
        closeOnItemClick={false}
        closeOnClickOutside={true}
        zIndex={10}
        disabled={props.disabled}
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
              disabled={props.disabled}
            >
              <IconPlus size={25} />
            </ActionIcon>
          </Menu.Target>
        </SessionBasedIndicatorRenderer>
        <Menu.Dropdown className={classes.menu_dropdown}>
          <Menu.Item
            leftSection={
              <IconWaveSine color="var(--mantine-primary-color-6)" />
            }
            onClick={openFlowModal}
          >
            Send a Flow
          </Menu.Item>
          <Divider />
          <Menu.Item
            leftSection={
              <IconMessage2Code color="var(--mantine-primary-color-6)" />
            }
            rightSection={
              <SessionBasedIndicatorRenderer
                sessionExpired={props.sessionExpired}
              />
            }
            onClick={() => openModal()}
          >
            {translations["Initiate conversation by sending a template"]}
            {/* <WaInboxTemplateDisplayModal {...props} /> */}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <WaInboxTemplateDisplayModal
        sessionExpired={props.sessionExpired}
        contact={props.contact}
        opened={isModalOpened}
        onClose={onModalClose}
      />
      <WaInboxFlowDisplayModal
        sessionExpired={props.sessionExpired}
        contact={props.contact}
        opened={flowModalOpened}
        close={flowModalClose}
      />
    </>
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
