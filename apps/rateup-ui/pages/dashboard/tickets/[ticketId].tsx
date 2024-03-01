import React from "react";
import SingleTicket from "../../../components/Tickets/SingleTicket";
import { useRouter } from "next/router";

const TicketId = () => {
  const router = useRouter();
  const ticketId = router?.query?.ticketId as string;

  return <SingleTicket id={ticketId} />;
};

export default TicketId;
