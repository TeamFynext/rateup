import { Flex, Paper, Switch } from "@mantine/core";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useContext, useEffect, useState } from "react";

const ContactExtraProps = ({ form }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const features = form.values.features?.[selectedLanguage] || {
    hasPhone: true,
    hasEmail: true,
    hasAddress: true,
  };
  const [hasPhone, setHasPhone] = useState(features?.hasPhone);
  const [hasEmail, setHasEmail] = useState(features?.hasEmail);
  const [hasAddress, setHasAddress] = useState(features?.hasAddress);

  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { hasPhone, hasEmail, hasAddress },
    });
  }, [hasPhone, hasEmail, hasAddress]);
  return (
    <Flex justify={"flex-start"} columnGap={"lg"}>
      <Paper shadow="xl" p={"lg"}>
        <Switch
          label={"Add Phone"}
          c={hasPhone ? "var(--tertiary-color)" : "dimmed"}
          checked={features?.hasPhone}
          onChange={(e) => setHasPhone(e.currentTarget.checked)}
        />
      </Paper>
      <Paper shadow="xl" p={"lg"} c={"dimmed"}>
        <Switch
          label={"Add Email"}
          c={hasEmail ? "var(--tertiary-color)" : "dimmed"}
          checked={features?.hasEmail}
          onChange={(e) => setHasEmail(e.currentTarget.checked)}
        />
      </Paper>
      <Paper shadow="xl" p={"lg"}>
        <Switch
          label={"Add Address"}
          c={hasAddress ? "var(--tertiary-color)" : "dimmed"}
          checked={features?.hasAddress}
          onChange={(e) => setHasAddress(e.currentTarget.checked)}
        />
      </Paper>
    </Flex>
  );
};

export default ContactExtraProps;
