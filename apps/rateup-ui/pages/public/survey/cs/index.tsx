
import { Title, Paper, Button, Center, Text,  Stack, Container, Image } from "@mantine/core";
import React, {useState} from "react";
import { RateupButtonSecondary } from "../../../../components/Button/RateupButtons";
import Link from 'next/link';

const index = () => {

  const [startClicked, setStartClicked] = useState(false);

  return (

      <Container fluid px="10vw" py="5vh"  sx={{ background: '#F7F6FB',  height: "100vh" }}>
          <>
          <Image pb={30} 
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} 
              alt="RateUp Logo" width={140} height={35} />

          </>
          <Paper  p="sm" radius="lg" shadow="lg" sx={{ minHeight: "80vh" }}>
            <Container fluid>

            {startClicked 
            ?
            <StartPage />
            :
            <Welcome setStartClicked={setStartClicked} />
            }

            </Container>

          <Center>
            <Text  fz="sm">Powered by </Text>
            <Image pl={10 }src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={80} height={20} />
          </Center>
          
          </Paper>

      </Container>
  );
};


function Welcome({ setStartClicked }) {
  return (
    <>
      {/* .........Survey Welcome page.......... */}
      <Stack align="center" justify="center" spacing="xl" sx={{ height: "70vh" }}>
            <Title order={1} sx={{fontSize: '4rem', }}>Welcome</Title>
            <Text >Please fill the survey..</Text>
            <RateupButtonSecondary radius={"xl"} title="Start Survey" size="lg" onClick={() => {setStartClicked(true)}}/>
      </Stack>
      </>
  );
}

let survey1="https://www.rateup.app/public/survey/cd0083d5-edd7-43c0-acc9-a206517e1e47?start=true"
let survey2="https://www.rateup.app/public/survey/ef9cae16-22bb-496c-b238-d896a14aa429?start=true"
let survey3="https://www.rateup.app/public/survey/c0b79b80-57ca-47a7-98d0-089f42cd6cbe?start=true"

function StartPage(){
  return <Stack align="center" justify="center" spacing="xl" sx={{ height: "70vh" }}>
                <Title order={3} mb="xl" pb="sm" sx={{fontSize: '3rem', }}>Select one option :</Title>

    <Link href={`${survey1}`}>

        <Button variant="outline" size="lg">
            I Have Ration Card & Aadhaar Card
        </Button>   
        
    </Link>

    <Link href={`${survey2}`}>

      <Button variant="outline" size="lg">
          I have Aadhaar only  [No Ration Card]
      </Button>   

    </Link>

    <Link href={`${survey3}`}>

      <Button variant="outline" size="lg">
          I have No Aadhaar & Ration Card
      </Button>   

    </Link>

  </Stack>
}


export default index
