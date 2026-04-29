import { CheckCircle2, FileText, Layers, XCircle, Zap } from "lucide-react";
import { useExtracted } from "next-intl";

import { formatToRelativeTime } from "@/utils/dateTime";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

function TemplateOverview({
  categoryOverview,
  templatePerformance,
  isLoading,
}) {
  const t = useExtracted("apianalytics");
  return (
    <Card>
      <CardHeader className="py-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          {t("WhatsApp Template Analytics")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryOverview?.map((category, index) => {
                const color = getCategoryColor(category.category);
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${color.bg} dark:bg-transparent`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className={`w-4 h-4 ${color.icon}`} />
                      <p className="text-xs text-muted-foreground">
                        {category.category}
                      </p>
                    </div>
                    <p className="text-xl mb-1">{category.count}</p>
                    <div className={`text-xs ${color.text}`}>
                      {category.percentage}% {t("of total")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Template List */}
            <div className="space-y-3">
              {templatePerformance?.map((template, index) => {
                const color = getCategoryColor(template.templateCategory);
                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg border hover:border-primary hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      {/* Template Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-transparent border rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">
                                {template.templateName}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-xs border ${color.icon} ${color.bg} ${color.border}`}
                              >
                                {template?.templateCategory}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {t("Last used")}:{" "}
                              {formatToRelativeTime(template?.lastUsed)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Template Metrics */}
                      <div className="flex items-center gap-4 lg:gap-6">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            {t("Messages Sent")}
                          </p>
                          <p className="text-sm">{template?.totalSent}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            {t("Success Rate")}
                          </p>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <p className="text-sm text-green-600">
                              {template?.successPercentage?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            {t("Failure Rate")}
                          </p>
                          <div className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <p className="text-sm text-red-600">
                              {template?.failurePercentage?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            {t("Avg Response")}
                          </p>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-purple-600" />
                            <p className="text-sm">
                              {template?.avgDeliveryTimeSeconds
                                ? `${template?.avgDeliveryTimeSeconds?.toFixed(1)}s`
                                : "NA"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Progress Bar for Success Rate */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${template?.successPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TemplateOverview;

const getCategoryColor = (category: string) => {
  const map: Record<
    string,
    { bg: string; text: string; icon: string; border: string }
  > = {
    MARKETING: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "text-blue-600",
      border: "border-blue-200",
    },
    UTILITY: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: "text-purple-600",
      border: "border-purple-200",
    },
    AUTHENTICATION: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      icon: "text-orange-600",
      border: "border-purple-200",
    },
  };

  return map[category] || map.DEFAULT;
};
