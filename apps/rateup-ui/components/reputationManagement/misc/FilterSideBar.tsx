import { Checkbox, Group, PaperProps, Stack, Text } from "@mantine/core";
import { SentimentClass } from "../../../types/enums";
import { getSentimentTypeLabel } from "../../../utils/enums";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import classes from "./FilterSideBar.module.css";

interface Filters {
  sentiment?: {
    [key: string]: boolean;
  };
  rating?: {
    [key: string]: boolean;
  };
}
interface FilterSideBarProps {
  filters: Filters;
  setFilters: (Filters) => void;
}
export function FilterSideBar({
  filters,
  setFilters,
  ...props
}: FilterSideBarProps & PaperProps) {
  function handleCheckboxEvent(key1: string, key2: string, value: boolean) {
    setFilters((draft) => {
      draft[key1][key2] = !draft[key1][key2];
    });
  }
  return (
    <PaperLayout {...props}>
      <Stack>
        <Text className={classes.heading}>Filter By</Text>
        <Stack ml={4}>
          <Text className={classes.title}>Sentiment</Text>
          <Stack pl={4}>
            {Object.values(SentimentClass).map((sentiment) => {
              return (
                <Group gap={"xs"}>
                  <Checkbox
                    color="gray"
                    classNames={{
                      input: classes.checkbox,
                      icon: classes.checkIcon,
                    }}
                    checked={filters.sentiment[sentiment]}
                    onChange={(e) =>
                      handleCheckboxEvent(
                        "sentiment",
                        sentiment,
                        e.currentTarget.checked,
                      )
                    }
                  />
                  <Text className={classes.filterText}>
                    {getSentimentTypeLabel(sentiment)}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Stack>
        <Stack ml={4}>
          <Text className={classes.title}>Rating</Text>
          <Stack pl={4}>
            {[1, 2, 3, 4, 5].map((rating) => {
              return (
                <Group gap={"xs"}>
                  <Checkbox
                    color="gray"
                    classNames={{
                      input: classes.checkbox,
                      icon: classes.checkIcon,
                    }}
                    checked={filters.rating[rating.toString()]}
                    onChange={(e) =>
                      handleCheckboxEvent(
                        "rating",
                        rating.toString(),
                        e.currentTarget.checked,
                      )
                    }
                  />
                  <Text className={classes.filterText}>{rating}</Text>
                </Group>
              );
            })}
          </Stack>
        </Stack>
      </Stack>
    </PaperLayout>
  );
}
