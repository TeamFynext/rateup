import Inbox from "@/src/components/inbox";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";

export default function AssignedToMeInboxTab(){
    return (
        <Inbox filter={WaMessageAssignStatus.ASSIGNEDTOME}/>
    )
}