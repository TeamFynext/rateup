import { parse } from "date-fns";

type Props = {
  dateString: string;
};

const DateFormatter = ({ dateString }: Props) => {
  const date = parse(dateString, "yyyy-MM-dd", new Date());

  return <time dateTime={dateString}>{}</time>;
};

export default DateFormatter;
