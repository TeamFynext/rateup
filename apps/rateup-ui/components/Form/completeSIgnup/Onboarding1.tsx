"use client";

import {
  Button,
  Card,
  Radio,
  Select,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

export default function OnboardingStep1({
  onNext,
  data,
  setData,
  userName,
}: {
  data: any;
  setData: (fn: (prev: any) => any) => void;
  onNext: () => void;
  userName: string;
}) {
  const isValid =
    data.orgName.trim() !== "" &&
    data.industry.trim() !== "" &&
    data.employees.trim() !== "";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 md:px-8 lg:px-0">
      <Card
        radius="lg"
        shadow="sm"
        styles={{
          root: {
            backgroundColor: "#FFFFFF",
            padding: "32px",
            border: "1px solid #E5E5E5",
          },
        }}
      >
        {/* Step indicator */}
        <div className="mb-6">
          <div className="h-1 bg-[#F5F5F5] rounded-full w-full">
            <div className="h-1 bg-[#004F98] rounded-full w-1/3" />
          </div>
          <Text size="sm" mt="xs" c="dimmed">
            Step 1 of 3
          </Text>
        </div>

        {/* Greeting */}
        <div className="mb-6 text-center md:text-left">
          <Title
            order={2}
            style={{
              color: "#004F98",
              fontWeight: 700,
              fontSize: "1.5rem",
              marginBottom: "0.5rem",
            }}
          >
            Welcome, <span className="text-black">{userName}</span> 👋
          </Title>
          <Text
            size="md"
            style={{
              color: "#4B5563",
              fontSize: "1rem",
            }}
          >
            Let’s set up your workspace to get started.
          </Text>
        </div>

        {/* Org name */}
        <TextInput
          label="Organization name"
          placeholder="E.g. respond.io"
          required
          value={data.orgName}
          onChange={(e) =>
            setData((prev) => ({ ...prev, orgName: e.currentTarget.value }))
          }
          styles={{
            input: { borderColor: "#E5E5E5" },
          }}
        />

        {/* Website */}
        <TextInput
          mt="md"
          label="Website"
          placeholder="E.g. www.respond.io"
          value={data.website}
          onChange={(e) =>
            setData((prev) => ({ ...prev, website: e.currentTarget.value }))
          }
        />

        {/* Industry */}
        <Select
          mt="md"
          label="Industry"
          placeholder="Choose one"
          required
          data={["Technology", "Finance", "Retail", "Healthcare", "Other"]}
          value={data.industry}
          onChange={(value) =>
            setData((prev) => ({ ...prev, industry: value || "" }))
          }
        />

        {/* Employees */}
        <div className="mt-6">
          <Text size="sm" fw={500} mb={8}>
            How many people work at your organization?{" "}
            <span className="text-red-500">*</span>
          </Text>
          <Radio.Group
            value={data.employees}
            onChange={(val) => setData((prev) => ({ ...prev, employees: val }))}
          >
            {[
              "1-10",
              "11-20",
              "21-50",
              "51-200",
              "201-1000",
              "More than 1000",
            ].map((size) => (
              <Radio key={size} value={size} label={size} />
            ))}
          </Radio.Group>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
          <Text size="sm" c="dimmed" className="text-center sm:text-left">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-[#004F98] font-medium hover:underline"
            >
              Sign in
            </a>
          </Text>

          <Button
            onClick={onNext}
            disabled={!isValid}
            className="w-full sm:w-auto"
            styles={{
              root: {
                backgroundColor: isValid ? "#004F98" : "#E5E5E5",
                color: "white",
                "&:hover": { backgroundColor: isValid ? "#003B73" : "#E5E5E5" },
              },
            }}
          >
            Next →
          </Button>
        </div>
      </Card>
    </div>
  );
}
