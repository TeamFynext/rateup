import {
  Checkbox,
  Group,
  Stack,
  Center,
  ScrollAreaAutosize,
} from "@mantine/core";
import TestimonialCard from "./TestimonialCard";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { reorder } from "../../utils/questions";
import { useUpdateCollection } from "../../backend/testimonials/testimonial.query";
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
  selectedTestimonialIds,
  setSelectedTestimonialIds,
  setFilters,
}) => {
  const { collectionId } = useRouter().query as { collectionId: string };

  let filteredTestimonials = getFilteredTestimonials(
    testimonials,
    filters,
    type,
  );

  console.log("filteredTestimonials", filteredTestimonials);
  const updateCollection = useUpdateCollection(collectionId);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedTestimonials = reorder(
      testimonials,
      result.source.index,
      result.destination?.index || 0,
    ) as any;
    setFilters(null);
    updateCollection.mutate({
      data: { testimonialIds: reorderedTestimonials.map((t) => t.id) },
      collectionId,
    });
  };
  if (testimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );

  return (
    <Stack gap={"md"}>
      <ScrollAreaAutosize>
        <Stack mah={500} p={"sm"} w={"100%"}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="testimonial-list" direction={"vertical"}>
              {(provided) => (
                <Group
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ flexWrap: "wrap" }}
                >
                  {filteredTestimonials?.map((testimonial, index) => {
                    const isSelected = selectedTestimonialIds.some(
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
                                      setSelectedTestimonialIds((prev) => [
                                        ...prev,
                                        testimonial?.id,
                                      ]);
                                    else
                                      setSelectedTestimonialIds(
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
        </Stack>
      </ScrollAreaAutosize>
    </Stack>
  );
};

export default TestimonialEdit;
