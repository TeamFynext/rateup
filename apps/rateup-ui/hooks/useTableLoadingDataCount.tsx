import { useMediaQuery } from "@mantine/hooks";

const useTableLoadingDataCount = () => {
  const isLarge = useMediaQuery("(min-width: 1200px)");
  const isMedium = useMediaQuery("(min-width: 992px)");
  const isExtraLarge = useMediaQuery("(min-width: 1600px)");

  if (isExtraLarge) return 12;
  if (isLarge) return 7;
  if (isMedium) return 4;
  return 5;
};

export default useTableLoadingDataCount;
