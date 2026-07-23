import { Tabs } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils";

import classes from "./StyledTabs.module.css";
import classesRateUp from "./StyledTabsRateUp.module.css";

interface StyledTabsProps extends React.ComponentProps<typeof Tabs> {
  enableRateUpBlueTheme?: boolean;
}

/** shadcn Tabs root carrying the app's pill styling. Panels are supplied as `TabsContent`. */
export default function StyledTabs(props: Readonly<StyledTabsProps>) {
  const { enableRateUpBlueTheme, className, ...rest } = props;
  return (
    <Tabs
      className={cn(
        classes.root,
        enableRateUpBlueTheme ? classesRateUp.root : undefined,
        className,
      )}
      {...rest}
    />
  );
}
