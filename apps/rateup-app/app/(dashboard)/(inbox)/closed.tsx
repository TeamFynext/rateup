import Inbox from "@/src/components/inbox";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";

export default function ClosedInboxTab(){
    return (
        <Inbox filter={WaMessageAssignStatus.CLOSED}/>
    )
}