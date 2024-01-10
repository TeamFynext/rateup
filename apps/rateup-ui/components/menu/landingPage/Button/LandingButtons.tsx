import { Image, Stack, Text } from "@mantine/core";
import PaperLayout from "../../../styled/Layouts/PaperLayout";

export function FeedbackButton(largeScreen: boolean) {
  return (
    <Stack justify={"space-between"} align={"center"} gap={0}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/feedback.png`}
        w={largeScreen ? "52px" : "45px"}
        h={"52px"}
        alt="feedback image"
      />
      <Text fw={"600"} mt={largeScreen && 8}>
        Feedback
      </Text>
    </Stack>
  );
}

export function MenuButton(largeScreen: boolean) {
  return (
    <Stack justify={"center"} align={"center"}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/menu.png`}
        w={largeScreen ? "52px" : "45px"}
        h={"52px"}
        mih={largeScreen ? "30px" : "15px"}
        alt="menu image"
      />
      <Text fw={"600"} mt={largeScreen && 8}>
        Menu
      </Text>
    </Stack>
  );
}

export function CatalogueButton(largeScreen: boolean) {
  return (
    <Stack justify={"center"} align={"center"} gap={0}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/catalogue.png`}
        w={largeScreen ? "52px" : "45px"}
        h={"52px"}
        alt="Catalogue image"
      />
      <Text fw={"600"} mt={largeScreen && 8}>
        Catalogue
      </Text>
    </Stack>
  );
}

export function LogoSelectCard({
  catalogue,
  setCatalogue,
  form,
  type,
}: {
  catalogue: string;
  setCatalogue: React.Dispatch<React.SetStateAction<string>>;
  form: any;
  type: boolean;
}) {
  return (
    <PaperLayout
      radius={"md"}
      p={"lg"}
      // h={"120px"}
      w={"120px"}
      mih={80}
      hoveractive
      selected={type ? catalogue === "catalogue" : catalogue === "menu"}
      onClick={() => {
        if (type) {
          setCatalogue("catalogue");
          form.setFieldValue("catalogue", true);
        } else {
          setCatalogue("menu");
          form.setFieldValue("catalogue", false);
        }
      }}
    >
      {type ? CatalogueButton(true) : MenuButton(true)}
    </PaperLayout>
  );
}
