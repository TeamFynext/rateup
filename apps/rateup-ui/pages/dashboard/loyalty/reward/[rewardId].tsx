import { useRouter } from "next/router";
import { useReward } from "../../../../backend/loyalty/reward/reward.query";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { CreateRewardForm } from "../../../../components/loyalty/reward/CreateRewardModal";

export default function (props) {
  const router = useRouter();
  const { rewardId } = router.query as { rewardId: string };

  const { data: reward, isError, error, isLoading } = useReward(rewardId);

  if (isError) {
    console.error(error);
    return;
  } else if (isLoading || !reward) {
    return <RateupLoader />;
  }

  return <CreateRewardForm initialValues={reward} close={() => {}} />;
}
