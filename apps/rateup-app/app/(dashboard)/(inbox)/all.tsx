import Inbox from "@/src/components/inbox";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";

export default function AllInboxTab(){
    return (
        <Inbox filter={WaMessageAssignStatus.ALL}/>
    )
}