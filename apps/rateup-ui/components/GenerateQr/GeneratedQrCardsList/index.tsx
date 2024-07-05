import { Box } from "@mantine/core";
import GeneratedQrCard from "../GeneratedQrCard";

function GenerateQrCardsList({ generatedQrs }) {
  console.log(generatedQrs, "from generate Qr cards list");
  const jsxElementsArray = generatedQrs.map((generateQrObj) => {
    return <GeneratedQrCard {...generateQrObj} />;
  });

  return <Box className="cards-grid-global-class">{jsxElementsArray}</Box>;
}

export default GenerateQrCardsList;
