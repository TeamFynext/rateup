import React from "react";

import { BarChart3, Edit2, FileText } from "lucide-react";

import { useSubscription } from "@/backend/subscription/subscription.query";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { EditSurvey } from "./EditSurvey";

export function SurveyQuestionTab({ questions }) {
  console.log(questions);
  return (
    <div className="space-y-4 max-w-5xl">
      {[
        {
          q: 1,
          text: "How satisfied are you with our service?",
          type: "Rating Scale (1-5 stars)",
          required: true,
          responseType: "Single Choice",
        },
        {
          q: 2,
          text: "What features do you use most frequently?",
          type: "Multiple Choice",
          required: true,
          responseType: "Multiple Selection",
        },
        {
          q: 3,
          text: "How likely are you to recommend us to a friend?",
          type: "NPS Scale (0-10)",
          required: true,
          responseType: "Single Choice",
        },
        {
          q: 4,
          text: "What improvements would you like to see?",
          type: "Long Text",
          required: false,
          responseType: "Text Input",
        },
        {
          q: 5,
          text: "Rate your onboarding experience",
          type: "Rating Scale (1-5 stars)",
          required: true,
          responseType: "Single Choice",
        },
      ].map((question) => (
        <Card
          key={question.q}
          className="group hover:shadow-lg transition-all border-slate-200 bg-white"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2E5BFF] to-blue-400 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <span className="text-lg">{question.q}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">{question.text}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {question.type}
                    </p>
                    <div className="flex items-center gap-2">
                      {question.required && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-red-50 text-red-700 border-red-200"
                        >
                          Required
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {question.responseType}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs bg-slate-50 text-slate-600 border-slate-200"
                      >
                        {Math.floor(Math.random() * 500 + 500)} responses
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        className="w-full h-12 border-dashed border-2 hover:border-[#2E5BFF] hover:bg-[#2E5BFF]/5"
      >
        <FileText className="w-4 h-4 mr-2" />
        Add New Question
      </Button>
    </div>
  );
}

export function SurveyEditTab({
  survey,
  questions,
  addQnTrigger,
  setSelectedLanguage,
  setFunToRunBeforeSurveyIdPageHeaderTabsChange,
}) {
  const { data: subscription } = useSubscription();
  return (
    <EditSurvey
      questions={questions}
      addQnTrigger={addQnTrigger}
      surveyLanguages={survey?.languages}
      setSelectedLanguage={setSelectedLanguage}
      subscription={subscription}
      setFunToRunBeforeSurveyIdPageHeaderTabsChange={
        setFunToRunBeforeSurveyIdPageHeaderTabsChange
      }
    />
  );
}
