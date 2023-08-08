import { Center, Container, Stack , Paper, Title, Text,Image } from "@mantine/core";
import {  IconCircleCheck, IconJewishStar } from "@tabler/icons-react";
import React, {useState, useEffect} from "react";
import { useRouter } from "next/router";
import { RateupButtonPrimary } from "../../../../components/Button/RateupButtons";
import { usePublicSurveyGoogleLink } from "../../../../backend/surveys/surveys.query";
import Link from 'next/link';

export default function ThankYou() {

  const router = useRouter();
  const { msg } = router.query;
  const { k } = router.query as { k: string }
  const { surveyId } = router.query as { surveyId: string };

  const [enableGoogleReview, setEnableGoogleReview] = useState(false)

  const { isLoading, isError, data: googleLink } = usePublicSurveyGoogleLink(surveyId);

  useEffect(() => {
    console.log(JSON.stringify(googleLink))
  }, [googleLink])

  useEffect(() => {
    msg === 'thanks' && setEnableGoogleReview(true)
  }, [router, msg])

  useEffect(() => {
    if (k === 'y') {
        const timeoutId = setTimeout(() => {
            router.push(`/public/survey/${surveyId}`);
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
            <Title order={1} sx={{fontSize: '4rem'}}>Thank you</Title>
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

            <Center mb={30}  sx={{ position: 'absolute' , bottom: '10vh'}}>
            <Text fz="sm">Powered by </Text>
            <Image pl={10 }src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={80} height={20} />

      </Center>
      </Stack>
      </Center>


    </Container>
  );
}
