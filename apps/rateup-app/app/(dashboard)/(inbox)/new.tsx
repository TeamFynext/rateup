import Inbox from "@/src/components/inbox";
// import { WaMessageAssignStatus } from "@/src/api/inbox/types";

export default function NewInboxTab(){
    return (
        <Inbox filter={{waMessageAssignStatus:"New"}}/>
    )
}