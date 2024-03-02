import { useRouter } from "next/router";
import Redirect from "../../public/wa/[surveyTeamMapId]/redirect";

// Whatsapp survey
function Was() {
  const router = useRouter();
  const shortId = router.query.shortId;
  return <Redirect shortId={shortId} />;
}

export default Was;
