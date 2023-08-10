import { Center, Container, Group, Stack , Paper, Title, Text,Image } from "@mantine/core";
import {  IconCircleCheck, IconHome, IconJewishStar } from "@tabler/icons-react";
import React, {useState, useEffect} from "react";
import { useRouter } from "next/router";
import { RateupButtonBlue, RateupButtonPrimary } from "../../../../components/Button/RateupButtons";
import { usePublicSurveyGoogleLink } from "../../../../backend/surveys/surveys.query";
import Link from 'next/link';
import { useMediaQuery } from '@mantine/hooks';

export default function ThankYou() {
  const largeScreen = useMediaQuery('(min-width: 60em)');
  const router = useRouter();
  const { msg } = router.query;
  const { k } = router.query as { k: string } //kioskMode
  const { surveyId } = router.query as { surveyId: string };

  const [enableGoogleReview, setEnableGoogleReview] = useState(false)

  const { isLoading, isError, data: googleLink } = usePublicSurveyGoogleLink(surveyId);

  useEffect(() => {
    console.log(JSON.stringify(googleLink))
  }, [googleLink])

  useEffect(() => {
    msg === 'thanks' && setEnableGoogleReview(true)
  }, [router, msg])

  useEffect(() => {  //kioskMode redirect
    if (k === 'y' || k ==='cs') {
        const timeoutId = setTimeout(() => {
          k ==='cs' ? router.push(`/public/survey/cs`) : router.push(`/public/survey/${surveyId}`);
        }, 5000);
        
        return () => {
            clearTimeout(timeoutId); 
        };
    }
}, [k]);
 
  // TODO: add customisable thankyou page
  return (
    <Container sx={{  background: '#F7F7F7' }}>
      <Center sx={{ height: "100vh" }}>
        <Stack align="center" justify="center" spacing="xl" sx={{ height: "80vh" }}>
            <IconCircleCheck size={"4rem"}/>
            <Title order={1} sx={{fontSize: largeScreen ? '4rem' : "3rem"}}>Thank you</Title>
            <Text sx={{fontSize: '1.3rem'}}> For submitting the response.</Text>

            {
              enableGoogleReview               
              && !isLoading && googleLink?.length > 4 && <Paper p="xl" my="xl" radius="md">
                <Stack>
                  <Text>
                      Kindly Leave a Google Review
                  </Text>

                  { isLoading ? " " : googleLink &&
                    <Link href={`${googleLink}`} target="_blank">
                    <RateupButtonPrimary leftIcon={<IconJewishStar />} title="Go to Review Page" />
                    </Link>
                  }
                
                </Stack>
              </Paper>
            }

            { k==="cs" &&
            <Group m="xl" p="xl">
                  <Link href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/cs`} target="_blank">
                   <RateupButtonBlue leftIcon={<IconHome />} title="Go to Home" />
                  </Link>

                  </Group>
            }
                

            <Center mb={30}  sx={{ position: 'absolute' , bottom: '10vh'}}>
            <Text fz="sm">Powered by </Text>
            <Image pl={10 }src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={80} height={20} />

      </Center>
      </Stack>
      </Center>


    </Container>
  );
}
