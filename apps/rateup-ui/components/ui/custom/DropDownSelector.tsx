import { CheckCheck, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";

const DropdownSelector = ({
  value,
  onChange,
  data,
}: {
  value: string;
  onChange: (value) => void;
  data: {
    group: string;
    items: { value: string; label: string; icon?: any }[];
  }[];
}) => {
  const translations = useTranslations();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5">
          {(() => {
            const item = data
              .flatMap((d) => d?.items)
              ?.find((c) => c?.value === value);
            const IconComponent = item?.icon;
            if (!item) {
              return (
                <>
                  <span className="text-xs">{translations("Select")}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </>
              );
            }
            return (
              <>
                {item?.icon && (
                  <div
                    className={`w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center`}
                  >
                    <IconComponent className={`w-2.5 h-2.5`} />
                  </div>
                )}
                <span className="text-sm max-w-[80px] truncate font-medium">
                  {item?.label}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </>
            );
          })()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {data?.map((d, index) => (
          <div key={d?.group}>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {d?.group}
            </div>
            <DropdownMenuSeparator />
            {d?.items?.length > 0 ? (
              d?.items.map((item) => {
                const IconComponent = item?.icon;
                return (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() => onChange(item.value)}
                    className="gap-2"
                  >
                    {item?.icon && (
                      <div
                        className={`w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center`}
                      >
                        <IconComponent className={`w-2.5 h-2.5`} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{item.label}</div>
                    </div>
                    {item.value === value && (
                      <CheckCheck className="w-4 h-4 text-green-600" />
                    )}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {translations("Nothing found")}
              </div>
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DropdownSelector;
