import { IconRestore, IconStar } from "@tabler/icons-react";
import { produce } from "immer";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useGetAllTestimonialsByOrg } from "@/backend/testimonials/testimonial.query";
import { Button } from "@/components/ui/button.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { filterType } from "@/routes/dashboard/testimonial/$collectionId/index.tsx";
import { TestimonialTabs } from "@/routes/dashboard/testimonial/$collectionId/index.tsx";

const TestimonialFilter = ({
  filters,
  setFilters,
  activeTab,
  setType,
}: {
  filters: filterType;
  setFilters: React.Dispatch<React.SetStateAction<filterType>>;
  activeTab: TestimonialTabs;
  setType: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data: testimonials } = useGetAllTestimonialsByOrg();
  const { data: teams } = useTeamsByUser();
  const teamMultiSelectOptions = teams?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const surveyMultiSelectOptions = testimonials
    ?.filter(({ teamId }) => (filters?.teams?.length > 0 ? filters?.teams?.includes(teamId) : true))
    .map(({ survey }) => ({ label: survey?.name, value: survey?.id }));
  const { t: translations } = useTranslation();

  function removeDuplicates(surveyMultiSelectOptions) {
    const uniqueArray = [];
    const encounteredIds = [];
    for (let i = 0; i < surveyMultiSelectOptions?.length; i++) {
      const obj = surveyMultiSelectOptions[i];
      if (!encounteredIds.includes(obj.value)) {
        encounteredIds.push(obj.value);
        uniqueArray.push(obj);
      }
    }
    return uniqueArray;
  }

  const [allRatings] = useState(true);

  const filterData = (type: "date" | "rating" | "surveys" | "teams" | "length", newValue) => {
    setFilters(
      produce((draft: filterType) => {
        draft[type as string] = newValue;
      }),
    );
    setType(type);
  };

  useEffect(() => {
    if (allRatings) {
      setFilters({ ...filters, rating: null });
    }
  }, [allRatings]);

  return (
    <ScrollArea className="h-full">
      <div className="border rounded-lg p-3 w-52 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {translations("Filters")}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilters({
                date: null,
                length: null,
                rating: null,
                surveys: [],
                teams: [],
              });
              setType(null);
            }}
            className="h-6 w-6 p-0"
          >
            <IconRestore size={14} />
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          {activeTab === TestimonialTabs.Select && (
            <>
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  {translations("Select Team")}
                </label>
                <Select
                  value={filters?.teams?.[0] || ""}
                  onValueChange={(value) => filterData("teams", [value])}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={translations("All Teams")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMultiSelectOptions?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  {translations("Select survey")}
                </label>
                <Select
                  value={filters?.surveys?.[0] || ""}
                  onValueChange={(value) => filterData("surveys", [value])}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={translations("All Surveys")} />
                  </SelectTrigger>
                  <SelectContent>
                    {removeDuplicates(surveyMultiSelectOptions)?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-3">
            {activeTab !== TestimonialTabs.Share && (
              <>
                <div>
                  <div className="text-xs font-medium mb-2">{translations("Date")}</div>
                  <RadioGroup
                    value={filters?.date || ""}
                    onValueChange={(value) => filterData("date", value)}
                  >
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="new" id="date-new" />
                        <label htmlFor="date-new" className="text-xs cursor-pointer">
                          {translations("newest")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="old" id="date-old" />
                        <label htmlFor="date-old" className="text-xs cursor-pointer">
                          {translations("older")}
                        </label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div>
                  <div className="text-xs font-medium mb-2">{translations("Length")}</div>
                  <RadioGroup
                    value={filters?.length || ""}
                    onValueChange={(value) => filterData("length", value)}
                  >
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="longest" id="length-longest" />
                        <label htmlFor="length-longest" className="text-xs cursor-pointer">
                          {translations("longest")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="shortest" id="length-shortest" />
                        <label htmlFor="length-shortest" className="text-xs cursor-pointer">
                          {translations("shortest")}
                        </label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{translations("Rating")}</span>
                    <Button size="xs" variant="outline" onClick={() => filterData("rating", null)}>
                      {translations("All")}
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => filterData("rating", star)}
                        className="p-0.5"
                      >
                        <IconStar
                          size={20}
                          className={
                            filters?.rating >= star
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default TestimonialFilter;
