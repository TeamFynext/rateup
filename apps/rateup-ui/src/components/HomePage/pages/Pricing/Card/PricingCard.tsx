import { IconCircleCheck, IconX } from "@tabler/icons-react";

export const generateListItems = (listData: string[] = []) => (
  <ul className="flex flex-col gap-2 text-base">
    {listData.map((item) => {
      const isNegative = item.startsWith("-");
      const displayName = isNegative ? item.substring(1) : item;
      return (
        <li key={item} className="flex items-center gap-2">
          {isNegative ? (
            <IconX style={{ width: 16, height: 16, color: "red" }} />
          ) : (
            <IconCircleCheck style={{ width: 16, height: 16, color: "green" }} />
          )}
          <span>{displayName}</span>
        </li>
      );
    })}
  </ul>
);
