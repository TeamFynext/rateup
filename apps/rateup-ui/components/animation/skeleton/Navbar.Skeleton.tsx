import { Skeleton, Stack } from "@mantine/core";

const NavbarSkeleton = () => {
  return (
    <Stack align="center" mt={"xl"} className="border-r">
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton h={35} w={35} key={i} />
      ))}
    </Stack>
  );
};

export default NavbarSkeleton;
