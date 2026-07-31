import { useNavigate } from "@tanstack/react-router";
import { Edit, Share2, Trash2 } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { TestimonialCollectionSummary } from "@/backend/testimonials/testimonial.api.ts";
import { useDeleteTestimonialCollection } from "@/backend/testimonials/testimonial.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

interface TestimonialCollectionCardProps {
  readonly collection: TestimonialCollectionSummary;
}

function TestimonialCollectionCard({ collection }: Readonly<TestimonialCollectionCardProps>) {
  const navigate = useNavigate();
  const deleteCollectionMutation = useDeleteTestimonialCollection();
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({
      to: `testimonial/${collection.id}?tab=Edit`,
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({
      to: `testimonial/${collection.id}?tab=Share`,
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const shouldDelete = await confirm({
      title: translations("Delete Testimonial Collection?"),
      description: translations("Are you sure to delete this collection?"),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deleteCollectionMutation.mutate(collection.id);
  };

  const handleCardClick = () => {
    navigate({
      to: `${collection.id}`,
    });
  };

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="w-4 h-4 mr-2" />
          {translations("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          {translations("Share")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          {translations("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const content = (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground">
        {collection._count?.testimonials ?? 0} {translations("Testimonials")}
      </div>
    </div>
  );

  return (
    <ActionCard
      title={collection.name}
      actions={actions}
      content={content}
      createdAt={collection.createdAt}
      onClick={handleCardClick}
    />
  );
}

export default TestimonialCollectionCard;
