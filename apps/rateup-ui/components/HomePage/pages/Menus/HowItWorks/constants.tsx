import Image from "next/image";
import {
  Heading,
  DescriptionP,
  DescriptionPSpan,
  imagePath,
  videoClassName,
} from "../../constants";

export const howItWorksTextIllustrations = [
  {
    id: 10194,
    heading: (
      <Heading>
        <span>COMPATIBILITY</span>
        <span>Compatible with all screen sizes</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Compatible with all screen sizes, Our digital menus have a built-in
        responsive engine which allows them to be compatible with all screen
        sizes, <DescriptionPSpan text="from phones to even PCs." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/menus-page/how-it-works/compatibility.png`}
        width={1982}
        height={1443}
        alt="Compatible with all screen sizes"
      />
    ),
  },
  {
    id: 10195,
    heading: (
      <Heading>
        <span>CUSTOMISATION</span>
        <span>Easily Customisable</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Our menus are easily accessible by a QR code which you can customize
        with our customization tool. You can{" "}
        <DescriptionPSpan text="customize the color, design, and even add your logo." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/menus-page/how-it-works/customization.png`}
        width={1982}
        height={1443}
        alt="Easily Customisable"
      />
    ),
  },
  {
    id: 10196,
    heading: (
      <Heading>
        <span>ACCESSIBLE</span>
        <span>Easily accessible</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Compatible with all screen sizes, Our digital menus have a built-in
        responsive engine which allows them to be compatible with all screen
        sizes, <DescriptionPSpan text="from phones to even PCs." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/menus-page/how-it-works/easily-accessible.png`}
        width={1982}
        height={1443}
        alt="Easily accessible"
      />
    ),
  },
];
