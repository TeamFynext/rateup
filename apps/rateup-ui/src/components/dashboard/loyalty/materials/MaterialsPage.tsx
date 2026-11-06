import { IconFileDescription, IconQrcode, IconRocket } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { pickJoinKeyword, pickWhatsappNumber } from "../joinLink.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { BrochureEditor } from "./BrochureEditor.tsx";
import { buildMaterialsDefaults, parseMaterials } from "./materials.ts";
import { isMaterialsTab, type MaterialsTab } from "./materialsTabs.ts";
import { QrCardEditor } from "./QrCardEditor.tsx";

/**
 * Print-ready pieces for the venue: the join QR card and a rewards brochure. Both read the
 * programme's logo, colour and photo from the Profile; what is edited here is the copy and
 * which rewards go on the card, saved as one document on the programme.
 */
export function MaterialsPage({ tab }: Readonly<{ tab?: MaterialsTab }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: state, isLoading } = useLoyaltyOnboardingState();
  const { data: waSettings } = useWaSettings();
  const active: MaterialsTab = tab ?? "brochure";

  if (isLoading || !state) return <Loader />;

  const program = state.program;
  if (!program) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title={t("Materials")} />
        <Card className="border-border">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-muted-foreground">
              {t(
                "Set up your loyalty programme first — the QR card and brochure are built from it.",
              )}
            </p>
            <Button render={<Link to={LOYALTY_PATHS.onboarding} />}>
              <IconRocket size={16} />
              {t("Start setup")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const whatsappNumber = pickWhatsappNumber(waSettings, program.whatsappSettingsId);
  const joinKeyword = pickJoinKeyword(state.saved.commands);
  const materials = buildMaterialsDefaults(
    { program, rules: state.saved.rules, rewards: state.saved.rewards, joinKeyword },
    parseMaterials(program.materials),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={t("Materials")}
        description={t(
          "Print-ready pieces for the counter and the table: your join QR card and a rewards brochure. Logo, colour and photo come from Program › Profile.",
        )}
      />

      <Tabs
        value={active}
        onValueChange={(value) => {
          if (isMaterialsTab(value)) {
            navigate({ to: LOYALTY_PATHS.materials, search: { tab: value } });
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="brochure" className="gap-1.5">
            <IconFileDescription size={15} />
            {t("Brochure")}
          </TabsTrigger>
          <TabsTrigger value="qr" className="gap-1.5">
            <IconQrcode size={15} />
            {t("QR card")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="qr" className="pt-4">
          <QrCardEditor
            program={program}
            design={materials.qr}
            compose={(qr) => ({ ...materials, qr })}
            whatsappNumber={whatsappNumber}
            joinKeyword={joinKeyword}
          />
        </TabsContent>
        <TabsContent value="brochure" className="pt-4">
          <BrochureEditor
            program={program}
            rewards={state.saved.rewards}
            rules={state.saved.rules}
            tiers={program.tiersEnabled ? state.saved.tiers : []}
            joinKeyword={joinKeyword}
            whatsappNumber={whatsappNumber}
            design={materials.brochure}
            compose={(brochure) => ({ ...materials, brochure })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
