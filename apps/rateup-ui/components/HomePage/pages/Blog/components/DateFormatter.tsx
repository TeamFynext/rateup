import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Props = {
  dateString: string;
};

const DateFormatter = ({ dateString }: Props) => {
  const date = dayjs(dateString, "DD/MM/YYYY")
    .locale("en")
    .format("MMMM DD, YYYY");

  return <>{date}</>;
};

export default DateFormatter;
