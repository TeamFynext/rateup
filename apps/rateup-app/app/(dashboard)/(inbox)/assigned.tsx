import Inbox from "@/src/components/inbox";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";

export default function AssignedInboxTab(){
    return (
        <Inbox filter={WaMessageAssignStatus.ASSIGNED}/>
    )
}