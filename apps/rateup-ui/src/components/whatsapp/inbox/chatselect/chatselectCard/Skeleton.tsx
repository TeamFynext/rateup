import { Skeleton } from "@/components/ui/skeleton.tsx";

const ChatSelectSkeletonCard = () => {
  return (
    <>
      <div className="py-3 px-4">
        <div className="flex items-center gap-3 py-0.5">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-3 w-[15%]" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-[45%]" />
              <Skeleton className="h-3 w-[10%]" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-b border-border/60" />
    </>
  );
};

const ChatSelectSkeletonCardList = () => {
  return (
    <>
      {Array.from({ length: 7 }, (_, index) => (
        <ChatSelectSkeletonCard key={index} />
      ))}
    </>
  );
};

export default ChatSelectSkeletonCardList;
