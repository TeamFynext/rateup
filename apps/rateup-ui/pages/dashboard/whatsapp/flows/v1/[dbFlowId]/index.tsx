import { MantineThemeProvider } from "@mantine/core";

import { whatsappTheme } from "@/config/mantineTheme";
import WhatsappFlowPage from "@/components/whatsapp/flows/FlowPage";

function FlowPage() {
  return (
    <MantineThemeProvider theme={whatsappTheme}>
      <WhatsappFlowPage />
    </MantineThemeProvider>
  );
}

export default FlowPage;
