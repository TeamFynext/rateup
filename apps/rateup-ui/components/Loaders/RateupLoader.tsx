import { Center, Loader } from "@mantine/core";

export default function RateupLoader(props) {
  return (
    <Center h="100%" {...props}>
      <Loader type="bars" />
    </Center>
  );
}
