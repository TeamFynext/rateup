import { MantineThemeProvider } from "@mantine/core";
import WhatsappFlowPage from "../../../../../components/whatsapp/flows/FlowPage";
import { whatsappTheme } from "../../../../../config/mantineTheme";

function FlowPage() {
  return (
    <MantineThemeProvider theme={whatsappTheme}>
      <WhatsappFlowPage />
    </MantineThemeProvider>
  );
}

export default FlowPage;
