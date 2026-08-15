import { TemplateType } from "../../../../generated/prisma/client.js";
import { WHATSAPP_BUTTON_TYPE } from "../../../types/whatsapp.types.js";
import { WaTemplateComponentType, WaTemplateSupportedFormats } from "../../../types/enums.js";
import dayjs from "dayjs";
import { isEmptyString } from "../../../utils/commonUtils.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { generateOrderReferenceId } from "../automatedReply/wa_automatedReply.utils.js";
import { getConnectedWaCatalog } from "../catalog/catalog.service.js";

/**
 * Fills a template's component parameters for one recipient.
 *
 * There were two of these. This one (the API's) resolves a short link to the
 * team's own SurveyTeamMap and handles catalog, MPM, order-details and copy-code
 * buttons; the campaign worker had its own copy that skipped the lookup entirely
 * and sent the raw id from the template's example — so the same template produced
 * different button URLs depending on which path sent it. One builder, one answer.
 *
 * Body parameters arrive one of two ways: already filled by the caller
 * (`parameters`), or derived per contact from `personalize`, which is what a
 * campaign needs to substitute a name or custom field per recipient.
 */
export interface BuildTemplateComponentsInput {
  dbTemplate: any;
  orgId: string;
  phone: string;
  teamId?: string;
  /** Pre-filled body parameters (the single-send path). */
  parameters?: any[];
  /** Per-contact substitution (the campaign path). */
  personalize?: {
    contact: { name?: string | null; customFields?: { slug?: string; value?: string }[] | null };
    contactTags: string[];
  };
  tag?: string;
  buttonVariable?: string;
  quickReplyPayload?: string[];
  /** Campaign flows carry a flow button. */
  includeFlowButton?: boolean;
  /**
   * Signed context for the flow button (see flows/flowToken.ts). Falls back to
   * the bare phone, which the reply handlers still accept as a legacy token.
   */
  flowToken?: string;
}

