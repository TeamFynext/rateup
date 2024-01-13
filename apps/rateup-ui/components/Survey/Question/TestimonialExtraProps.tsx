import { Flex, Paper, Switch } from "@mantine/core";
import { useContext, useState, useEffect } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";

const TestimonialExtraProps = ({ qId, form }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const features = form.values.features?.[selectedLanguage] || {
    hasRating: false,
    hasJobTitle: false,
    hasPhoto: false,
  };
  const [hasRating, setHasRating] = useState(features?.hasRating);
  const [hasJobTitle, setHasJobTitle] = useState(features?.hasJobTitle);
  const [hasPhoto, setHasPhoto] = useState(features?.hasPhoto);

  useEffect(() => {
    setHasRating(features?.hasRating);
    setHasJobTitle(features?.hasJobTitle);
    setHasPhoto(features?.hasPhoto);
  }, [features]);

  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, hasRating: hasRating },
    });
  }, [hasRating]);
  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, hasJobTitle: hasJobTitle },
    });
  }, [hasJobTitle]);
  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, hasPhoto: hasPhoto },
    });
  }, [hasPhoto]);

  return (
    <>
      <Flex justify={"flex-start"} columnGap={"lg"}>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={"Enable Rating Qn"}
            c={hasRating ? "var(--tertiary-color)" : "dimmed"}
            checked={hasRating}
            onChange={(e) => setHasRating(e.currentTarget.checked)}
          />
        </Paper>
        <Paper shadow="xl" p={"lg"} c={"dimmed"}>
          <Switch
            label={"Add job title"}
            c={hasJobTitle ? "var(--tertiary-color)" : "dimmed"}
            checked={hasJobTitle}
            onChange={(e) => setHasJobTitle(e.currentTarget.checked)}
          />
        </Paper>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={"Capture photo"}
            c={hasPhoto ? "var(--tertiary-color)" : "dimmed"}
            checked={hasPhoto}
            onChange={(e) => setHasPhoto(e.currentTarget.checked)}
          />
        </Paper>
      </Flex>
    </>
  );
};

export default TestimonialExtraProps;
