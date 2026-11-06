/** What the signup wizard collects across its three steps. */
export interface OnboardingFormData {
  services: string[];
  industry: string;
  selectedTemplate: string;
  integrationsSelected: string[];
}
