import { Tabs } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils";

type StyledTabsProps = React.ComponentProps<typeof Tabs>;

/** shadcn Tabs root carrying the app's pill styling. Panels are supplied as `TabsContent`. */
export default function StyledTabs(props: Readonly<StyledTabsProps>) {
  const { className, ...rest } = props;
  return <Tabs className={cn("flex h-full flex-col gap-2.5", className)} {...rest} />;
}
