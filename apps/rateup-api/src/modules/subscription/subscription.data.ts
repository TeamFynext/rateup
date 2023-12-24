
function getSampleSubscriptionFeatures(count: number) {
    return ({
        "menu": { "count": { "max": count } },
        "team": { "count": { "max": count }, "teamMember": { "count": { "max": count } } },
        "webSurvey": { "count": { "max": count } },
        "whatsappSurvey": { "count": { "max": count } },
        "whatsappCampaign": { "count": { "max": count } },
        "reputationManagement": { "count": { "max": count } }
    })
}
export const SampleSubscriptionFeatures = getSampleSubscriptionFeatures(10);

export const UnlimitedAccess = getSampleSubscriptionFeatures(10000);