import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(localizedFormat);

export default dayjs;