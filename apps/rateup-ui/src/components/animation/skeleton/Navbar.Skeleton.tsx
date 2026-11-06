import { Skeleton } from "@/components/ui/skeleton.tsx";

const NavbarSkeleton = () => {
  return (
    <div className="flex flex-col items-center gap-4 border-r pt-2 px-2">
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton className="h-[35px] w-[35px]" key={i} />
      ))}
    </div>
  );
};

export default NavbarSkeleton;
