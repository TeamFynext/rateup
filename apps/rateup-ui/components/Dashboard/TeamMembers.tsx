"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Select } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useExtracted } from "next-intl";

import { useTeamMemberStats } from "@/backend/dashboard/dashboard.query";

import { useTeamsByUser } from "../../backend/team/team.query";

dayjs.extend(relativeTime);

function TeamMembers() {
  const translations = useExtracted();
  const { data: teamMemberData } = useTeamsByUser();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const teams = useMemo(() => teamMemberData?.data || [], [teamMemberData]);
  const {
    data: teamData,
    isLoading,
    isFetching,
  } = useTeamMemberStats(selectedTeamId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
      queryClient.invalidateQueries({ queryKey: ["team-member-stats"] });
    }
  }, [teams, selectedTeamId]);

  return (
    <div className="bg-white rounded-lg shadow py-4 border border-[#E2E5ED] h-full">
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {translations("Team Members") || "Team Members"}
        </h2>
        <Select
          placeholder={translations("Select Team") || "Select Team"}
          data={teams.map((team) => ({
            value: team.id,
            label: team.name,
          }))}
          comboboxProps={{
            transitionProps: { transition: "pop", duration: 200 },
          }}
          value={selectedTeamId}
          onChange={(value) => setSelectedTeamId(value)}
          searchable
        />
      </div>
      {/* Scrollable table with sticky header */}
      <div className="overflow-auto max-h-[400px] rounded">
        <table className="min-w-full table-fixed text-sm text-left text-[#7A8289]">
          <thead className="sticky top-0 bg-[#F5F5F5] z-10">
            <tr>
              <td className="px-4 py-2 w-64">
                {translations("Name") || "Name"}
              </td>
              <td className="px-4 py-2 w-32">
                {translations("User Role") || "User Role"}
              </td>
              <td className="px-4 py-2 w-40">
                {translations("Assigned Chats") || "Assigned Chats"}
              </td>
              <td className="px-4 py-2 w-40">
                {translations("Assigned Tickets") || "Assigned Tickets"}
              </td>
              <td className="px-4 py-2 w-40">
                {translations("Last Login") || "Last Login"}
              </td>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TeamMemberRowSkeleton key={`skeleton-${i}`} />
                ))
              : teamData?.map((member, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 flex items-center gap-2 w-64">
                      {member.profilePhoto ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${member.profilePhoto}`}
                          alt={member.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <ProfileName name={member.name} />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.name}
                        </div>
                        <div
                          className={`text-xs ${
                            member.isOnline ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          ● {member.isOnline ? "Online" : "Offline"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 w-32">
                      <span
                        className={`inline-block w-22 text-center px-2 py-1 rounded-md text-[10px] font-semibold border ${
                          member.role === "ADMIN"
                            ? "border-[#004F98] text-[#004F98]"
                            : "border-[#075E54] text-[#075E54]"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 w-40">
                      {member.assignedChatsCount}
                    </td>
                    <td className="px-4 py-2 w-40">
                      {member.assignedTicketsCount}
                    </td>
                    <td className="px-4 py-2 w-40 text-gray-500">
                      {member.lastLoggedInAt
                        ? dayjs(member.lastLoggedInAt).fromNow()
                        : "-"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamMembers;

const TeamMemberRowSkeleton = () => (
  <tr className="border-t animate-pulse">
    <td className="px-4 py-3 w-64">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div>
          <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
          <div className="h-2 w-12 bg-gray-100 rounded" />
        </div>
      </div>
    </td>
    <td className="px-4 py-2 w-32">
      <div className="h-5 w-20 bg-gray-200 rounded-md" />
    </td>
    <td className="px-4 py-2 w-40">
      <div className="h-3 w-10 bg-gray-100 rounded" />
    </td>
    <td className="px-4 py-2 w-40">
      <div className="h-3 w-10 bg-gray-100 rounded" />
    </td>
    <td className="px-4 py-2 w-40">
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </td>
  </tr>
);

const ProfileName = ({ name }: { name: string }) => {
  const tag = name ? name.slice(0, 2).toUpperCase() : "";
  return (
    <div className="bg-[#00998733] w-10 h-10 flex items-center justify-center rounded-full">
      <div className="text-[#009987] font-semibold">{tag}</div>
    </div>
  );
};
