import { Switch, Flex } from "@mantine/core";
import { useRouter } from "next/router";
import { IconMaximize, IconMaximizeOff } from "@tabler/icons-react";
interface focusmodeInterface {
  focus: boolean;
  toggleFocus: (focus: boolean) => void;
}
const commonStyles = {
  width: 15,
  height: 15,
};
export default function FocusMode({ focus, toggleFocus }: focusmodeInterface) {
  const router = useRouter();
  if (
    router.pathname
      .split("/")
      .filter((x) => x)
      .includes("surveys")
  ) {
    return (
      <Flex pos={"fixed"} bottom={0} p={10} top={0} right={0}>
        <Switch
          checked={focus}
          onChange={() => toggleFocus(!focus)}
          offLabel={
            <IconMaximize
              style={{ ...commonStyles, color: "var(--tertiary-color)" }}
            />
          }
          onLabel={
            <IconMaximizeOff
              style={{ ...commonStyles, color: "var(--primary-color)" }}
            />
          }
          color="var(--tertiary-color)"
        />
      </Flex>
    );
  } else {
    return null;
  }
}
