"use client";

import WaQuickReplySettings from "@/components/RichTextEditor/WaQuickReply/WaQuickReplySettings";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

// import WaInboxPermissions from "../chatselect/permissions";

const InboxSettings = () => {
  const { user } = useUser();
  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      {/* {user?.role === UserRole.SUPADM && (
        <div className="rounded-md shadow-md border p-4 space-y-4">
          <WaInboxPermissions />
        </div>
      )} */}
      <div className="rounded-md shadow-md border col-span-2 p-4">
        <WaQuickReplySettings />
      </div>
    </div>
  );
};

export default InboxSettings;
