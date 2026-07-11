import type { WaTemplateComponent, WaTemplateFetchBody } from "@/types/global";

import WaInboxTemplateComponents from "./components/index.tsx";

interface Props {
  templateBody: WaTemplateFetchBody;
  parameters: WaTemplateComponent[];
}
export default function WaInboxTemplate(props: Props) {
  return (
    <div className="w-[298px] flex flex-col gap-2">
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
