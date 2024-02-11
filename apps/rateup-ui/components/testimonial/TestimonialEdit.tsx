import {
  Checkbox,
  Flex,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  UnstyledButton,
  Text,
  rem,
  Center,
} from "@mantine/core";
import {
  IconSwipe,
  IconTrash,
  IconPencil,
  IconCircleXFilled,
  IconReplaceFilled,
} from "@tabler/icons-react";
import { RateupButtonBlue } from "../Button/RateupButtons";
import TestimonialCard from "./TestimonialCard";
import { useContext, useState } from "react";
import { useDisclosure, useListState } from "@mantine/hooks";
import TestimonialEditModal from "./TestimonialEditModal";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { reorder } from "../../utils/questions";
import {
  useDeleteTestimonialsFromCollections,
  useUpdateCollection,
} from "../../backend/testimonials/testimonial.query";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import { TestimonialTabs } from "../../pages/dashboard/testimonial/[collectionId]";
import { getFilteredTestimonials } from "../../utils/testimonial";
import NothingFound from "../NothingFound/NothingFound";

enum actionTab {
  Edit = "Edit",
  Delete = "Delete",
  Swap = "Swap",
}

const TestimonialEdit = ({
  selectedTestimonials,
  setCurrentStyle,
  currentStyle,
  selectedTestimonialHandler,
  setActiveTab,
  filters,
}) => {
  const [action, setAction] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  function onEditClose() {
    close();
    setAction(null);
  }
  const [deletedTestimonials, setDeletedTestimonialsHandler] = useListState([]);
  const { selectedCollectionId } = useContext(
    SelectedTestimonialCollectionContext,
  );
  const deletedTestimonialsMutation =
    useDeleteTestimonialsFromCollections(selectedCollectionId);
  const handleDelete = () => {
    deletedTestimonialsMutation.mutate({
      data: { testimonialIds: deletedTestimonials.map((t) => t.id) },
      collectionId: selectedCollectionId,
    });
    setAction(null);
  };

  const filteredTestimonials = getFilteredTestimonials(
    selectedTestimonials,
    filters,
    "all",
  );
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );

  return (
    <Stack gap={"lg"}>
      <Stack>
        <Flex justify={"flex-end"}>
          <RateupButtonBlue
            title="Edit"
            leftIcon={<IconPencil size={18} />}
            variant={action == actionTab.Edit ? "filled" : "subtle"}
            onClick={() => {
              setAction(actionTab.Edit);
              open();
            }}
            pl="xs"
            pr="xs"
          />
          <RateupButtonBlue
            title="Delete"
            leftIcon={<IconTrash size={18} />}
            variant={action == actionTab.Delete ? "filled" : "subtle"}
            onClick={() => {
              if (action !== null) setAction(null);
              else setAction(actionTab.Delete);
            }}
            pl="xs"
            pr="xs"
          />
          <RateupButtonBlue
            title="Swap"
            leftIcon={<IconSwipe size={18} />}
            variant={action == actionTab.Swap ? "filled" : "subtle"}
            onClick={() => {
              if (action !== null) setAction(null);
              else setAction(actionTab.Swap);
            }}
            pl="xs"
            pr="xs"
          />
        </Flex>
        <Grid columns={12}>
          <Grid.Col span={4}></Grid.Col>
          <Grid.Col span={4}>
            {action == actionTab.Delete && (
              <Flex justify={"center"} align={"center"}>
                <UnstyledButton
                  onClick={handleDelete}
                  style={{ cursor: "pointer" }}
                >
                  <Group>
                    <IconCircleXFilled
                      style={{ width: rem(35), height: rem(35), color: "red" }}
                    />
                    <Text>Delete</Text>
                  </Group>
                </UnstyledButton>
              </Flex>
            )}
          </Grid.Col>
          <Grid.Col span={4}>
            <Flex justify={"flex-end"} gap={"md"}>
              <RateupButtonBlue
                color="black"
                title="Next"
                onClick={() => setActiveTab(TestimonialTabs.Share)}
              />
            </Flex>
          </Grid.Col>
        </Grid>
      </Stack>
      {action == actionTab.Swap ? (
        <SwapTestimonials
          selectedTestimonials={selectedTestimonials}
          selectedTestimonialHandler={selectedTestimonialHandler}
          setAction={setAction}
          currentStyle={currentStyle}
        />
      ) : (
        <SimpleGrid cols={3}>
          {filteredTestimonials?.map((testimonial, index) => {
            const isSelected = deletedTestimonials.some(
              (t) => t.id === testimonial.id,
            );
            return (
              <Stack pos={"relative"} key={testimonial?.id}>
                {action == actionTab.Delete && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setDeletedTestimonialsHandler.append(testimonial);
                      } else {
                        const tIndex = deletedTestimonials.findIndex(
                          (t) => t.id === testimonial.id,
                        );
                        setDeletedTestimonialsHandler.remove(tIndex);
                      }
                    }}
                    size="xl"
                    radius={"xl"}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      transform: "translate(50%, -50%)",
                    }}
                    styles={{
                      icon: {
                        stroke: "1.5",
                      },
                    }}
                    color={"red"}
                  />
                )}
                <TestimonialCard
                  testimonial={testimonial}
                  currentStyle={currentStyle}
                />
              </Stack>
            );
          })}
        </SimpleGrid>
      )}
      <TestimonialEditModal
        opened={opened}
        onClose={onEditClose}
        setCurrentstyle={setCurrentStyle}
        currentStyle={currentStyle}
      />
    </Stack>
  );
};

export default TestimonialEdit;

const SwapTestimonials = ({
  selectedTestimonials,
  selectedTestimonialHandler,
  setAction,
  currentStyle,
}) => {
  const { selectedCollectionId } = useContext(
    SelectedTestimonialCollectionContext,
  );
  const updateCollection = useUpdateCollection(selectedCollectionId);
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedTestimonials = reorder(
      selectedTestimonials,
      result.source.index,
      result.destination?.index || 0,
    ) as any;
    selectedTestimonialHandler.setState(reorderedTestimonials);
    updateCollection.mutate({
      data: { testimonialIds: reorderedTestimonials.map((t) => t.id) },
      collectionId: selectedCollectionId,
    });
    setAction(null);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="testimonial-list" direction={"vertical"}>
        {(provided) => (
          <SimpleGrid
            cols={3}
            {...provided.droppableProps}
            ref={provided.innerRef}
            style={{ flexWrap: "wrap" }}
          >
            {selectedTestimonials.map((testimonial, index) => (
              <Draggable
                key={testimonial?.id}
                index={index}
                draggableId={testimonial?.id}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <Stack pos={"relative"}>
                      <IconReplaceFilled
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          transform: "translate(50%, -50%)",
                          color: "var(--tertiary-color)",
                        }}
                      />
                      <TestimonialCard
                        testimonial={testimonial}
                        currentStyle={currentStyle}
                      />
                    </Stack>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </SimpleGrid>
        )}
      </Droppable>
    </DragDropContext>
  );
};
