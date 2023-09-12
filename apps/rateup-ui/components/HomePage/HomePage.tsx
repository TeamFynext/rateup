import { Container, Group, Stack , Text, Image, Center, Title, TextInput, Textarea, Divider} from '@mantine/core';
import { HomeNavbar } from './Navbar';
import useStyles from './HomePage.styles';
import { RateupButtonPrimary, RateupButtonSecondary } from '../Button/RateupButtons';
import { IconChevronRight } from '@tabler/icons';
import { useMediaQuery } from '@mantine/hooks';
import Link from 'next/link';
import { featuresData } from './FeaturesData';

export function HomePage() {
    const { classes } = useStyles();
    const isMobile = useMediaQuery('(max-width: 480px)');
    const currentYear = new Date().getFullYear();

    return (
        <Container fluid pt="xl" className={classes.layout}>            
            <Container fluid className={classes.horizontalGaps}>
                 <HomeNavbar /> 
                <Container fluid >
    {/* Top banner section */}
                    <Group position="apart" mt="90px" mb="130px">
                        <Stack sx={{width: '50%'}}>
                            <Text fz="xl">Boost Your Credibility</Text>
                            <Group  mt="-20px">
                            <Text fz="xl">& Get</Text>
                            <Text fz="xl" fw={700}ml="-7px">Rated Up</Text>

                            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/sparkles.png`}
                        width={40} height={40} />
                            </Group>

                            <Text fz="xs" mb="lg">With Rate Up's <b>Loyalty Experience Platform</b>, you can connect with,
                                interact with, and expand your customer connections.</Text>

                            <RateupButtonSecondary mt="xl" rightIcon={<IconChevronRight />} 
                            sx={{maxWidth:"200px"}}
                            size="md"
                            title="Get Started"/>

                        </Stack>
                        <Stack >
                        <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/b1.png`}
                        width={465} height={300} />
                        </Stack>    
                    </Group>
                </Container>
            </Container>

    {/* Clients section*/}

        <Container fluid className={classes.yellowBox} >
            <Center>
                    <Text align='center' fz="xs" fw={500} mt="xl">TRUSTED BY TOP BUSINESSES</Text>
            </Center>
        </Container>

    {/* Features sections*/}
        <Container fluid className={`${classes.horizontalGaps} ${classes.whiteBox}`} mt="-40px" py="100px">
            <Title align="center" order={2} mb="xl"> Our Features </Title>
            
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
        </Container>

            <Container fluid  className={`${classes.horizontalGaps} `} py="80px">

                    <Stack>

                        <Title align='center' order={1} color="#2564AE"> Obtain the standing you deserve </Title>
                        <Text align='center' >Reviews enable new businesses to stand shoulder to shoulder with more established competition,<br/> and potentially gain a positive niche in people’s estimation and expectations</Text>
                        <Center mt="xl">
                        <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/b2.png`}
                        width={250} height={230} />                    </Center>

                                        </Stack>


            </Container>

    {/* Blue Box */}
            <Container fluid  className={`${classes.horizontalGaps} ${classes.blueBox}`} >
                
                <Group position='apart'> 
                    <Stack sx={{maxWidth:"60%"}}>
                        <Title order={2}>Our loyalty programme</Title>

                        <Text>Make a distinctive loyalty programme that encourages people to choose to engage actively with your business.
                             You'll generate more income from your current customers through stronger interaction between purchases, 
                             higher rates of repeat business, and greater customer advocacy, 
                            all while defending your profit margins from excessive discounting and rising acquisition expenses.</Text>
                        
                    </Stack> 

                    <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/loyalty.png`}
                        width={200} height={200} />


                </Group>

            </Container>

         
    {/*... Contact Form.... */}

            <Container fluid  className={`${classes.horizontalGaps}`} py="100px">
                
                <Stack> 
                    <Title order={2} sx={{fontSize: "36px"}} mb="md">Get in touch</Title>

                    <Group > 

                            <TextInput
                                sx={{ maxWidth: "50%" }}
                                label="Name"
                                placeholder="Enter your full name"
                               // {...contactForm.getInputProps("name")}
                                withAsterisk
                            />

                            <TextInput
                                sx={{ maxWidth: "50%" }}
                                label="Email"
                                placeholder="Enter your email"
                                withAsterisk
                            />

                    </Group>


                    <Textarea
                        placeholder="Enter the message"
                        label="Message"
                        withAsterisk
                        />

                    <RateupButtonSecondary mt="xl" rightIcon={<IconChevronRight />} 
                        sx={{maxWidth:"200px"}}
                        size="md"
                        title="Send Message"/>



                </Stack>

            </Container>


    {/*... Footer.... */}


            <Container fluid  className={`${classes.horizontalGaps}`} pt="80px" pb="30px">

                <Stack> 

                        <Center>

                        <Link href="/dashboard">
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
    return (
      <Group position="apart" mt="100px">
        <Stack sx={{ width: '50%' }}>
          <Text fz="sm" fw={700} color="yellow">{feature}</Text>
          
          <Text fz="xl" fw="700" mt="-20px">{title}</Text>
          <Text fz="xs" mb="lg">{description}</Text>
          
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
    return (
      <Group position="apart" mt="100px">
         <Stack >
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/homepage/${img}`}
                        width={w} height={h} />
        </Stack>    
        <Stack sx={{width: '60%'}}>
            <Text fz="sm" fw={700} color="yellow">{feature}</Text>
            <Text fz="xl" fw="700" mt="-20px">{title}</Text>
            <Text fz="xs" mb="lg">{description} </Text>

            <RateupButtonPrimary mt="xl" rightIcon={<IconChevronRight />} 
            sx={{maxWidth:"200px"}}
            size="md"
            title="Explore More"/>
         </Stack>    
      </Group>
    );
};
