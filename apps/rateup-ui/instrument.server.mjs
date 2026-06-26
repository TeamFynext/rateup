import * as Sentry from "@sentry/tanstackstart-react";
import { isProduction } from "./src/utils/constants";

Sentry.init({
  dsn: "https://45e833b32b687745181d312ce71aaa60@o4508794356432896.ingest.de.sentry.io/4511626235347024",
  enabled: isProduction,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
