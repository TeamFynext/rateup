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
} from "@mantine/core";
import { IconCircleXFilled } from "@tabler/icons-react";
import TestimonialCard from "./TestimonialCard";
import { useListState } from "@mantine/hooks";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { reorder } from "../../utils/questions";
import {
  useDeleteTestimonialsFromCollections,
  useUpdateCollection,
} from "../../backend/testimonials/testimonial.query";
import { getFilteredTestimonials } from "../../utils/testimonial";
import NothingFound from "../NothingFound/NothingFound";
import classes from "./testimonial.module.css";
import { useRouter } from "next/router";

const TestimonialEdit = ({
  currentStyle,
  testimonials,
  filters,
  isDelete,
  type,
  toggleDelete,
}) => {
  const [deletedTestimonials, setDeletedTestimonialsHandler] = useListState([]);
  const { collectionId } = useRouter().query;
  const deletedTestimonialsMutation =
    useDeleteTestimonialsFromCollections(collectionId);

  const handleDelete = () => {
    deletedTestimonialsMutation.mutate(
      {
        data: { testimonialIds: deletedTestimonials.map((t) => t.id) },
        collectionId,
      },
      {
        onSuccess: () => {
          toggleDelete();
        },
      },
    );
  };
  const filteredTestimonials = getFilteredTestimonials(
    testimonials,
    filters,
    type,
  );
  // console.log("testimonials",testimonials)
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );

  const updateCollection = useUpdateCollection(collectionId);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedTestimonials = reorder(
      filteredTestimonials,
      result.source.index,
      result.destination?.index || 0,
    ) as any;
    // console.log("reorderedTestimonials",reorderedTestimonials)
    // console.log("reorderedTestimonials.map((t) => t.id)",reorderedTestimonials.map((t) => t.id))
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

  return (
    <Stack gap={"md"}>
      {isDelete && (
        <Flex justify={"center"} align={"center"}>
          <UnstyledButton onClick={handleDelete} style={{ cursor: "pointer" }}>
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
                    const isSelected = deletedTestimonials.some(
                      (t) => t.id === testimonial.id,
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
                                    if (e.currentTarget.checked) {
                                      setDeletedTestimonialsHandler.append(
                                        testimonial,
                                      );
                                    } else {
                                      const tIndex =
                                        deletedTestimonials.findIndex(
                                          (t) => t.id === testimonial.id,
                                        );
                                      setDeletedTestimonialsHandler.remove(
                                        tIndex,
                                      );
                                    }
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
        </Stack>
      </ScrollAreaAutosize>
    </Stack>
  );
};

export default TestimonialEdit;
