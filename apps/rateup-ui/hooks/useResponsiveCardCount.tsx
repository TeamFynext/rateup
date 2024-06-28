import { useMediaQuery } from "@mantine/hooks";

const useResponsiveCardCount = () => {
  const isLarge = useMediaQuery("(min-width: 1200px)");
  const isMedium = useMediaQuery("(min-width: 992px)");
  const isExtraLarge = useMediaQuery("(min-width: 1600px)");

  if (isExtraLarge) return 16;
  if (isLarge) return 9;
  if (isMedium) return 4;
  return 2;
};

export default useResponsiveCardCount;
