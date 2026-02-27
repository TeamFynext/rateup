import { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useContactGroupsByContactId,
  useUpdateContactGroupsForContactMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { ContactGroupsSelector } from "@/components/Contacts/ContactGroupSelector";

function AddtoContactGroup({ selectedContactIds }) {
  const contactId = selectedContactIds[0];

  const [contactGroupIds, setContactGroupIds] = useState<string[]>([]);

  const { data: contactgroups, isLoading: contactGroupsLoading } =
    useContactGroupsByContactId(contactId);

  const mutation = useUpdateContactGroupsForContactMutation(contactId);

  useEffect(() => {
    if (contactgroups?.length) {
      setContactGroupIds(contactgroups.map((g) => g.id));
    }
  }, [contactgroups]);

  const handleChange = ({
    nextIds,
    addGroupIds,
    removeGroupIds,
  }: {
    nextIds: string[];
    addGroupIds: string[];
    removeGroupIds: string[];
  }) => {
    setContactGroupIds(nextIds);

    if (!addGroupIds.length && !removeGroupIds.length) return;

    mutation.mutate(
      {
        contactId,
        addGroupIds,
        removeGroupIds,
      },
      {
        onError: () => {
          toast.error("Error updating contact groups");
        },
      },
    );
  };

  return (
    <ContactGroupsSelector
      value={contactGroupIds}
      contactId={contactId}
      contactgroups={contactgroups}
      contactGroupsLoading={contactGroupsLoading}
      onChange={handleChange}
      className="w-full border-none"
    />
  );
}

export default AddtoContactGroup;