export async function buildTemplateComponents({
  dbTemplate,
  orgId,
  phone,
  teamId,
  parameters = [],
  personalize,
  tag,
  buttonVariable,
  quickReplyPayload,
  includeFlowButton = false,
  flowToken,
}: BuildTemplateComponentsInput): Promise<any[]> {
  const { data, defaultValues, whatsappSettingsPhoneId } = dbTemplate;
  const components: any[] = [...parameters];

  if (includeFlowButton) {
    components.push({
      type: "button",
      sub_type: "flow",
      index: 0,
      parameters: [{ type: "action", action: { flow_token: flowToken ?? phone } }],
    });
  }

  // Campaign personalization: one body parameter per configured tag, falling
  // back to the template's own example when the contact has no value.
  if (personalize) {
    const example = data?.components?.find((c: any) => c.example?.body_text)?.example
      ?.body_text?.[0];
    if ((example?.length ?? 0) > 0) {
      components.push({
        type: "body",
        parameters: personalize.contactTags?.map((t, i) => ({
          type: "text",
          text:
            t === "name"
              ? personalize.contact?.name || example[i]
              : personalize.contact.customFields?.find((f) => f?.slug === t)?.value || example[i],
        })),
      });
    }
  }

  const headerComponent = dbTemplate.data.components.find(
    (c: any) => c.type.toLowerCase() === WaTemplateComponentType.HEADER,
  );

  const format = headerComponent?.format;

  // Function to push a new HEADER component
  const addHeaderComponent = (
    format: WaTemplateSupportedFormats,
    link: string,
    filename: string | null = null,
  ) => {
    const newComponent = {
      type: WaTemplateComponentType.HEADER,
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: {
            link,
            ...(filename ? { filename } : {}),
          },
        },
      ],
    };
    components.push(newComponent);
  };

  if (!components.some((c: any) => c.type === WaTemplateComponentType.HEADER)) {
    switch (format) {
      case WaTemplateSupportedFormats.IMAGE:
        if (defaultValues?.image?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.IMAGE,
            getFileUrlFromKey(defaultValues.image.link),
          );
        } else {
          throw new Error("Image not found in template. Please upload an image and try again");
        }
        break;

      case WaTemplateSupportedFormats.DOCUMENT:
        if (defaultValues?.document?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.DOCUMENT,
            getFileUrlFromKey(defaultValues.document.link),
            defaultValues?.document?.filename,
          );
        } else {
          throw new Error("File not found in template. Please upload a document and try again");
        }
        break;
      case WaTemplateSupportedFormats.VIDEO:
        if (defaultValues?.video?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.VIDEO,
            getFileUrlFromKey(defaultValues.video.link),
          );
        } else {
          throw new Error("Video not found in template. Please upload a video and try again");
        }
        break;
      case WaTemplateSupportedFormats.PRODUCT:
        const catalog = await getConnectedWaCatalog(whatsappSettingsPhoneId!, orgId);
        if (!catalog || catalog.catalogId !== defaultValues?.catalog?.catalogId) {
          log.error(
            "The selected catalog not linked to the selected account: catalogId => %s, phoneId => %s",
            defaultValues?.catalog?.catalogId,
            whatsappSettingsPhoneId,
          );
          throw Error("The selected catalog not linked to the selected whatsapp account");
        }
        components.push({
          type: WaTemplateComponentType.HEADER,
          parameters: [
            {
              type: WaTemplateSupportedFormats.PRODUCT.toLocaleUpperCase(),
              [WaTemplateSupportedFormats.PRODUCT.toLocaleLowerCase()]: {
                product_retailer_id: defaultValues?.catalog?.spm?.product_retailer_id,
                catalog_id: catalog.catalogId,
              },
            },
          ],
        });
        break;
      default:
        // Handle unsupported formats if needed
        break;
    }
  }

  async function processComponents() {
    for await (const item of dbTemplate.data.components) {
      if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
        let quickReplyIdx = 0;
        for await (const [idx, button] of item.buttons?.entries() ?? []) {
          switch (button?.type) {
            case "URL": {
              // A URL button with no example has nothing to fill in.
              if ((button.example?.length ?? 0) === 0) break;
              if (button?.example?.[0]?.startsWith(":")) {
                let shortUrlId = button?.example[0].slice(1);
                if (shortUrlId?.startsWith("error")) continue;

                const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                  where: { shortUrlId },
                });
                if (!surveyTeamMapData) continue;

                const surveyTeamMapWithTeam = await prisma.surveyTeamMap.findFirst({
                  where: {
                    surveyId: surveyTeamMapData.surveyId,
                    ...(teamId && { teamId }),
                  },
                });

                let url =
                  surveyTeamMapWithTeam?.shortUrlId ||
                  surveyTeamMapWithTeam?.id ||
                  shortUrlId ||
                  "error";
                let convertedTag = tag?.trim()?.replace(/\s+/g, "-") ?? "";
                log.info("Short URL ID: %s", url);
                log.info(
                  "length : %s",
                  `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`.length,
                );
                components.push({
                  type: "button",
                  sub_type: "url",
                  index: idx,
                  parameters: [
                    {
                      type: "text",
                      text: `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`,
                    },
                  ],
                });
              } else if (button?.url?.includes("COPY_CODE")) {
                components.push({
                  type: "button",
                  sub_type: button.type,
                  index: 0,
                  parameters: [
                    {
                      type: "text",
                      text: components?.[0]?.parameters?.[0]?.text || "123",
                    },
                  ],
                });
              } else {
                components.push({
                  type: "button",
                  sub_type: "url",
                  index: idx,
                  parameters: [
                    {
                      type: "text",
                      text: buttonVariable || button?.example?.[0] || phone,
                    },
                  ],
                });
              }
              break;
            }

            case "COPY_CODE": {
              components.push({
                type: "button",
                sub_type: button.type,
                index: 0,
                parameters: [
                  {
                    type: "coupon_code",
                    coupon_code: button.example?.[0],
                  },
                ],
              });
              break;
            }

            case WHATSAPP_BUTTON_TYPE.CATALOG: {
              components.push({
                type: "button",
                sub_type: button.type,
                index: 0,
                ...(defaultValues?.catalog?.thumbnail_product_retailer_id?.length
                  ? {
                      parameters: [
                        {
                          type: "action",
                          action: {
                            thumbnail_product_retailer_id:
                              defaultValues?.catalog?.thumbnail_product_retailer_id,
                          },
                        },
                      ],
                    }
                  : {}),
              });
              break;
            }

            case WHATSAPP_BUTTON_TYPE.MPM: {
              components.push({
                type: "button",
                sub_type: button.type,
                index: 0,
                parameters: [
                  {
                    type: "action",
                    action: {
                      thumbnail_product_retailer_id:
                        isEmptyString(defaultValues?.catalog?.thumbnail_product_retailer_id) ??
                        undefined,
                      sections: defaultValues?.catalog?.mpm?.sections?.map(
                        ({ title, products }: any) => ({
                          title,
                          product_items: products.map((p: any) => ({
                            product_retailer_id: p,
                          })),
                        }),
                      ),
                    },
                  },
                ],
              });
              break;
            }

            case WHATSAPP_BUTTON_TYPE.ORDER_DETAILS: {
              // An ORDER_DETAILS template builds this button itself, and only
              // one of them is ever valid per message.
              if (
                dbTemplate.templateType === TemplateType.ORDER_DETAILS ||
                components.some((c: any) => c.type === "button" && c.sub_type === "order_details")
              ) {
                break;
              }
              const sub_total =
                Number(defaultValues?.orderDetails?.item?.price) *
                Number(defaultValues?.orderDetails?.item?.quantity);
              const total_amount =
                sub_total +
                Number(defaultValues?.orderDetails?.shipping ?? 0) +
                Number(defaultValues?.orderDetails?.tax ?? 0) -
                Number(defaultValues?.orderDetails?.discount ?? 0);
              components.push({
                type: "button",
                sub_type: button.type.toLowerCase(),
                index: 0,
                parameters: [
                  {
                    type: "action",
                    action: {
                      order_details: {
                        reference_id: generateOrderReferenceId(),
                        currency: "INR",
                        type: defaultValues?.orderDetails?.productType,
                        payment_settings: [
                          {
                            type: "payment_gateway",
                            payment_gateway: {
                              type: defaultValues?.orderDetails?.paymentType,
                              configuration_name: defaultValues?.orderDetails?.paymentConfigName,
                            },
                          },
                        ],
                        ...(defaultValues?.orderDetails?.productType === "physical-goods"
                          ? {
                              shipping_info: {
                                country: "IN",
                                addresses: [],
                              },
                            }
                          : {}),
                        order: {
                          items: [
                            {
                              amount: {
                                offset: 100,
                                value: Number(defaultValues?.orderDetails?.item?.price) * 100,
                              },
                              ...(defaultValues?.orderDetails?.item?.salePrice
                                ? {
                                    sale_amount: {
                                      offset: 100,
                                      value:
                                        Number(defaultValues?.orderDetails?.item?.salePrice) * 100,
                                    },
                                  }
                                : {}),
                              name: defaultValues?.orderDetails?.item?.name,
                              quantity: defaultValues?.orderDetails?.item?.quantity,
                              country_of_origin: defaultValues?.orderDetails?.item?.origin,
                              importer_name: defaultValues?.orderDetails?.item?.importerName,
                              importer_address: {
                                address_line1: defaultValues?.orderDetails?.item?.importerAddress1,
                                city: defaultValues?.orderDetails?.item?.importerCity,
                                zone_code: defaultValues?.orderDetails?.item?.importerZoneCode,
                                postal_code: defaultValues?.orderDetails?.item?.importerPostalCode,
                                country_code: "IN",
                              },
                            },
                          ],
                          sub_total: {
                            offset: 100,
                            value: sub_total * 100,
                          },
                          shipping: {
                            offset: 100,
                            value: Number(defaultValues?.orderDetails?.shipping) * 100,
                          },
                          tax: {
                            offset: 100,
                            description: defaultValues?.orderDetails?.taxDescription,
                            value: Number(defaultValues?.orderDetails?.tax) * 100,
                          },
                          ...(defaultValues?.orderDetails?.discount
                            ? {
                                discount: {
                                  offset: 100,
                                  description: defaultValues?.orderDetails?.discountDescription,
                                  value: Number(defaultValues?.orderDetails?.discount) * 100,
                                },
                              }
                            : {}),
                          status: "pending",
                          ...(defaultValues?.orderDetails?.expiry
                            ? {
                                expiration: {
                                  timestamp: dayjs(defaultValues?.orderDetails?.expiry)
                                    .add(300, "seconds")
                                    .unix(),
                                },
                              }
                            : {}),
                        },
                        total_amount: {
                          offset: 100,
                          value: total_amount * 100,
                        },
                      },
                    },
                  },
                ],
              });
              break;
            }

            case WHATSAPP_BUTTON_TYPE.QUICK_REPLY: {
              // Payloads are consumed in order, one per quick reply the caller
              // supplied — a template may carry more buttons than payloads.
              if (
                (quickReplyPayload?.length ?? 0) > quickReplyIdx &&
                quickReplyPayload?.[quickReplyIdx]
              ) {
                components.push({
                  type: "button",
                  sub_type: button.type,
                  index: idx,
                  parameters: [
                    {
                      type: "payload",
                      payload: quickReplyPayload[quickReplyIdx],
                    },
                  ],
                });
                quickReplyIdx++;
              }
              break;
            }
          }
        }
      }
      if (item.type?.toLowerCase() === WaTemplateComponentType.CAROUSEL) {
        const headerFormat = item?.cards?.[0]?.components.find(
          (c: any) => c?.type.toLowerCase() === WaTemplateComponentType.HEADER,
        )?.format;
        if (headerFormat === WaTemplateSupportedFormats.PRODUCT) {
          const catalog = await getConnectedWaCatalog(whatsappSettingsPhoneId!, orgId);
          if (!catalog || catalog.catalogId !== defaultValues?.catalog?.catalogId) {
            log.error(
              "The selected catalog not linked to the selected account: catalogId => %s, phoneId => %s",
              defaultValues?.catalog?.catalogId,
              whatsappSettingsPhoneId,
            );
            throw Error("The selected catalog not linked to the selected whatsapp account");
          }
          let cards = await Promise.all(
            item?.cards?.map(async (card: any, index: number) => {
              const cardInComponents = components.find(
                (c: any) => c.type === WaTemplateComponentType.CAROUSEL,
              )?.cards?.[index];
              const cardDefaultValues = defaultValues?.productCarousel?.find(
                (c: any) => c.cardIndex === index,
              );
              let cardComponents = cardInComponents ? [...cardInComponents.components] : [];
              for (const comp of card.components) {
                switch (comp.type.toLowerCase()) {
                  case WaTemplateComponentType.HEADER: {
                    if (!comp.format) continue;
                    if (
                      !cardComponents?.some((c: any) => c.type === WaTemplateComponentType.HEADER)
                    ) {
                      const productId = cardDefaultValues?.product_retailer_id;
                      cardComponents.push({
                        type: WaTemplateComponentType.HEADER,
                        parameters: [
                          {
                            type: comp.format.toLowerCase(),
                            [comp.format.toLowerCase()]: {
                              product_retailer_id: productId,
                              catalog_id: catalog.catalogId,
                            },
                          },
                        ],
                      });
                    }
                    break;
                  }

                  case WaTemplateComponentType.BUTTONS:
                    {
                      for (const [idx, button] of comp.buttons?.entries() ?? []) {
                        if (button?.type === "URL") {
                          if (button?.example?.[0]?.startsWith(":")) {
                            let shortUrlId = button?.example[0].slice(1);
                            if (shortUrlId?.startsWith("error")) continue;

                            const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                              where: { shortUrlId },
                            });
                            if (!surveyTeamMapData) continue;

                            const surveyTeamMapWithTeam = await prisma.surveyTeamMap.findFirst({
                              where: {
                                surveyId: surveyTeamMapData.surveyId,
                                ...(teamId && { teamId }),
                              },
                            });

                            let url =
                              surveyTeamMapWithTeam?.shortUrlId ||
                              surveyTeamMapWithTeam?.id ||
                              shortUrlId ||
                              "error";
                            let convertedTag = tag?.trim()?.replace(/\s+/g, "-") ?? "";
                            log.info("Short URL ID: %s", url);
                            log.info(
                              "length : %s",
                              `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`.length,
                            );
                            cardComponents.push({
                              type: "button",
                              sub_type: "url",
                              index: idx,
                              parameters: [
                                {
                                  type: "text",
                                  text: `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`,
                                },
                              ],
                            });
                            continue;
                          }
                          cardComponents.push({
                            type: "button",
                            sub_type: "url",
                            index: idx,
                            ...(button?.example?.[0]
                              ? {
                                  parameters: [
                                    {
                                      type: "text",
                                      text: button?.example[0],
                                    },
                                  ],
                                }
                              : {}),
                          });
                        }
                      }
                    }
                    break;
                }
              }
              return {
                card_index: index,
                components: cardComponents,
              };
            }) ?? [],
          );
          components.push({
            type: "carousel",
            cards,
          });
        } else {
          let cards = await Promise.all(
            item?.cards?.map(async (card: any, index: number) => {
              const cardInComponents = components.find(
                (c: any) => c.type === WaTemplateComponentType.CAROUSEL,
              )?.cards?.[index];
              const cardDefaultValues = defaultValues?.mediaCarousel?.find(
                (c: any) => c.cardIndex === index,
              );
              let cardComponents = cardInComponents ? [...cardInComponents.components] : [];
              for (const comp of card.components) {
                switch (comp.type.toLowerCase()) {
                  case WaTemplateComponentType.HEADER: {
                    if (!comp.format) continue;
                    if (
                      !cardComponents?.some(
                        (c: any) => c.type === WaTemplateComponentType.HEADER,
                      ) &&
                      cardDefaultValues?.headerLink
                    ) {
                      const fileKey = cardDefaultValues.headerLink;
                      cardComponents.push({
                        type: WaTemplateComponentType.HEADER,
                        parameters: [
                          {
                            type: comp.format.toLowerCase(),
                            [comp.format.toLowerCase()]: {
                              link: getFileUrlFromKey(fileKey),
                            },
                          },
                        ],
                      });
                    }
                    break;
                  }

                  case WaTemplateComponentType.BODY: {
                    // body_text is documented as a list of example sets; a flat list of
                    // strings is also accepted, so normalise to one set of values.
                    const storedExamples = comp.example?.body_text;
                    const defaultValue: string[] = Array.isArray(storedExamples?.[0])
                      ? storedExamples[0]
                      : ((storedExamples as string[] | undefined) ?? []);
                    if (defaultValue.length > 0) {
                      const cardBodyIndex = cardComponents.findIndex(
                        (component) => component.type === "body",
                      );
                      if (cardBodyIndex !== -1) {
                        let params = cardComponents[cardBodyIndex]?.parameters;
                        if (params) {
                          params.forEach((data: any, i: number) => {
                            if (typeof data?.text !== "string" || !data.text.trim()) {
                              data.text = defaultValue?.[i];
                            }
                          });
                          if (params.length < defaultValue.length) {
                            const remainingValues = defaultValue.slice(params.length);
                            remainingValues.forEach((value: string) => {
                              params.push({
                                type: "text",
                                text: value,
                              });
                            });
                          }
                          cardComponents[cardBodyIndex] = {
                            type: "body",
                            parameters: params,
                          };
                        }
                      } else {
                        cardComponents.push({
                          type: "body",
                          parameters: defaultValue.map((data: any) => ({
                            type: "text",
                            text: data,
                          })),
                        });
                      }
                    } else {
                      cardComponents = cardComponents.filter((f) => f.type !== "body");
                    }
                    break;
                  }

                  case WaTemplateComponentType.BUTTONS:
                    {
                      for (const [idx, button] of comp.buttons?.entries() ?? []) {
                        if (button?.type === "URL") {
                          if (button?.example?.[0]?.startsWith(":")) {
                            let shortUrlId = button?.example[0].slice(1);
                            if (shortUrlId?.startsWith("error")) continue;

                            const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                              where: { shortUrlId },
                            });
                            if (!surveyTeamMapData) continue;

                            const surveyTeamMapWithTeam = await prisma.surveyTeamMap.findFirst({
                              where: {
                                surveyId: surveyTeamMapData.surveyId,
                                ...(teamId && { teamId }),
                              },
                            });

                            let url =
                              surveyTeamMapWithTeam?.shortUrlId ||
                              surveyTeamMapWithTeam?.id ||
                              shortUrlId ||
                              "error";
                            let convertedTag = tag?.trim()?.replace(/\s+/g, "-") ?? "";
                            log.info("Short URL ID: %s", url);
                            log.info(
                              "length : %s",
                              `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`.length,
                            );
                            cardComponents.push({
                              type: "button",
                              sub_type: "url",
                              index: idx,
                              parameters: [
                                {
                                  type: "text",
                                  text: `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`,
                                },
                              ],
                            });
                            continue;
                          }
                          cardComponents.push({
                            type: "button",
                            sub_type: "url",
                            index: idx,
                            ...(button?.example?.[0]
                              ? {
                                  parameters: [
                                    {
                                      type: "text",
                                      text: button?.example[0],
                                    },
                                  ],
                                }
                              : {}),
                          });
                        } else if (button?.type === "QUICK_REPLY") {
                          cardComponents.push({
                            type: "button",
                            sub_type: "quick_reply",
                            index: idx,
                            ...(cardDefaultValues?.quickReplyPayload
                              ? {
                                  parameters: [
                                    {
                                      type: "payload",
                                      payload: cardDefaultValues?.quickReplyPayload,
                                    },
                                  ],
                                }
                              : {}),
                          });
                        }
                      }
                    }
                    break;
                }
              }
              return {
                card_index: index,
                components: cardComponents,
              };
            }) ?? [],
          );
          components.push({
            type: "carousel",
            cards,
          });
        }
      }
    }
  }

  // Call the function and wait for it to complete before proceeding.
  await processComponents();
  return components;
}
