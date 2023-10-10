import type { Meta, StoryObj } from '@storybook/react';
import { ResponseMessageContainer, ResponseMessageContainerProps } from '../../../components/whatsapp/MessageComponents';
import { Text } from '@mantine/core';
import { whatsappBackground } from './config';

const meta: Meta = {
  component: ResponseMessageContainer,
  render: ({ text, ...args }) => (
    <ResponseMessageContainer
      {...args}
    >
      <Text p="sm">{text}</Text>
    </ResponseMessageContainer>
  ),
  argTypes: {
    text: {
      control: 'text',
    },
    backgroundColor: {
      control: 'color',
    }
  },
  parameters: {
    backgrounds: whatsappBackground
  }
}
export default meta;

type Story = StoryObj<ResponseMessageContainerProps & { text: string }>;

export const Default: Story = {
  args: {
    text: 'Hey there!',
    backgroundColor: '#00a884'
  }
}

