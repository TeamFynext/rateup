import { Center, CenterProps } from "@mantine/core";

import { Spinner } from "../ui/spinner";

export default function RateupLoader(props: Readonly<CenterProps>) {
  return (
    <Center h="100%" {...props}>
      <Spinner />
    </Center>
  );
}
