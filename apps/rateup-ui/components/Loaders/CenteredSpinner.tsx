import { Center, Loader } from "@mantine/core";

export default function CenteredSpinner(props) {
  return (
    <Center h="100%" {...props}>
      <Loader type="bars" />
    </Center>
  );
}
