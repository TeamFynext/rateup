import {
  Checkbox,
  Flex,
  Grid,
  Group,
  Stack,
  UnstyledButton,
  Text,
  rem,
  Center,
  ScrollAreaAutosize,
  Button,
} from "@mantine/core";
import { IconCircleXFilled } from "@tabler/icons-react";
import TestimonialCard from "./TestimonialCard";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { reorder } from "../../utils/questions";
import {
  useDeleteMultipleTestimonialsFromCollection,
  useUpdateCollection,
} from "../../backend/testimonials/testimonial.query";
import { getFilteredTestimonials } from "../../utils/testimonial";
import NothingFound from "../NothingFound/NothingFound";
import classes from "./testimonial.module.css";
import { useRouter } from "next/router";
import { useState } from "react";
import ConfirmationModal from "../Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";

const TestimonialEdit = ({
  currentStyle,
  testimonials,
  filters,
  isDelete,
  type,
  toggleDelete,
}) => {
  console.log("edit page testimonials", testimonials);
  const [testimonialIds, setTestimonialIds] = useState<Array<string>>([]);
  const { collectionId } = useRouter().query as { collectionId: string };
  const deletedTestimonialsMutation =
    useDeleteMultipleTestimonialsFromCollection(collectionId);

  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);

  const handleDelete = () => {
    deletedTestimonialsMutation.mutate(testimonialIds, {
      onSuccess: () => {
        toggleDelete();
      },
    });
  };
  let filteredTestimonials = getFilteredTestimonials(
    testimonials,
    filters,
    type,
  );

  filteredTestimonials = testimonials;
  const updateCollection = useUpdateCollection(collectionId);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedTestimonials = reorder(
      testimonials,
      result.source.index,
      result.destination?.index || 0,
    ) as any;
    console.log("reorderedTestimonials", reorderedTestimonials);
    console.log(
      "reorderedTestimonials.map((t) => t.id)",
      reorderedTestimonials.map((t) => t.id),
    );
    updateCollection.mutate(
      {
        data: { testimonialIds: reorderedTestimonials.map((t) => t.id) },
        collectionId,
      },
      {
        onSuccess: (data) => {
          //  console.log("data",data)
        },
      },
    );
  };
  if (testimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );

  return (
    <Stack gap={"md"}>
      {isDelete && (
        <Flex justify={"center"} align={"center"}>
          <UnstyledButton onClick={openDialog} style={{ cursor: "pointer" }}>
            <Group>
              <IconCircleXFilled
                style={{ width: rem(35), height: rem(35), color: "red" }}
              />
              <Text>Delete</Text>
            </Group>
          </UnstyledButton>
        </Flex>
      )}
      <ScrollAreaAutosize>
        <Stack mah={500} p={"sm"}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="testimonial-list" direction={"vertical"}>
              {(provided) => (
                <Group
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ flexWrap: "wrap" }}
                >
                  {filteredTestimonials?.map((testimonial, index) => {
                    const isSelected = testimonialIds.some(
                      (t) => t === testimonial.id,
                    );
                    return (
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
                            <div className={classes.root} key={testimonial?.id}>
                              {isDelete && (
                                <Checkbox
                                  checked={isSelected}
                                  classNames={{ root: classes.checkboxWrapper }}
                                  onChange={(e) => {
                                    if (e.currentTarget.checked)
                                      setTestimonialIds((prev) => [
                                        ...prev,
                                        testimonial?.id,
                                      ]);
                                    else
                                      setTestimonialIds(
                                        (prev) =>
                                          prev?.filter(
                                            (t) => t !== testimonial?.id,
                                          ),
                                      );
                                  }}
                                  tabIndex={-1}
                                  size="md"
                                  radius={"xl"}
                                  color={"red"}
                                />
                              )}
                              <TestimonialCard
                                testimonial={testimonial}
                                currentStyle={currentStyle}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </Group>
              )}
            </Droppable>
          </DragDropContext>
          <ConfirmationModal
            forDeleteFunctionality
            confirmLabel="Delete"
            headerLabel="Are you sure to delete these testimonials?"
            headerTitle="Delete question?"
            opened={dialogOpened}
            onClose={closeDialog}
            onConfirm={(e) => {
              handleDelete();
            }}
          />
        </Stack>
      </ScrollAreaAutosize>
    </Stack>
  );
};

export default TestimonialEdit;
