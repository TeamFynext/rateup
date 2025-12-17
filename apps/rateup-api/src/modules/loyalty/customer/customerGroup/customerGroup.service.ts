import prisma from "../../../../utils/prisma.js";
import { PaginationQuery } from "./customerGroup.schema.js";

export async function getCustomersByContactGroupIdWithPagination(
  contactGroupId: string,
  query?: PaginationQuery,
) {
  const {
    page = 0,
    limit = 500,
    search = "",
    sort = "createdAt",
    desc = "asc",
    ...filter
  } = query ?? {
    page: 0,
    limit: 500,
    search: "",
    sort: "createdAt",
    desc: "asc",
  };
  let filterData = [];
  if (filter) {
    const params = new URLSearchParams(filter as any);
    for await (const [key, value] of params.entries()) {
      if (["name", "phone", "source"].includes(key)) {
        filterData.push({
          [key]: {
            contains: value,
            mode: "insensitive",
          },
        });
      } else if ("consent" === key) {
        filterData.push({
          [key]: {
            equals: value?.toLocaleLowerCase() === "true",
          },
        });
      } else if ("createdAt" === key) {
        filterData.push({
          [key]: {
            equal: value,
            mode: "insensitive",
          },
        });
      } else if ("filterGroupName" === key) {
        let splitValue = [...new Set(value?.split(","))];
        filterData.push({
          contactGroups: {
            some: {
              contactGroupId: {
                in: splitValue,
              },
            },
          },
        });
      } else {
        filterData.push({
          tags: {
            path: [key],
            string_contains: value,
          },
        });
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      name: {
        contains: search,
        mode: "insensitive",
      },
    });
    filterData.push({
      phone: {
        contains: search,
        mode: "insensitive",
      },
    });
  }
  const searchCondition: any = filterData.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});

  const totalCount = await prisma.contact.count({
    where: {
      contactGroups: {
        some: {
          contactGroupId,
        },
      },
      AND: filterData,
    },
  });
  const group = await prisma.contactGroup.findUnique({
    where: {
      id: contactGroupId,
    },
    include: {
      LoyaltyCustomerMap: {
        include: {
          loyaltyCustomer: {
            include: {
              Contact: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
      contacts: {
        include: {
          contact: true,
        },
        where: {
          contact: searchCondition,
        },
        take: limit,
        skip: page * limit,
        orderBy: {
          contact: {
            [sort]: desc,
          },
        },
      },
    },
  });
  return {
    group: group.contacts.map((c) => c.contact),
    totalCount,
    loyaltyCustomers: group.LoyaltyCustomerMap.map((c) => c.loyaltyCustomer),
  };
}
