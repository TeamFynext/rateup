import { Meta } from "@storybook/react"
import { QuickReplyButton, ResponseMessageContainer } from "../../../components/whatsapp/MessageComponents"
import { whatsappBackground } from "./config"
import { Stack, Text } from "@mantine/core"

const meta: Meta = {
  component: QuickReplyButton,
  parameters: {
    backgrounds: whatsappBackground
  }
}
export default meta

export const Default = {
  args: {
    text: 'Hello World',
  }
}

export const WithMessage = {
  args: {
    text: 'Sure!',
  },
  render: (args) => (
    <Stack
      gap={0}
      w={300}
    >
      <ResponseMessageContainer>
        <Text p="sm">Would you like to fill out a feedback form?</Text>
      </ResponseMessageContainer>
      <QuickReplyButton {...args} />
    </Stack>
  )
}