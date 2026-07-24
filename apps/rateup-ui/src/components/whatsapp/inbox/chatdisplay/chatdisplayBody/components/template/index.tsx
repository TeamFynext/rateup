import type { WaTemplateComponent, WaTemplateFetchBody } from "@/types/global";

import WaInboxTemplateComponents from "./components/index.tsx";

interface Props {
  templateBody: WaTemplateFetchBody;
  parameters: WaTemplateComponent[];
}
export default function WaInboxTemplate(props: Props) {
  return (
    // 298px is the card's intended width, not a floor: the bubble it sits in is
    // capped at a share of the thread, so on a phone a fixed width overflows it.
    <div className="flex w-full max-w-74.5 flex-col gap-2">
      {props?.templateBody?.components?.map((component, i) => (
        <WaInboxTemplateComponents
          key={i}
          parameterData={props?.parameters?.find(
            (param) => param?.type === component?.type.toLowerCase(),
          )}
          templateComponent={component}
        />
      ))}
    </div>
  );
}
