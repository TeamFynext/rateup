import { Flex, Stack } from "@mantine/core";

import RateupRedirectCard from "@/components/Card/RateupRedirectCard";

function ResponseSubmitted() {
  return (
    <Stack style={{ minHeight: "100vh", gap: 0 }}>
      <Flex style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <p style={{ fontSize: "2rem" }}> Your response has been Submitted</p>
      </Flex>
      <RateupRedirectCard />
    </Stack>
  );
}

export default ResponseSubmitted;
