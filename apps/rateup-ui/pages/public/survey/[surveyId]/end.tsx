import { Center, Container, Stack , Title, Text,Image } from "@mantine/core";
import {  IconCircleCheck } from "@tabler/icons-react";
import React from "react";

export default function ThankYou() {
  // TODO: add customisable thankyou page
  return (
    <Container sx={{  background: '#F7F7F7' }}>
      <Center sx={{ height: "100vh" }}>
        <Stack align="center" justify="center" spacing="xl" sx={{ height: "80vh" }}>
            <IconCircleCheck size={"4rem"}/>
            <Title order={1} sx={{fontSize: '4rem'}}>Thank you</Title>
            <Text sx={{fontSize: '1.3rem'}}> For submitting the response.</Text>

            <Center mb={30}  sx={{ position: 'absolute' , bottom: '10vh'}}>
            <Text fz="sm">Powered by </Text>
            <Image pl={10 }src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={80} height={20} />
      </Center>
      </Stack>
      </Center>


    </Container>
  );
}
