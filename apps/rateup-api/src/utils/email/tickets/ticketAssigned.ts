import { renderTicketEmail } from "../react/templates.js";

interface TicketEmailInput {
  ticket_link: string;
  ticket_no: string;
  board_name: string;
  column_name: string;
}

function ticketProps({ ticket_link, ticket_no, board_name, column_name }: TicketEmailInput) {
  return {
    ticketLink: ticket_link,
    ticketNo: ticket_no,
    boardName: board_name,
    columnName: column_name,
  };
}

export function createEmailBodyTicketAssigned(input: TicketEmailInput) {
  return renderTicketEmail({ variant: "assigned", ...ticketProps(input) });
}

export function createEmailBodyTicketCreated(input: TicketEmailInput) {
  return renderTicketEmail({ variant: "created", ...ticketProps(input) });
}
