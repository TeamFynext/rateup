import React, { useRef, useState, useEffect } from 'react'
import { useQRCode } from 'next-qrcode';
import {
  Paper,
  Text,
  Stack,
  Title, Center
} from "@mantine/core";
import { RateupButtonSecondary } from '../../Button/RateupButtons';
import { IconCheck, IconDownload } from '@tabler/icons-react';
import html2canvas from "html2canvas";
import { notifications } from '@mantine/notifications';

interface iProps {
  url : string,
  title : string,
  description : string,
  textSize : number,
  logoSize: number,
  descriptionSize : number,
  textColor : string,
  descriptionColor : string,
  backgroundColor : string,
  qrColor : string,
  qrBgColor : string,
  logo : string,
  gradient: { start: string; end: string; },
  bgImage: string,
  bgTransparency: number,
  activeBgStyle: string
}
const Preview = ({ url, title, description, textSize, logoSize,
   descriptionSize, textColor, descriptionColor , backgroundColor, qrColor, qrBgColor, logo, 
   gradient, bgTransparency, bgImage, activeBgStyle
  } : iProps) => {

  const { Canvas } = useQRCode();
  const printRef = useRef();

  const [logoUrl, setLogoUrl] = useState('')
  const [bgImgUrl, setBgImgUrl] = useState('')

    // FOR server upload - template setup

  // useEffect(() => {
  //   if(!logo || logo === ''){
  //     setLogoUrl(null)
  //   }else{
  //     const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${logo}`;
  //     setLogoUrl(imgUrl);

  //     notifications.update({
  //       id: "load-data",
  //       title: "Uploaded Logo",
  //       color: "teal",
  //       message: `Success updating the logo`,
  //       withCloseButton: false,
  //       icon: <IconCheck size="1rem" />,
  //       autoClose: 2000,
  //     });
  //   }
  // }, [logo])

  // FOR server upload - template setup

  // useEffect(() => {
  //   if(!bgImage || bgImage === ''){
  //     setBgImgUrl(null)
  //   }else{
  //     const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${bgImage}`;
  //     setBgImgUrl(imgUrl);
  //     console.log(imgUrl)
  //   }
  // }, [bgImage])


  const downloadQrCode = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { backgroundColor: null });

    const data = canvas.toDataURL("image/jpg");
    const link = document.createElement("a");

    if (typeof link.download === "string") {
      link.href = data;
      link.download = "qr-code.jpg";

      document.body.appendChild(link);
      link.click();
    } else {
      window.open(data);
    }
  };

  return (
    <Stack align="center" ml="lg" >
        <Title order={3}> Preview </Title>
        <div ref={printRef}>
        <Paper shadow="xs" radius="lg"  p="md" 
            sx={{ width: "250px", height: "330px", alignContent: 'center', 
            backgroundColor: activeBgStyle === 'Color' ? backgroundColor : 'transparent',
            backgroundImage: activeBgStyle === 'Gradient' 
              ? `linear-gradient(${gradient.start}, ${gradient.end})` 
              : activeBgStyle === 'Image' ? `url(${bgImage})` : 'none',
            opacity: activeBgStyle === 'Transparent' ? bgTransparency : 1
            }}>

            <Stack p="lg" sx={{ opacity: 1}}>

          <Title order={4} sx={{fontSize: `${textSize}px`, color: `${textColor}`}} align='center'> {title} </Title>
          <Center>
            <Canvas
              text={url}
              options={{
                errorCorrectionLevel: 'M',
                margin: 3,
                scale: 4,
                width: 150,
                color: {
                  dark: qrColor,
                  light: qrBgColor,
                },
              }}
              logo={
                logo ? {
                  src: logo,
                  options: {
                    width: logoSize,
                    x: undefined,
                    y: undefined,
                  }
                } : undefined
              }
            />
          </Center>
          
          <Text align='center'  sx={{fontSize: `${descriptionSize}px`, color: `${descriptionColor}`}} > { description }</Text>
          </Stack>

        </Paper>
        </div>

        <RateupButtonSecondary title="Download QR Code" onClick={downloadQrCode} rightIcon={<IconDownload />} />

    </Stack>
  )
}

export default Preview