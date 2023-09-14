import { Container, Group, Stack , Text, Image, Center, Title, Divider, Box} from '@mantine/core';
import { HomeNavbar } from './Navbar';
import useStyles from './HomePage.styles';
import { RateupButtonPrimary, RateupButtonSecondary } from '../Button/RateupButtons';
import { IconChevronRight } from '@tabler/icons';
import { useMediaQuery } from '@mantine/hooks';
import Link from 'next/link';
import { featuresData } from './FeaturesData';
import ContactForm from './ContactForm';

export function HomePage() {
    const { classes } = useStyles();
    const isMobile = useMediaQuery('(max-width: 480px)');
    const currentYear = new Date().getFullYear();

    return (
        <Container fluid pt="xl" className={classes.layout}>            
            <Container fluid className={classes.wrapContainer}>
                 <HomeNavbar /> 
                <Container fluid >
    {/* Top banner section */}
                    <Group position="apart" my={isMobile ? "100px":"130px"} >
                        <Stack sx={{width: isMobile ? '100%' :'50%'}} pl="xs">
                            <Text fz={isMobile ? "24px" : "36px"}>Boost Your Credibility</Text>
                            <Group  mt="-20px">
                            <Text fz={isMobile ? "24px" : "36px"}>& Get</Text>
                            <Text fz={isMobile ? "24px" : "36px"} fw={700}ml="-7px">Rated Up</Text>

                            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/sparkles.png`}
                        width={40} height={40} />
                            </Group>

                            <Text fz="20px" mb="lg">With Rate Up's <b>Loyalty Experience Platform</b>, you can connect with,
                                interact with, and expand your customer connections.</Text>

                            <RateupButtonSecondary mt="xl" rightIcon={<IconChevronRight />} 
                            sx={{maxWidth:"200px"}}
                            size="lg"
                            title="Get Started"/>

                        </Stack>
                        <Stack sx={{maxWidth: isMobile ? '100vw' :'50%'}}>
                            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/b1.png`}
                            width={465} height={300} />
                        </Stack>    
                    </Group>
                </Container>
            </Container>

    {/* Clients section*/}

        <Container fluid className={classes.yellowBox} >
            <Center className={classes.wrapContainer}>
                    <Text align='center' fz="xs" fw={500} mt="xl">TRUSTED BY TOP BUSINESSES</Text>
            </Center>
        </Container>

    {/* Features sections*/}
        <Container fluid className={`${classes.whiteBox}`} mt="-40px" py="100px">
            <Box className={classes.wrapContainer}>
            <Title align="center" order={2} mb="xl" size="48px"> Our Features </Title>
            
            {featuresData.map((feature, index) => (
                index % 2 === 0 ? (
                <FeatureLeft
                    key={index}
                    feature={feature.feature}
                    title={feature.title}
                    description={feature.description}
                    img={feature.img}
                    w={feature.w}
                    h={feature.h}
                />
                ) : (
                <FeatureRight
                    key={index}
                    feature={feature.feature}
                    title={feature.title}
                    description={feature.description}
                    img={feature.img}
                    w={feature.w}
                    h={feature.h}
                />
                )
            ))}
            </Box>
        </Container>

            <Container fluid  className={`${classes.horizontalGaps} `} py="80px">

                    <Stack>

                        <Title align='center' size={isMobile ? "38px" : "56px"} order={1} color="#2564AE"> Obtain the standing you deserve </Title>
                        <Text align='center'  size="20px" mt="sm">Reviews enable new businesses to stand shoulder to shoulder with more established competition,<br/> and potentially gain a positive niche in people’s estimation and expectations</Text>
                        <Center mt="xl">
                        <Image mt="sm" src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/b2.png`}
                        width={280} height={260} />                    </Center>

                                        </Stack>


            </Container>

    {/* Blue Box */}
            <Container fluid  className={` ${classes.blueBox}`} >
                
                <Group position='apart' className={classes.wrapContainer}> 
                    <Stack sx={{maxWidth: isMobile ? '100%' :'60%'}}>
                        <Title order={2} size={isMobile ? "38px" : "60px"} >Our loyalty programme</Title>

                        <Text  size="20px">Make a distinctive loyalty programme that encourages people to choose to engage actively with your business.
                             You'll generate more income from your current customers through stronger interaction between purchases, 
                             higher rates of repeat business, and greater customer advocacy, 
                            all while defending your profit margins from excessive discounting and rising acquisition expenses.</Text>
                        
                    </Stack> 

                    <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/loyalty.png`}
                        width={250} height={250} />


                </Group>

            </Container>

         
    {/*... Contact Form.... */}

         <ContactForm />


    {/*... Footer.... */}


            <Container fluid  className={`${classes.horizontalGaps}`} pt="80px" pb="30px">

                <Stack> 

                        <Center>

                        <Link href="/">
                            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={150} height={40} />
                        </Link>

                        </Center>


                    <Group   position="center" spacing="xl" className={`${classes.footerNav}`}>
                        
                         <Link href="#">
                            <Text fz="sm">About us</Text>
                        </Link>
                        <Link href="#">
                            <Text fz="sm">Contact</Text>
                        </Link>
                        <Link href="#">
                            <Text fz="sm">Solutions</Text>
                        </Link>
                        <Link href="#">
                            <Text fz="sm">Resources</Text>
                        </Link>
                    </Group>

                    <Divider my="sm" />

                    <Text align='center' fz="xs" color='gray'> Copyright &copy; {currentYear} All rights reserved</Text>


       
                </Stack>


            </Container>
                
        </Container>
    );
}

const FeatureLeft = ({ feature, title, description, img, w, h }) => {
    const isMobile = useMediaQuery('(max-width: 480px)');
    return (
      <Group position="apart" mt="100px">
        <Stack sx={{width: isMobile ? '100%' :'50%'}} >
          <Text fz="24px" fw={700} color="yellow">{feature}</Text>
          
          <Text fz="40px" fw="700" mt="-20px">{title}</Text>
          <Text fz="20px" mb="lg">{description}</Text>
          
          <RateupButtonPrimary mt="xl" rightIcon={<IconChevronRight />} 
          sx={{ maxWidth: "200px" }} size="md" title="Explore More" />
        </Stack>
        <Stack>
          <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/${img}`} width={w} height={h} />
        </Stack>
      </Group>
    );
};

const FeatureRight = ({ feature, title, description, img, w, h }) => {
    const isMobile = useMediaQuery('(max-width: 480px)');
    return (
      <Group position="apart" mt="100px">
         <Stack >
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/${img}`}
                        width={w} height={h} />
        </Stack>    
        <Stack sx={{width: isMobile ? '100%' :'60%'}}>
            <Text fz="24px" fw={700} color="yellow">{feature}</Text>
            <Text fz="40px" fw="700" mt="-20px">{title}</Text>
            <Text fz="20px" mb="lg">{description} </Text>

            <RateupButtonPrimary mt="xl" rightIcon={<IconChevronRight />} 
            sx={{maxWidth:"200px"}}
            size="md"
            title="Explore More"/>
         </Stack>    
      </Group>
    );
};
