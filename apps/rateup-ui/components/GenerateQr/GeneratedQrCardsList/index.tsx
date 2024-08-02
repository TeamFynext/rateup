import { Box } from "@mantine/core";

import GeneratedQrCard from "../GeneratedQrCard";

function GenerateQrCardsList({ generatedQrs }) {
  const jsxElementsArray = generatedQrs.map((generateQrObj) => {
    return <GeneratedQrCard key={generateQrObj.id} {...generateQrObj} />;
  });

  return <Box className="cards-grid-global-class">{jsxElementsArray}</Box>;
}

export default GenerateQrCardsList;
