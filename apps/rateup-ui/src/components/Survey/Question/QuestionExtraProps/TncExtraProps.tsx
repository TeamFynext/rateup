import { useId, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";

import type { QuestionExtraPropsForm } from "./questionForm.ts";

const TncExtraProps = ({ form }: { form: QuestionExtraPropsForm }) => {
  const uid = useId();
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const { t: translations } = useTranslation();

  const tnc = form.values.tnc?.[selectedLanguage] || {
    title: translations("I agree to"),
    urlTitle: translations("terms and conditions"),
    content: translations(
      "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
    ),
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
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${uid}-field`}>{translations("Title")}</FieldLabel>
        <Input
          id={`${uid}-field`}
          placeholder={translations("eg: I agree to")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${uid}-field-2`}>{translations("URL Text")}</FieldLabel>
        <Input
          id={`${uid}-field-2`}
          placeholder={translations("eg: terms and conditions")}
          value={urlTitle}
          onChange={(e) => setUrlTitle(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${uid}-field-3`}>{translations("Terms Content")}</FieldLabel>
        <Textarea
          id={`${uid}-field-3`}
          placeholder={translations("Terms & Conditions ..........")}
          value={content}
          rows={4}
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>
    </FieldGroup>
  );
};

export default TncExtraProps;
