import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Image,
  ScrollAreaAutosize,
  Text,
} from "@mantine/core";
import { IconHeart } from "@tabler/icons-react";

import classes from "./BadgeCard.module.css";

const mockdata = {
  image: "https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6",
  title: "Verudela Beach",
  country: "Croatia",
  description:
    "Completely renovated for the season 2020, Arena Verudela Bech Apartments are fully equipped and modernly furnished 4-star self-service apartments located on the Adriatic coastline by one of the most beautiful beaches in Pula.",
  badges: [
    { emoji: "☀️", label: "Sunny weather" },
    { emoji: "🦓", label: "Onsite zoo" },
    { emoji: "🌊", label: "Sea" },
    { emoji: "🌲", label: "Nature" },
    { emoji: "🤽", label: "Water sports" },
  ],
};

export function BadgeCard({ title }) {
  const { image, description, country, badges } = mockdata;
  const features = badges.map((badge) => (
    <Badge variant="light" key={badge.label} leftSection={badge.emoji}>
      {badge.label}
    </Badge>
  ));

  return (
    <Card radius="md" className={classes.card}>
      <Card.Section>
        <Image
          src={image}
          alt={title}
          style={{
            aspectRatio: 3 / 2,
          }}
        />
      </Card.Section>
      <Card.Section className={classes.section} mt="md">
        <Text fz="lg" fw={500}>
          {title}
        </Text>
        <ScrollAreaAutosize mah={100} mt="xs">
          <Text fz="sm">{description}</Text>
        </ScrollAreaAutosize>
      </Card.Section>

      <Card.Section className={classes.section}>
        <Text mt="md" className={classes.label} c="dimmed">
          Perfect for you, if you enjoy
        </Text>
        <Group gap={7} mt={5}>
          {features}
        </Group>
      </Card.Section>

      <Group mt="xs">
        <Button radius="md" style={{ flex: 1 }}>
          Show details
        </Button>
        <ActionIcon variant="default" radius="md" size={36}>
          <IconHeart className={classes.like} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
