"use client";

import { useContext, useEffect, useState } from "react";

import { Flex, Paper, Stack, Switch, Textarea, Tooltip } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { isEmptyObject } from "@tiptap/react";
import { useTranslations } from "next-intl";

import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import classes from "./Style.module.css";

const TestimonialExtraProps = ({
  qId,
  form,
}: {
  qId: string;
  form: UseFormReturnType<any>;
}) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const features = form.values.features?.[selectedLanguage] || {
    rating: false,
    jobTitle: false,
    photo: false,
    nameQn: "",
    ratingQn: "",
    testimonialQn: "",
    jobTitleQn: "",
    photoQn: "",
  };
  const [selectedField, setSelectedField] = useState(null);
  const [text, setText] = useState("");
  const translations = useTranslations();

  function updateFeatures(featurekey, value) {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, [featurekey]: value },
    });
  }

  const questionTitleFields = [
    {
      key: "nameQn",
      label: "name",
      active: true,
    },
    {
      key: "jobTitleQn",
      label: "job title",
      active: features?.jobTitle,
    },
    {
      key: "testimonialQn",
      label: "testimonial",
      active: true,
    },
    {
      key: "ratingQn",
      label: "rating",
      active: features?.rating,
    },
    {
      key: "photoQn",
      label: "photo",
      active: features?.photo,
    },
  ];

  useEffect(() => {
    let data = {};
    if (!features?.rating) data["ratingQn"] = "";
    if (!features?.jobTitle) data["jobTitleQn"] = "";
    if (!features?.photo) data["photoQn"] = "";
    if (!isEmptyObject(data))
      form.setFieldValue("features", {
        ...form.values.features,
        [selectedLanguage]: { ...features, ...data },
      });
  }, [features?.rating, features?.jobTitle, features?.photo]);

  const questionTitle = form.values?.title?.[selectedLanguage];

  return (
    <Stack>
      <Flex justify={"flex-start"} columnGap={"lg"}>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={translations("Enable Rating Question")}
            c={features?.rating ? "var(--tertiary-color)" : "dimmed"}
            checked={features?.rating}
            onChange={(e) => updateFeatures("rating", e.currentTarget.checked)}
          />
        </Paper>
        <Paper shadow="xl" p={"lg"} c={"dimmed"}>
          <Switch
            label={translations("Add job title")}
            c={features?.jobTitle ? "var(--tertiary-color)" : "dimmed"}
            checked={features?.jobTitle}
            onChange={(e) =>
              updateFeatures("jobTitle", e.currentTarget.checked)
            }
          />
        </Paper>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={translations("Capture photo")}
            c={features?.photo ? "var(--tertiary-color)" : "dimmed"}
            checked={features?.photo}
            onChange={(e) => updateFeatures("photo", e.currentTarget.checked)}
          />
        </Paper>
      </Flex>
      <Stack pt={"sm"}>
        {questionTitleFields.map((field) => (
          <Tooltip
            label={translations("Please fill question")}
            disabled={questionTitle !== "<p></p>"}
            key={field.key}
          >
            <Textarea
              placeholder={` ${translations("Enter")} ${field.label}'s ${translations("title here")}`}
              classNames={{ input: classes.inputHeadText }}
              size="md"
              disabled={questionTitle == "<p></p>"}
              onChange={(e) => setText(e.currentTarget.value)}
              onBlur={() => {
                if (text !== features[field.key])
                  updateFeatures(field.key, text);
                setSelectedField(null);
              }}
              value={selectedField === field.key ? text : features[field.key]}
              onFocus={() => {
                setSelectedField(field.key);
                setText(features[field.key]);
              }}
              autosize
              key={field.key}
              display={field.active ? "block" : "none"}
              rightSection={
                selectedField === field.key ? (
                  <Tooltip label={translations("save")}>
                    <IconCircleCheckFilled
                      onClick={() => {
                        if (text !== features[field.key])
                          updateFeatures(field.key, text);
                        setSelectedField(null);
                      }}
                    />
                  </Tooltip>
                ) : null
              }
            />
          </Tooltip>
        ))}
      </Stack>
    </Stack>
  );
};

export default TestimonialExtraProps;
