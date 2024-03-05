import { useRouter } from "next/router";
import Redirect from "../../public/wa/[surveyTeamMapId]/redirect";

// Whatsapp survey
function Was() {
  const router = useRouter();
  const shortId = router.query.shortId;
  const tag = router.query.tag;

  return <Redirect shortId={shortId} tag={tag} />;
}

export default Was;
