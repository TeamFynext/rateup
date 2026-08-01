// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { ContainedTextField } from "../editor-ui.tsx";
import { useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// LocationNode Component
export const LocationNodeEditor: React.FC<NodeComponentProps<"locationNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className="flex flex-col gap-2">
      <ContainedTextField
        label="Location Name"
        placeholder="Enter location name..."
        value={typedData.name || ""}
        onChange={(e) => handleInputChange("name", e.target.value)}
        description="Name of the location to be shared"
      />

      <div className="flex flex-wrap items-center gap-2.5 *:flex-1">
        <ContainedTextField
          label="Latitude"
          required
          placeholder="e.g., 37.7749"
          value={typedData.latitude || ""}
          onChange={(e) => handleInputChange("latitude", e.target.value)}
          description="Decimal latitude coordinate"
          error={useFieldError("latitude")}
        />

        <ContainedTextField
          label="Longitude"
          required
          placeholder="e.g., -122.4194"
          value={typedData.longitude || ""}
          onChange={(e) => handleInputChange("longitude", e.target.value)}
          description="Decimal longitude coordinate"
          error={useFieldError("longitude")}
        />
      </div>

      <ContainedTextField
        label="Address (optional)"
        placeholder="Enter full address..."
        value={typedData.address || ""}
        onChange={(e) => handleInputChange("address", e.target.value)}
        description="Full address that corresponds to these coordinates"
      />

      <p className="mt-2 text-xs text-muted-foreground">
        Note: Both latitude and longitude are required for a valid location message
      </p>
    </div>
  );
};
