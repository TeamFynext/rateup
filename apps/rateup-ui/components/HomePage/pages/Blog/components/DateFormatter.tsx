import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Props = {
  dateString: string;
};

const DateFormatter = ({ dateString }: Props) => {
  const date = dayjs().from(dateString);

  return <>{date}</>;
};

export default DateFormatter;
