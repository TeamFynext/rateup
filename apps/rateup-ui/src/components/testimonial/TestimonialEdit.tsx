import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useParams } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { useUpdateCollection } from "@/backend/testimonials/testimonial.query";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { reorder } from "@/utils/questions.ts";
import { getFilteredTestimonials } from "@/utils/testimonial.ts";

import NothingFound from "../NothingFound/NothingFound.tsx";
import TestimonialCard from "./TestimonialCard.tsx";

import classes from "./testimonial.module.css";

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
  const params = useParams({
    strict: false,
  });
  const collectionId = params.collectionId as string;
  const filteredTestimonials = getFilteredTestimonials(testimonials, filters, type);

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
      <div className="flex items-center justify-center mt-37.5">
        <NothingFound text={"No testimonials found"} />
      </div>
    );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 w-full">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="testimonial-list" direction={"vertical"}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-wrap items-center gap-2 p-3"
              >
                {filteredTestimonials?.map((testimonial, index) => {
                  const isSelected = selectedTestimonialIds.some((t) => t === testimonial.id);
                  return (
                    <Draggable key={testimonial?.id} index={index} draggableId={testimonial?.id}>
                      {(provided, _snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={provided.draggableProps.style as CSSProperties}
                        >
                          <div className={classes.root} key={testimonial?.id}>
                            {isDelete && (
                              <Checkbox
                                checked={isSelected}
                                className={classes.checkboxWrapper}
                                onCheckedChange={(checked) => {
                                  if (checked)
                                    setSelectedTestimonialIds((prev) => [...prev, testimonial?.id]);
                                  else
                                    setSelectedTestimonialIds((prev) =>
                                      prev?.filter((t) => t !== testimonial?.id),
                                    );
                                }}
                                tabIndex={-1}
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
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </ScrollArea>
  );
};

export default TestimonialEdit;
