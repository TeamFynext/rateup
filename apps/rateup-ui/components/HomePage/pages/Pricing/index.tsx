import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "@mantine/hooks";
import {
  Box,
  Flex,
  Image,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import classes from "./Pricing.module.css";
import { usePriceUpdater } from "./Hooks/Hooks";
import { MenuSection } from "./Section/MenuSection";
import { SurveySection } from "./Section/SurveySection";
import { lexend300, lexend500 } from "../../../../utils/fonts";
import {
  BlueGradient,
  defaultPrices,
  DISCOUNT_PERCENTAGE,
  initialPrices,
} from "./Utils/constants";
import { useRouter } from "next/router";
import { useRouteAndCartStore } from "./store/RouteAndCartStore";

const Pricing = () => {
  const [value, setValue] = useState("Surveys");
  const [checked, setChecked] = useState(true);
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const extraLargeScren = useMediaQuery("(min-width: 88em)");
  const { updateRouteAndCart } = useRouteAndCartStore();
  const router = useRouter();

  const getPriceBasedOnLocation = () => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return userTimeZone === "Asia/Calcutta" ? initialPrices : defaultPrices;
  };
  const handlePlanSelection = ({ id, name }) => {
    const route = "/dashboard/settings";
    updateRouteAndCart(route, { id, name });
    router.push(route);
  };
  const price = usePriceUpdater(
    initialPrices,
    getPriceBasedOnLocation,
    checked,
  );

  return (
    <Stack mt={30} align="center" ff={lexend500.style.fontFamily} mb={60}>
      <Box ta={"center"}>
        <Text
          c={"var(--grey-color-4)"}
          fz={"clamp(14px, 9.008px + 0.833vw, 21.008px)"}
        >
          Our Pricing Plans
        </Text>
        <Text
          c={"var(--tertiary-color)"}
          fz={"clamp(24px, 15.424px + 1.429vw, 36px)"}
        >
          Choose what you need
        </Text>
      </Box>
      <SimpleGrid
        cols={{ base: 1, xl: 3 }}
        spacing={extraLargeScren ? "80px" : "40px"}
      >
        <Box display={extraLargeScren ? "block" : "none"} />
        <SegmentedControl
          value={value}
          color="var(--shade-of-blue-7)"
          onChange={setValue}
          classNames={classes}
          fw={500}
          data={[
            { label: "Surveys", value: "Surveys" },
            { label: "Digital Menu", value: "Digital Menu" },
          ]}
        />
        <Flex align="center" pos={"relative"} gap={"xs"}>
          <Switch
            color={"var(--shade-of-blue-5)"}
            classNames={classes}
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
            size="lg"
          />
          <Image
            src={"images/subscriptionArrow.png"}
            h={32}
            w={67}
            pos={"absolute"}
            bottom={"40px"}
            left={"40px"}
          />
          <Stack gap={0} fz={"clamp(14px, 12.576px + 0.238vw, 16px)"}>
            <Text
              c={"var(--light-grey-color-5)"}
              ff={lexend300.style.fontFamily}
            >
              Subscribe Anually
            </Text>
            <Text c={"var(--shade-of-blue-5"}>
              to Save {DISCOUNT_PERCENTAGE}%
            </Text>
          </Stack>
        </Flex>
      </SimpleGrid>

      <AnimatePresence mode="wait">
        <motion.div
          key={value ? value : null}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {value === "Surveys" ? (
            <SurveySection
              largeScreen={largeScreen}
              price={price}
              checked={checked}
              handlePlanSelection={handlePlanSelection}
            />
          ) : (
            <MenuSection
              largeScreen={largeScreen}
              price={price}
              BlueGradient={BlueGradient}
              checked={checked}
              handlePlanSelection={handlePlanSelection}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Stack>
  );
};

export default Pricing;
