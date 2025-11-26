import { Skeleton, Stack } from "@mantine/core";

const NavbarSkeleton = () => {
  return (
    <Stack align="center" className="border-r pt-2 px-2">
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton h={35} w={35} key={i} />
      ))}
    </Stack>
  );
};

export default NavbarSkeleton;
