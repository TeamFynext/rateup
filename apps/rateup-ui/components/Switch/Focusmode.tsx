import { Paper } from "@mantine/core";
import { useRouter } from "next/router";
import { IconMaximize, IconMaximizeOff } from "@tabler/icons-react";
interface focusmodeInterface {
  focus: boolean;
  toggleFocus: (focus: boolean) => void;
}
export default function FocusMode({ focus, toggleFocus }: focusmodeInterface) {
  const router = useRouter();
  if (
    router.pathname
      .split("/")
      .filter((x) => x)
      .includes("surveys")
  ) {
    return (
      <Paper
        pos={"fixed"}
        p={10}
        bottom={5}
        right={5}
        w="50px"
        h={"50px"}
        withBorder
        radius={"50%"}
        shadow={"sm"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 500,
        }}
        onClick={() => toggleFocus(!focus)}
        bg="var(--tertiary-color)"
      >
        {focus ? (
          <IconMaximizeOff style={{ color: "var(--primary-color)" }} />
        ) : (
          <IconMaximize style={{ color: "var(--primary-color)" }} />
        )}
      </Paper>
    );
  } else {
    return null;
  }
}
