import { SimpleGrid } from "@mantine/core";

export function SurveyCardLayout({ children }) {
  return (
    <SimpleGrid
      style={{ overflow: "auto" }}
      spacing={"lg"}
      cols={{ base: 4, sm: 2, md: 2, lg: 2, xl: 3 }}
      p={1}
    >
      {children}
    </SimpleGrid>
  );
}
