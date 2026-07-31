// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconRefresh, IconTypography, IconX } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { EditorContent } from "@tiptap/react";
import { useEffect, useMemo } from "react";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  useProductSetsByCatalog,
  useSyncProductSets,
} from "@/backend/whatsapp/catalog/productSet.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import InsertEmoji from "@/components/RichTextEditor/InsertEmoji/index.tsx";
import { WaTextCharacterCount } from "@/components/RichTextEditor/wa-editor/character-count.tsx";
import { useWaEditor } from "@/components/RichTextEditor/wa-editor/use-wa-editor.ts";
import { BlockquoteToolbar } from "@/components/tiptap/toolbars/blockquote.tsx";
import { BoldToolbar } from "@/components/tiptap/toolbars/bold.tsx";
import { BulletListToolbar } from "@/components/tiptap/toolbars/bullet-list.tsx";
import { CodeToolbar } from "@/components/tiptap/toolbars/code.tsx";
import { ItalicToolbar } from "@/components/tiptap/toolbars/italic.tsx";
import { OrderedListToolbar } from "@/components/tiptap/toolbars/ordered-list.tsx";
import { RedoToolbar } from "@/components/tiptap/toolbars/redo.tsx";
import { StrikeThroughToolbar } from "@/components/tiptap/toolbars/strikethrough.tsx";
import { ToolbarProvider } from "@/components/tiptap/toolbars/toolbar-provider.tsx";
import { UndoToolbar } from "@/components/tiptap/toolbars/undo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import { CatalogMessages } from "../../types/node-types.ts";
import type { CatalogNodeData } from "../../types/node-types.ts";
import { ContainedMultiSelect, ContainedSelection, ContainedTextField } from "../editor-ui.tsx";
import { styles } from "./shared.tsx";
import type { ListRow, NodeComponentProps } from "./shared.tsx";

