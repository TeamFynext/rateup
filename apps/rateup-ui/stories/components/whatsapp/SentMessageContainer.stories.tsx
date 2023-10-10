import type { Meta, StoryObj } from '@storybook/react';
import { SentMessageContainer, SentMessageContainerProps } from '../../../components/whatsapp/MessageComponents';
import { Text } from '@mantine/core';
import { whatsappBackground } from './config';

const meta: Meta = {
  component: SentMessageContainer,
  render: ({ text, ...args }) => (
    <SentMessageContainer
      {...args}
    >
      <Text p="sm">{text}</Text>
    </SentMessageContainer>
  ),
  argTypes: {
    text: {
      defaultValue: 'Hello World',
      control: 'text',
    },
    backgroundColor: {
      defaultValue: '#d9fdd3',
      control: 'color',
    }
  },
  parameters: {
    backgrounds: whatsappBackground
  }
}
export default meta;

type Story = StoryObj<SentMessageContainerProps & { text: string }>;

export const Default: Story = {
  args: {
    text: 'Hello World',
    backgroundColor: '#d9fdd3'
  }
}

