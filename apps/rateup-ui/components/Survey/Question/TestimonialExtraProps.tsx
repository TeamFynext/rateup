import { Flex, Paper, Switch } from "@mantine/core";
import { useContext, useState, useEffect } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";

const TestimonialExtraProps = ({ qId, form }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const features = form.values.features?.[selectedLanguage] || {
    rating: false,
    jobTitle: false,
    photo: false,
  };
  const [rating, setHasRating] = useState(features?.rating);
  const [jobTitle, setHasJobTitle] = useState(features?.jobTitle);
  const [photo, setHasPhoto] = useState(features?.photo);

  useEffect(() => {
    setHasRating(features?.rating);
    setHasJobTitle(features?.jobTitle);
    setHasPhoto(features?.photo);
  }, [features]);

  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, rating: rating },
    });
  }, [rating]);
  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, jobTitle: jobTitle },
    });
  }, [jobTitle]);
  useEffect(() => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, photo: photo },
    });
  }, [photo]);

  return (
    <>
      <Flex justify={"flex-start"} columnGap={"lg"}>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={"Enable Rating Qn"}
            c={rating ? "var(--tertiary-color)" : "dimmed"}
            checked={rating}
            onChange={(e) => setHasRating(e.currentTarget.checked)}
          />
        </Paper>
        <Paper shadow="xl" p={"lg"} c={"dimmed"}>
          <Switch
            label={"Add job title"}
            c={jobTitle ? "var(--tertiary-color)" : "dimmed"}
            checked={jobTitle}
            onChange={(e) => setHasJobTitle(e.currentTarget.checked)}
          />
        </Paper>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={"Capture photo"}
            c={photo ? "var(--tertiary-color)" : "dimmed"}
            checked={photo}
            onChange={(e) => setHasPhoto(e.currentTarget.checked)}
          />
        </Paper>
      </Flex>
    </>
  );
};

export default TestimonialExtraProps;
