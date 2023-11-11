import React, { useEffect, useRef, useState } from "react";
import { Paper, Text, Stack, Title, Center } from "@mantine/core";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { IconDownload } from "@tabler/icons-react";
import html2canvas from "html2canvas";

interface iProps {
  url: string;
  title: string;
  description: string;
  textSize: number;
  logoFilter: string;
  logoFillType: string;
  descriptionSize: number;
  textColor: string;
  descriptionColor: string;
  backgroundColor: string;
  qrSize: number;
  qrBgColor: string;
  logo: string;
  gradient: { start: string; end: string };
  bgImage: string;
  bgTransparency: number;
  activeBgStyle: string;
}
const Preview = ({
  url,
  title,
  description,
  textSize,
  descriptionSize,
  textColor,
  descriptionColor,
  backgroundColor,
  qrSize,
  qrBgColor,
  logo,
  logoFilter,
  logoFillType,
  gradient,
  bgTransparency,
  bgImage,
  activeBgStyle,
}: iProps) => {
  const printRef = useRef();
  const qartCanvasContainerRef = useRef(null);

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

  useEffect(() => {
    const qartCanvasContainer = qartCanvasContainerRef.current;
    const createCanvas = async () => {
      const QArt = (await import("qartjs")).default;
      const qart = new QArt({
        value: url,
        imagePath: logo,
        size: qrSize,
        filter: logoFilter,
        background: qrBgColor,
        fillType: logoFillType,
      });
      if (qartCanvasContainer) {
        qart.make(qartCanvasContainer);
      }
    };
    createCanvas();
  }, [url, logo, logoFilter, qrBgColor, qrSize, logoFillType]);

  return (
    <Stack align="center" ml="lg">
      <Title order={3}> Preview </Title>
      <div ref={printRef}>
        <Paper
          shadow="xs"
          radius="lg"
          p="md"
          style={{
            width: "250px",
            height: "auto",
            alignContent: "center",
            backgroundColor:
              activeBgStyle === "Color" ? backgroundColor : "transparent",
            backgroundImage:
              activeBgStyle === "Gradient"
                ? `linear-gradient(${gradient.start}, ${gradient.end})`
                : activeBgStyle === "Image"
                ? `url(${bgImage})`
                : "none",
            backgroundSize: "cover",
            opacity: activeBgStyle === "Transparent" ? bgTransparency : 1,
          }}
        >
          <Stack p="lg" style={{ opacity: 1 }}>
            <Title
              order={4}
              style={{
                fontSize: `${textSize}px`,
                color: `${textColor}`,
                textAlign: "center",
              }}
            >
              {" "}
              {title}{" "}
            </Title>
            <Center>
              <div
                className="qart-canvas-container"
                ref={qartCanvasContainerRef}
              ></div>
              {/* QR background image is not getting displayed without this img tag */}
              <img src={logo} style={{ width: 0, height: 0 }} />
            </Center>

            <Text
              style={{
                fontSize: `${descriptionSize}px`,
                color: `${descriptionColor}`,
                textAlign: "center",
              }}
            >
              {" "}
              {description}
            </Text>
          </Stack>
        </Paper>
      </div>

      <RateupButtonBlue
        title="Download QR Code"
        onClick={downloadQrCode}
        rightIcon={<IconDownload />}
      />
    </Stack>
  );
};

export default Preview;
