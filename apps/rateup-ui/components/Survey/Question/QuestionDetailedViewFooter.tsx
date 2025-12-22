"use client";

import {
  Button,
  Checkbox,
  Group,
  Image,
  Menu,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAppWindow,
  IconBrandGoogle,
  IconChevronDown,
  IconDeviceSdCard,
  IconEdit,
  IconTicket,
  IconVariable,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { PageType, QuestionType } from "@/types/enums";
import InfoButton from "@/components/Button/InfoButton";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { docsPath, NPSQuestions } from "@/utils/constants";
import {
  googleReviewSupportedTypes,
  logicSupportedTypes,
  ticketIssueSupportedTypes,
  validationSupportedTypes,
} from "@/utils/data";

import { QuestionTabsEnum } from "../EditSurvey";

function QuestionDetailedViewFooter({
  question,
  form,
  setActiveTab,
  isGoogleReviewFeatureActive,
  handleSave,
  isTicketFeatureActive,
  getIncompleteLanguages,
  selectedLanguage,
  isSaving,
  enableAutoGenerateTicket,
}) {
  const translations = useTranslations();
  return (
    <Group mt="sm" justify="space-between" gap="sm">
      <Group justify="flex-start" gap="md">
        <Checkbox
          label={translations("Required")}
          color="var(--tertiary-color)"
          fw={600}
          mr={!NPSQuestions.includes(question?.type as QuestionType) && "100px"}
          checked={form.values.required}
          onChange={(e) => {
            const checked = e.currentTarget.checked;
            form.setFieldValue("required", checked);
          }}
          disabled={
            [QuestionType.InfoMessage, QuestionType.EmailOtp].includes(
              question.type,
            ) || question.type in PageType
          }
        />
        <InfoButton docUrl={`${docsPath}/advancedFt/overview`} />
        {NPSQuestions.includes(question?.type as QuestionType) && (
          <Checkbox
            label={translations("NPS Analytics")}
            color="var(--tertiary-color)"
            fw={600}
            checked={form.values.enableNpsAnalytics}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              form.setFieldValue("enableNpsAnalytics", checked);
            }}
          />
        )}

        <Stack px="sm">
          <Menu
            position="bottom-end"
            offset={4}
            withArrow
            arrowPosition="side"
            transitionProps={{
              transition: "rotate-right",
              duration: 150,
            }}
          >
            <Menu.Target>
              <Button
                variant="outline"
                color="dark.2"
                radius="lg"
                size="sm"
                rightSection={<IconChevronDown size="1rem" />}
              >
                <Text size="sm" c={"var(--text-color-sp)"} fw="700">
                  {translations("Actions")}
                </Text>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item>
                <RateupButtonSecondary
                  title={translations("Variables")}
                  fullWidth
                  size="sm"
                  leftIcon={<IconVariable size={"1.5rem"} />}
                  onClick={() => setActiveTab(QuestionTabsEnum.VariableEditor)}
                />
              </Menu.Item>
              {logicSupportedTypes.includes(question?.type as QuestionType) && (
                <Menu.Item>
                  <RateupButtonSecondary
                    title={translations("Logic Jump")}
                    fullWidth
                    leftIcon={
                      <Image
                        src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`}
                        h={30}
                        w={30}
                        fit="contain"
                        alt="icon of login jump"
                      />
                    }
                    size="sm"
                    onClick={async () => {
                      setActiveTab(QuestionTabsEnum.LogicEditor);
                    }}
                  />
                </Menu.Item>
              )}

              {googleReviewSupportedTypes.includes(
                question?.type as QuestionType,
              ) && (
                <Menu.Item>
                  {isGoogleReviewFeatureActive ? (
                    <RateupButtonSecondary
                      title={"Review Page"}
                      leftIcon={<IconAppWindow />}
                      size="sm"
                      fullWidth
                      onClick={async () => {
                        let save = await handleSave();
                        save === "saved" &&
                          setActiveTab(
                            QuestionTabsEnum.QuestionReviewPageEditor,
                          );
                      }}
                    />
                  ) : (
                    <Tooltip
                      label={translations("Upgrade your Plan for this feature")}
                      disabled={isGoogleReviewFeatureActive}
                      color="yellow"
                    >
                      <Button
                        data-disabled
                        radius="lg"
                        onClick={(event) => event.preventDefault()}
                        leftSection={<IconAppWindow />}
                      >
                        Review Page
                      </Button>
                    </Tooltip>
                  )}
                </Menu.Item>
              )}

              {validationSupportedTypes.includes(
                question?.type as QuestionType,
              ) && (
                <Menu.Item>
                  <RateupButtonSecondary
                    title={translations("Custom Validation")}
                    leftIcon={<IconEdit />}
                    size="sm"
                    fullWidth
                    onClick={async () => {
                      let save = await handleSave();
                      save === "saved" &&
                        setActiveTab(QuestionTabsEnum.ValidationRulesEditor);
                    }}
                  />
                </Menu.Item>
              )}
              {ticketIssueSupportedTypes.includes(
                question?.type as QuestionType,
              ) && (
                <Menu.Item>
                  {isTicketFeatureActive && !enableAutoGenerateTicket ? (
                    <RateupButtonSecondary
                      title={translations("Create Tickets")}
                      leftIcon={<IconTicket stroke={4} size={"1rem"} />}
                      size="sm"
                      fullWidth
                      onClick={async () => {
                        let save = await handleSave();
                        save === "saved" &&
                          setActiveTab(QuestionTabsEnum.TicketIssueEditor);
                      }}
                    />
                  ) : (
                    <Tooltip
                      label={
                        isTicketFeatureActive
                          ? translations("Upgrade your Plan for this feature")
                          : translations(
                              "Auto-Generate Ticket is enabled on this survey",
                            )
                      }
                      disabled={
                        isTicketFeatureActive || enableAutoGenerateTicket
                      }
                      color={enableAutoGenerateTicket ? "yellow" : "black"}
                    >
                      <Button
                        data-disabled
                        radius="lg"
                        onClick={(event) => event.preventDefault()}
                        leftSection={<IconTicket stroke={4} size={"1rem"} />}
                      >
                        {translations("Create Tickets")}
                      </Button>
                    </Tooltip>
                  )}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Stack>
      </Group>

      <Group>
        <RateupButtonBlue
          title={
            getIncompleteLanguages().length > 1 ||
            (getIncompleteLanguages().length > 0 &&
              getIncompleteLanguages()[0] !== selectedLanguage)
              ? translations("Fill Next Language")
              : translations("Save")
          }
          size="md"
          onClick={handleSave}
          leftIcon={<IconDeviceSdCard />}
          loading={isSaving}
        />
      </Group>
    </Group>
  );
}

export default QuestionDetailedViewFooter;
