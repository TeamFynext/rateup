import type { CenterProps } from "@mantine/core";
import { Center } from "@mantine/core";

import { Spinner } from "../ui/spinner.tsx";

export default function RateupLoader(props: Readonly<CenterProps>) {
  return (
    <Center h="100%" {...props}>
      <Spinner />
    </Center>
  );
}
