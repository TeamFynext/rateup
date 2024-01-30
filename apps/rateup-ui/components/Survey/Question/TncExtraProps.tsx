import React, { useContext, useState, useEffect } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { Group, Input, Stack, Text, Textarea } from "@mantine/core";
import classes from "./Style.module.css";

const TncExtraProps = ({ form }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const tnc = form.values.tnc?.[selectedLanguage] || {
    title: "I agree to",
    urlTitle: "terms and conditions",
    content:
      "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
  };
  const [title, setTitle] = useState(tnc?.title);
  const [urlTitle, setUrlTitle] = useState(tnc?.urlTitle);
  const [content, setContent] = useState(tnc?.content);

  useEffect(() => {
    form.setFieldValue("tnc", {
      ...form.values.tnc,
      [selectedLanguage]: { title, urlTitle, content },
    });
  }, [title, urlTitle, content]);

  return (
    <Stack>
      <Group>
        <Text className={classes["labels"]}>Title: </Text>
        <Input
          placeholder="eg:  I agree to"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          radius="sm"
          size="sm"
          style={{ maxWidth: "400px" }}
        />
      </Group>
      <Group>
        <Text className={classes["labels"]}>Url Text: </Text>
        <Input
          placeholder="eg:  terms and conditions"
          value={urlTitle}
          onChange={(e) => setUrlTitle(e.target.value)}
          radius="sm"
          size="sm"
          style={{ maxWidth: "400px" }}
        />
      </Group>

      <Group>
        <Text className={classes["labels"]}>Terms Content: </Text>
        <Textarea
          placeholder="Terms & Conditions .........."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ maxWidth: "400px" }}
          size="sm"
        />
      </Group>
    </Stack>
  );
};

export default TncExtraProps;
