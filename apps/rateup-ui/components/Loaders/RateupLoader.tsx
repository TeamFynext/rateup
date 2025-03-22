import { Center, CenterProps, Loader } from "@mantine/core";

export default function RateupLoader(props: CenterProps) {
  return (
    <Center h="100%" {...props}>
      <Loader type="bars" />
    </Center>
  );
}
