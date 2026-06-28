import { useNavigate } from "@tanstack/react-router";
import { Edit, Share2, Trash2 } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteTestimonialCollection } from "@/backend/testimonials/testimonial.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

type TestimonialCollectionCardProps = {
  readonly collection: {
    readonly id: string;
    readonly name: string;
    readonly createdAt: string | Date;
    readonly _count?: { readonly testimonials: number };
    readonly teamId?: string;
  };
};

function TestimonialCollectionCard({ collection }: Readonly<TestimonialCollectionCardProps>) {
  const navigate = useNavigate();
  const deleteCollectionMutation = useDeleteTestimonialCollection();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { t: translations } = useTranslation();

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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteCollectionMutation.mutate(collection.id);
    setIsDeleteDialogOpen(false);
  };

  const handleCardClick = () => {
    navigate({
      to: `${collection.id}`,
    });
  };

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
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
    <>
      <ActionCard
        title={collection.name}
        actions={actions}
        content={content}
        createdAt={collection.createdAt}
        onClick={handleCardClick}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations("Delete Testimonial Collection?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {translations("Are you sure to delete this collection?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations("Cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {translations("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TestimonialCollectionCard;
