import type { Meta, StoryObj } from "@storybook/react";

import { SkeletonMenuCard } from "./SkeletonMenuCard";

const meta: Meta<typeof SkeletonMenuCard> = {
  component: SkeletonMenuCard,
};

export default meta;
type Story = StoryObj<typeof SkeletonMenuCard>;

export const Mobile: Story = {
  args: {
    isMobile: true,
  },
};
export const LargeDevice: Story = {
  args: {
    isMobile: false,
  },
};
