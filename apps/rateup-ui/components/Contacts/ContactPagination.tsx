import React from "react";

import { Group, Pagination } from "@mantine/core";

import { PAGE_SIZE } from "../../utils/constants";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";

const ContactPagination = ({ totalPageCount, setPagination, pagination }) => {
  return (
    <Pagination.Root
      total={totalPageCount}
      onChange={(value) => {
        setPagination((prev) => ({
          ...prev,
          pageIndex: Number(value - 1),
        }));
      }}
      mt={"xs"}
    >
      <Group gap={5}>
        <Pagination.First disabled={pagination.pageIndex === 0} />
        <Pagination.Previous disabled={pagination.pageIndex === 0} />
        <Pagination.Items />
        <Pagination.Next
          disabled={pagination.pageIndex === Math.round(totalPageCount)}
        />
        <Pagination.Last
          disabled={pagination.pageIndex === Math.round(totalPageCount)}
        />
        <ContainedSelection
          onChange={(value) => {
            setPagination((prev) => ({
              ...prev,
              pageSize: Number(value),
            }));
          }}
          value={String(pagination.pageSize)}
          data={PAGE_SIZE}
          allowDeselect={false}
          styles={{
            input: {
              height: 10,
              width: 80,
            },
          }}
        />
      </Group>
    </Pagination.Root>
  );
};

export default ContactPagination;
