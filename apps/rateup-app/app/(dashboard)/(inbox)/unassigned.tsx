import Inbox from "@/src/components/inbox";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";

export default function UnassignedInboxTab(){
    return (
        <Inbox filter={WaMessageAssignStatus.UNASSIGNED}/>
    )
}