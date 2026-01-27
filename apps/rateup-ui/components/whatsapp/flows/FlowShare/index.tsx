"use client";

import { useState, useEffect } from "react";
import {
    IconMail,
    IconBrandWhatsapp,
    IconBrandFacebook,
    IconCopy,
    IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ShareSection } from "./ShareSection";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR";

interface FlowShareProps {
    flowName: string;
    flowDbId: string;
    survey: any;
    surveyId: string;
}

export default function FlowShare({
    flowName,
    flowDbId,
    survey,
    surveyId,
}: FlowShareProps) {
    // Share Survey state
    const [selectedTeam, setSelectedTeam] = useState(survey?.teams?.[0]?.code || "");
    const [selectedTag, setSelectedTag] = useState("");
    const [shareUrl, setShareUrl] = useState("");
    const [surveyTeamMapId, setSurveyTeamMapId] = useState(survey?.teams?.[0]?.mapId);
    const [shortUrlId, setShortUrlId] = useState(survey?.teams?.[0]?.shortUrlId);

    // Start Message state
    const [startMessageBody, setStartMessageBody] = useState("Send this message to start survey.");
    const [startMessageSuffix, setStartMessageSuffix] = useState("");

    // Template Message state
    const [templateBody, setTemplateBody] = useState(
        "Thank you for joining us at the IEDC Summit 2025! 🎉 We hope you had an inspiring and great time at LBS College of Engineering. 🏫 🤩 We'd love to hear your thoughts! Could you please take 2 minutes to share your feedback with us? 🙏 Your input helps us make future events even better!"
    );
    const [templateFooter, setTemplateFooter] = useState("");
    const [templateCTA, setTemplateCTA] = useState("Start");

    const teamOptions = survey?.teams?.map((team) => ({
        value: team?.code,
        label: team?.code,
    })) || [];

    const selectedTeamObj = survey?.teams?.find((team) => team?.code === selectedTeam);
    const tagOptions = selectedTeamObj?.tags?.map((tag) => ({
        value: tag,
        label: tag,
    })) || [];

    // Update surveyTeamMapId and shortUrlId when selectedTeam changes
    useEffect(() => {
        const teamObj = survey?.teams?.find((team) => team?.code === selectedTeam);
        if (teamObj) {
            setSurveyTeamMapId(teamObj.mapId);
            setShortUrlId(teamObj.shortUrlId);
        }
    }, [selectedTeam, survey?.teams]);

    // Dynamically generate shareUrl based on shortUrlId and tag
    useEffect(() => {
        if (!surveyId || !surveyTeamMapId) return;

        if (shortUrlId) {
            const baseUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/was/${shortUrlId}`;
            const urlWithTag = selectedTag ? `${baseUrl}?tag=${selectedTag}` : baseUrl;
            setShareUrl(urlWithTag);
        } else {
            // Fallback URL if shortUrlId is not available
            setShareUrl(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/wa/${surveyTeamMapId}/redirect`);
        }
    }, [surveyId, surveyTeamMapId, selectedTag, shortUrlId]);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success("URL copied to clipboard!");
    };

    return (
        <div className="p-4 max-w-[1400px] mx-auto">
            <div className="flex flex-col gap-4">
                {/* Section 1: Share Survey */}
                <ShareSection
                    title="Share Survey"
                    leftContent={
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <Label>Select Team</Label>
                                <Select value={selectedTeam} onValueChange={(value) => setSelectedTeam(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Select Tag</Label>
                                <Select value={selectedTag} onValueChange={(value) => setSelectedTag(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a single Tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tagOptions.length > 0 ? (
                                            tagOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="px-2 py-6 text-center text-sm text-gray-500">
                                                No tags available
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={shareUrl}
                                    onChange={(e) => setShareUrl(e.currentTarget.value)}
                                    className="flex-1"
                                    readOnly
                                />
                                <Button onClick={handleCopyUrl}>
                                    <IconCopy size={16} className="mr-2" />
                                    Copy url
                                </Button>
                            </div>
                        </div>
                    }
                    rightTitle="How would you like to survey people?"
                    rightContent={
                        <div className="flex gap-4 justify-center items-center">
                            <button className="w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <IconMail size={28} />
                            </button>
                            <button className="w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 bg-[#25D366] text-white">
                                <IconBrandWhatsapp size={28} />
                            </button>
                            <button className="w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 bg-[#1877F2] text-white">
                                <IconBrandFacebook size={28} />
                            </button>
                        </div>
                    }
                />

                {/* Section 2: Edit Start Message */}
                <ShareSection
                    title="Edit Start Message"
                    badge={<div className="bg-green-100 dark:bg-emerald-900 text-green-700 dark:text-green-300 px-3 py-1 rounded text-xs font-medium">Saved</div>}
                    leftContent={
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <Label>Body</Label>
                                <Textarea
                                    value={startMessageBody}
                                    onChange={(e) => setStartMessageBody(e.currentTarget.value)}
                                    rows={3}
                                    className="mt-1"
                                />
                                <span className="absolute bottom-2 right-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                                    {startMessageBody.length} / 1024
                                </span>
                            </div>
                            <div className="relative">
                                <Label>Suffix</Label>
                                <Textarea
                                    value={startMessageSuffix}
                                    onChange={(e) => setStartMessageSuffix(e.currentTarget.value)}
                                    rows={3}
                                    className="mt-1"
                                />
                                <span className="absolute bottom-2 right-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                                    {startMessageSuffix.length} / 1024
                                </span>
                            </div>
                        </div>
                    }
                    rightTitle="Preview"
                    rightContent={
                        <div className="bg-[#E5DDD5] dark:bg-gray-950 rounded min-h-[350px] flex flex-col justify-end p-6 relative" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.02) 10px, rgba(0, 0, 0, 0.02) 20px)'
                        }}>
                            <div className="bg-[#DCF8C6] dark:bg-[#005c4b] rounded-md rounded-tr-sm p-3 max-w-[75%] ml-auto mb-2 border border-[#c8e6c9] dark:border-[#064e3b] relative break-words before:content-[''] before:absolute before:right-[-8px] before:top-0 before:w-0 before:h-0 before:border-l-[8px] before:border-l-[#DCF8C6] dark:before:border-l-[#005c4b] before:border-b-[8px] before:border-b-transparent">
                                <div>
                                    {startMessageBody.split("\n").map((line, i) => (
                                        <div key={i} className="text-sm" style={{ lineHeight: 1.4 }}>
                                            {line || "\u00A0"}
                                        </div>
                                    ))}
                                    <span className="text-sm mt-1 inline-block bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 px-1.5 py-0.5 rounded font-mono text-[0.85em]">
                                        #{flowName} @{selectedTeam}
                                    </span>
                                    {startMessageSuffix && startMessageSuffix.split("\n").map((line, i) => (
                                        <div key={i} className="text-sm mt-1" style={{ lineHeight: 1.4 }}>
                                            {line || "\u00A0"}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* Section 3: Edit Template Message */}
                <ShareSection
                    title="Edit Template Message"
                    badge={<div className="bg-green-100 dark:bg-emerald-900 text-green-700 dark:text-green-300 px-3 py-1 rounded text-xs font-medium">Saved</div>}
                    leftContent={
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <Button>
                                    <IconUpload size={16} className="mr-2" />
                                    Upload Image
                                </Button>
                                <Button variant="outline">
                                    Remove Image
                                </Button>
                            </div>

                            <div className="relative">
                                <Label>Body</Label>
                                <Textarea
                                    value={templateBody}
                                    onChange={(e) => setTemplateBody(e.currentTarget.value)}
                                    rows={5}
                                    className="mt-1"
                                />
                                <span className="absolute bottom-2 right-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                                    {templateBody.length} / 1024
                                </span>
                            </div>

                            <div className="relative">
                                <Label>Footer</Label>
                                <Textarea
                                    value={templateFooter}
                                    onChange={(e) => setTemplateFooter(e.currentTarget.value)}
                                    rows={2}
                                    className="mt-1"
                                />
                                <span className="absolute bottom-2 right-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                                    {templateFooter.length} / 60
                                </span>
                            </div>

                            <div className="relative">
                                <Label>CTA</Label>
                                <Input
                                    value={templateCTA}
                                    onChange={(e) => setTemplateCTA(e.currentTarget.value)}
                                    className="mt-1"
                                />
                                <span className="absolute bottom-2 right-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                                    {templateCTA.length} / 20
                                </span>
                            </div>
                        </div>
                    }
                    rightTitle="Preview"
                    rightContent={
                        <div className="bg-[#E5DDD5] dark:bg-gray-950 rounded min-h-[350px] flex flex-col justify-end p-6 relative" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.02) 10px, rgba(0, 0, 0, 0.02) 20px)'
                        }}>
                            <div className="bg-white dark:bg-gray-700 rounded-md rounded-tl-sm p-3 max-w-[75%] border border-gray-200 dark:border-gray-600 relative break-words before:content-[''] before:absolute before:left-[-8px] before:top-0 before:w-0 before:h-0 before:border-r-[8px] before:border-r-white dark:before:border-r-gray-700 before:border-b-[8px] before:border-b-transparent">
                                <div className="text-sm leading-[1.4] text-[#303030] dark:text-gray-200 mb-0 whitespace-pre-wrap break-words">
                                    {templateBody.split("\n").map((line, i) => (
                                        <div key={i}>{line || "\u00A0"}</div>
                                    ))}
                                </div>
                                {templateFooter && (
                                    <div className="text-[0.7rem] text-[#667781] dark:text-gray-400 mt-2 leading-[1.3]">
                                        {templateFooter.split("\n").map((line, i) => (
                                            <div key={i}>{line || "\u00A0"}</div>
                                        ))}
                                    </div>
                                )}
                                <div className="bg-[#00A884] hover:bg-[#06cf9c] text-white py-2.5 px-6 rounded-2xl text-center font-medium mt-3 cursor-pointer text-sm transition-colors">{templateCTA}</div>
                            </div>
                        </div>
                    }
                />

                {/* Section 4: QR Code */}
                <div>
                    <ShareQR
                        url={shareUrl}
                        title={flowName}
                        isPublished={true}
                        id={flowDbId}
                        queryKey={"flowShareSettings"}
                        resourceName={"flow"}
                    />
                </div>
            </div>
        </div>
    );
}
