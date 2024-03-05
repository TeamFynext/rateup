import { useRouter } from "next/router";
import SurveyID from "../../../components/Survey/SurveyId";
import { whatsappOptions } from "../../../utils/constants";

const WhatsappSurveyById = () => {
  const router = useRouter();
  if (!whatsappOptions?.includes("surveys")) {
    router.push("/dashboard/whatsapp/flows");
    return;
  }
  return <SurveyID />;
};
export default WhatsappSurveyById;