export const CatalogNodeEditor = ({
  nodeData,
  handleInputChange,
}: NodeComponentProps<"catalogNode">) => {
  const typedData = nodeData as CatalogNodeData;
  const headerEditor = useWaEditor({
    content: typedData.header || "",
    placeholder: "Enter header text...",
    max: 60,
    onChange: (value) => handleInputChange("header", value),
  });
  const bodyEditor = useWaEditor({
    content: typedData?.body || "",
    placeholder: "Enter your message text here...",
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });
  const params = useParams({
    strict: false,
  });
  const flowbotId = params.flowbotId as string;
  const { data: automation, isPending } = useWaAutomatedReplyById(flowbotId);
  const { data, isLoading } = useConnectedWaCatalog(
    typedData.whatsappSettingsPhoneId || automation?.whatsappSettingsPhoneId || "",
  );

  const syncProductSetsMut = useSyncProductSets();
  const { data: productSets, isLoading: isLoadingProductSets } = useProductSetsByCatalog(
    typedData.catalogId,
  );

  useEffect(() => {
    if (data && (!typedData.catalogId || typedData.catalogId !== data.catalogId)) {
      handleInputChange("catalogId", data.catalogId);
    }
  }, [data]);

  const productSetOptions = useMemo(
    () =>
      productSets?.map((ps) => ({
        value: ps.productSetId,
        label: ps.name,
      })) || [],
    [productSets],
  );

  const products = useMemo(
    () =>
      data
        ? (data.products ?? []).map((p) => ({
            value: p.retailer_id ?? "",
            label: p?.productProps?.title,
          }))
        : [],
    [data],
  );

  const filteredProducts = useMemo(() => {
    if (!typedData.useProductSet || !typedData.productSetId) {
      return products;
    }

    const selectedProductSet = productSets?.find(
      (ps) => ps.productSetId === typedData.productSetId,
    );

    if (!selectedProductSet) {
      return products;
    }

    // Filter products to only show those in the selected product set
    return products.filter((p: { value: string }) =>
      selectedProductSet.productIds.includes(p.value),
    );
  }, [products, typedData.useProductSet, typedData.productSetId, productSets]);

  if (isLoading || isPending || isLoadingProductSets) return <RateupLoader />;
  return (
    <div className="flex flex-col gap-2">
      <ContainedSelection
        label={"Catalog Message type"}
        placeholder="Select"
        value={typedData?.type || ""}
        onChange={(value) => {
          handleInputChange("type", value);
          // Clear product set when changing away from ProductSet type
          if (value !== CatalogMessages.ProductSet) {
            handleInputChange("useProductSet", false);
            handleInputChange("productSetId", undefined);
          } else {
            // Set useProductSet to true when ProductSet is selected
            handleInputChange("useProductSet", true);
          }
          // Initialize sections array for Multi-Product if not already present
          if (value === CatalogMessages.MultiProduct && !typedData.sections) {
            handleInputChange("sections", []);
          }
        }}
        data={Object.values(CatalogMessages)}
        allowDeselect={false}
      />

      {typedData?.type === CatalogMessages.ProductSet && (
        <ContainedSelection
          label="Product Set"
          placeholder="Choose product set"
          data={productSetOptions}
          value={typedData.productSetId || ""}
          onChange={(value) => handleInputChange("productSetId", value)}
          withAsterisk
          description="Products from this set will be displayed"
          rightSectionPointerEvents="all"
          rightSection={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-blue-600"
              onClick={() => typedData.catalogId && syncProductSetsMut.mutate(typedData.catalogId)}
              disabled={syncProductSetsMut.isPending || !typedData.catalogId}
              title="Sync from Meta"
            >
              {syncProductSetsMut.isPending ? <Spinner /> : <IconRefresh size={16} />}
            </Button>
          }
        />
      )}
      {(typedData?.type === CatalogMessages.MultiProduct ||
        typedData?.type === CatalogMessages.ProductSet) && (
        <>
          <div className="text-xs font-bold text-muted-foreground">
            Header Text ( Required ) <span className="text-red-500">*</span>
          </div>
          <div className="flex items-start space-x-2 pb-0">
            <div className="flex-1">
              <ToolbarProvider editor={headerEditor!}>
                <TooltipProvider>
                  <EditorContent
                    editor={headerEditor}
                    style={{
                      backgroundColor: "var(--accent)",
                      borderRadius: "5px",
                      maxHeight: "200px",
                      minHeight: "120px",
                    }}
                    className="overflow-y-auto rounded-xl"
                  />
                  <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                    <WaTextCharacterCount editor={headerEditor} max={60} />
                  </div>
                  <div className="flex flex-wrap p-2">
                    <div className="mt-1 flex items-center">
                      <InsertEmoji editor={headerEditor} />
                    </div>
                    <Popover>
                      <PopoverTrigger>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                          <IconTypography className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full">
                        <div className="flex flex-nowrap gap-1">
                          <div className="flex items-center">
                            <BoldToolbar />
                            <ItalicToolbar />
                            <StrikeThroughToolbar />
                            <CodeToolbar />
                          </div>
                          <div className="flex items-center">
                            <BlockquoteToolbar />
                            <BulletListToolbar />
                            <OrderedListToolbar />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center">
                      <UndoToolbar />
                      <RedoToolbar />
                    </div>
                  </div>
                </TooltipProvider>
              </ToolbarProvider>
            </div>
          </div>
        </>
      )}
      <div className="text-xs font-bold text-muted-foreground">
        {`Body Text ${typedData?.type === CatalogMessages.SingleProduct ? " ( optional ) " : ""}`}{" "}
        <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <IconTypography className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <div className="text-xs font-bold text-muted-foreground">Footer (optional)</div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={footerEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={footerEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={footerEditor} max={60} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={footerEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <IconTypography className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      {typedData.type === CatalogMessages.Catalog && (
        <ContainedSelection
          label={"Thumbnail Product (optional)"}
          data={filteredProducts}
          value={typedData?.thumbnailProductId || ""}
          onChange={(value) => handleInputChange("thumbnailProductId", value)}
          placeholder="Select"
        />
      )}
      {typedData.type === CatalogMessages.SingleProduct && (
        <ContainedSelection
          label={"Product Retailer ID"}
          withAsterisk
          data={filteredProducts}
          value={typedData?.productRetailerId || ""}
          onChange={(value) => handleInputChange("productRetailerId", value)}
          placeholder="Select"
        />
      )}
      {(typedData.sections || []).map(
        (section: NonNullable<CatalogNodeData["sections"]>[0], sectionIndex: number) => (
          <div
            key={sectionIndex}
            className={`${styles.sectionContainer} my-2 flex flex-col gap-4 p-2`}
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
          >
            <ContainedTextField
              label={`Section ${sectionIndex + 1} Title`}
              placeholder="Enter section title"
              value={section.title || ""}
              onChange={(e) => {
                const newSections = [...(typedData.sections || [])];
                newSections[sectionIndex] = {
                  ...newSections[sectionIndex],
                  title: e.target.value,
                };
                handleInputChange("sections", newSections);
              }}
              maxLength={24}
              description="Max 24 characters"
              rightSection={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => {
                    const newSections = [...(typedData.sections || [])];
                    newSections.splice(sectionIndex, 1);
                    handleInputChange("sections", newSections);
                  }}
                >
                  <IconX size={16} />
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground">
              Catalog Multi product message support up to 10 sections, with a minimum of 1 product
              per section and a maximum of 30 products across all sections.
            </p>
            <ContainedMultiSelect
              label={"Products"}
              value={section.productItems || []}
              data={filteredProducts}
              onChange={(values) => {
                const newSections = [...(typedData.sections || [])];
                newSections[sectionIndex] = {
                  ...newSections[sectionIndex],
                  productItems: values,
                };
                handleInputChange("sections", newSections);
              }}
              placeholder="Select multiple items"
            />
          </div>
        ),
      )}
      {typedData.type === CatalogMessages.MultiProduct && (
        <Button
          variant="outline"
          disabled={(typedData.sections?.length ?? 0) >= 10}
          onClick={() => {
            const newSections = [
              ...(typedData.sections || []),
              { title: "", rows: [] as ListRow[] },
            ];
            handleInputChange("sections", newSections);
          }}
          className="mt-2"
        >
          + Add Section
        </Button>
      )}
    </div>
  );
};
