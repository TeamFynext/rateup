"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@mantine/core";
import {
  IconAutomation,
  IconMessage,
  IconSpeakerphone,
  IconTicket,
  IconUsers,
  IconUsersGroup,
  IconWaveSine,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MoveRight, PanelsTopLeft } from "lucide-react";

import {
  useActiveSurveyStats,
  useOverallStats,
} from "@/backend/dashboard/dashboard.query";
import { useIsTellUsMoreCompleted } from "@/backend/org/org.query";
import { StatCards, StatCardSkeleton } from "@/components/Dashboard/StatCards";
import SubscriptionCard from "@/components/Dashboard/SubscriptionCard";
import {
  SurveyDashCard,
  SurveyDashCardSkeleton,
} from "@/components/Dashboard/SurveyCard";
import TeamMembers from "@/components/Dashboard/TeamMembers";

dayjs.extend(relativeTime);

export default function DashboardHome() {
  const {
    data: isTellUsMoreComplete,
    isLoading: isTellUsMoreCompleteLoading,
    isFetched,
  } = useIsTellUsMoreCompleted();
  const { data: activeSurveyData, isLoading: activeSurveyLoading } =
    useActiveSurveyStats();
  const router = useRouter();
  const { data: overallData, isLoading: overallStatsLoading } =
    useOverallStats();

  useEffect(() => {
    if (!isFetched || isTellUsMoreCompleteLoading) return;

    if (isTellUsMoreComplete === false) {
      router.replace("/login/complete-login");
    }
  }, [isTellUsMoreComplete, isFetched, isTellUsMoreCompleteLoading]);

  return (
    <div className="px-2 pt-4 md:pt-0 lg:pt-0">
      <div className="text-[#343A40] text-xl font-semibold">Overview</div>
      <div className="space-y-10">
        {/* dashboard stats */}
        {overallStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <StatCardSkeleton key={`stat-skeleton-${idx}`} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCards
              label="New Conversations"
              value={overallData?.newChatCount ?? 0}
              valueColor="#009987"
              icon={<IconMessage width={30} height={30} color="#009987" />}
              iconBgColor="#00998733"
              OnClickAction={"/dashboard/whatsapp/inbox?tab=New"}
            />
            <StatCards
              label="Active Campaigns"
              value={overallData?.activeCampaignsCount ?? 0}
              valueColor="#009987"
              icon={<IconSpeakerphone width={30} height={30} color="#009987" />}
              iconBgColor="#00998733"
              OnClickAction={"/dashboard/campaign"}
            />
            <StatCards
              label="Active Flows"
              value={overallData?.publishedFlowsCount ?? 0}
              valueColor="#009987"
              icon={<IconWaveSine width={30} height={30} color="#009987" />}
              iconBgColor="#00998733"
              OnClickAction={"/dashboard/whatsapp/flows"}
            />
            <StatCards
              label="Active Automations"
              value={overallData?.automationsCount ?? 0}
              valueColor="#009987"
              icon={<IconAutomation width={30} height={30} color="#009987" />}
              iconBgColor="#00998733"
              OnClickAction={"/dashboard/whatsapp/automated-replies"}
            />
            <StatCards
              label="Loyalty Customers"
              value={overallData?.loyaltyCustomersCount ?? 0}
              valueColor="#004F98"
              icon={<IconUsers width={30} height={30} color="#004F98" />}
              iconBgColor="#004F9833"
              OnClickAction={"/dashboard/loyalty/customer"}
            />
            <StatCards
              label="Active Surveys"
              value={overallData?.activeWebSurveysCount ?? 0}
              valueColor="#004F98"
              icon={<PanelsTopLeft width={30} height={30} color="#004F98" />}
              iconBgColor="#004F9833"
              OnClickAction={"/dashboard/surveys"}
            />
            <StatCards
              label="New Tickets"
              value={overallData?.ticketCount ?? 0}
              valueColor="#004F98"
              icon={<IconTicket width={30} height={30} color="#004F98" />}
              iconBgColor="#004F9833"
              OnClickAction={"/dashboard/tickets"}
            />
            <StatCards
              label="Teams Created"
              value={overallData?.teamsCount ?? 0}
              valueColor="#004F98"
              icon={<IconUsersGroup width={30} height={30} color="#004F98" />}
              iconBgColor="#004F9833"
              OnClickAction={"/dashboard/teams"}
            />
          </div>
        )}

        {/* Active Flows Section */}
        {activeSurveyLoading ||
        activeSurveyData?.filter((item: any) => item.type === "waFlow").length >
          0 ? (
          <section>
            <div className="flex items-center gap-1 mb-2">
              <div className="p-1.5 rounded-md bg-[#00998733]">
                <IconWaveSine color="#009987" />
              </div>
              <h2 className="text-xl font-semibold text-black">Active Flows</h2>
            </div>

            <div className="flex flex-col items-center gap-2">
              {activeSurveyLoading ? (
                <GridWrapper>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <SurveyDashCardSkeleton key={`flow-skeleton-${idx}`} />
                  ))}
                </GridWrapper>
              ) : (
                <>
                  <GridWrapper>
                    {activeSurveyData
                      ?.filter((item: any) => item.type === "waFlow")
                      .map((item: any) => (
                        <SurveyDashCard
                          key={item.id}
                          title={item.title}
                          itemId={item.dbFlowId}
                          createdAt={item.createdAt}
                          responseCount={item.responseCount}
                          type="flow"
                          OnClickAction={`/dashboard/whatsapp/flows/v${item.version}`}
                        />
                      ))}
                  </GridWrapper>

                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="filled"
                      color="#009987"
                      radius="md"
                      size="sm"
                      className="bg-[#009987] hover:bg-[#00b29f]"
                      onClick={() => router.push("/dashboard/whatsapp/flows")}
                    >
                      <div className="flex items-center gap-1">
                        Go to All Flows
                        <span>
                          <MoveRight color="white" />
                        </span>
                      </div>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        {/* Active Surveys Section */}
        {activeSurveyLoading ||
        activeSurveyData?.filter((item: any) => item.type === "web").length >
          0 ? (
          <section>
            <div className="flex items-center gap-1 mb-2">
              <div className="p-1.5 rounded-md bg-[#004F9833]">
                <PanelsTopLeft color="#004F98" />
              </div>
              <h2 className="text-xl font-semibold text-black">
                Active Surveys
              </h2>
            </div>

            <div className="flex flex-col items-center gap-2">
              {activeSurveyLoading ? (
                <GridWrapper>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <SurveyDashCardSkeleton key={`web-skeleton-${idx}`} />
                  ))}
                </GridWrapper>
              ) : (
                <>
                  <GridWrapper>
                    {activeSurveyData
                      ?.filter((item: any) => item.type === "web")
                      .map((item: any) => (
                        <SurveyDashCard
                          key={item.id}
                          title={item.title}
                          itemId={item.id}
                          createdAt={item.createdAt}
                          responseCount={item.responseCount}
                          type="web"
                          OnClickAction={"/dashboard/surveys"}
                        />
                      ))}
                  </GridWrapper>

                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="filled"
                      radius="md"
                      size="sm"
                      className="bg-[#004f98] hover:bg-[#0063b1]"
                      onClick={() => router.push("/dashboard/surveys")}
                    >
                      <div className="flex items-center gap-1">
                        Go to All Surveys
                        <span>
                          <MoveRight color="white" />
                        </span>
                      </div>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <div className="w-full lg:w-[65%]">
            <TeamMembers />
          </div>
          <div className="w-full lg:w-[35%]">
            <SubscriptionCard />
          </div>
        </div>
      </div>
    </div>
  );
}

const GridWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
    {children}
  </div>
);
