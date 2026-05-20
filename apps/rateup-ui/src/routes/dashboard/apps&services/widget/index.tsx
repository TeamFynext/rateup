import { createFileRoute } from "@tanstack/react-router";

import SupportWidget from "@/components/app&services/support-widget.tsx";
import TerminalBlock from "@/components/TerminalBlock.tsx";

export const Route = createFileRoute("/dashboard/apps&services/widget/")({
  component: Home,
});

function Home() {
  const codeExample = `
import SupportWidget from "@rateup/support-widget";

<SupportWidget
  orgId="YOUR_ORG_ID"
  token="YOUR_API_TOKEN"
  whatsappNumber="+1234567890" // optional
  companyName="Your Company" // optional
  backendUrl="https://your-backend.com" // optional
  webhookUrl="https://your-webhook.com" // optional
/>`;
  const npmCommand = "npm install @rateup/support-widget";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-primary/10 to-background py-12 mb-0 flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-72 h-72 bg-primary/20 rounded-full blur-2xl opacity-20 absolute left-1/2 top-0 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-4 flex flex-col items-center relative z-10">
          <h1 className="text-3xl font-extrabold mb-3 text-center text-primary drop-shadow-lg">
            SupportWidget Integration
          </h1>
          <p className="text-base text-muted-foreground mb-6 max-w-2xl text-center">
            Add a modern, customizable support widget to your app or website in
            minutes.
            <br className="hidden md:block" />
            Follow the steps below to get started and delight your users with
            instant support.
          </p>
          <div className="flex justify-center gap-3 mt-1">
            <span className="inline-block bg-primary text-white px-4 py-1.5 rounded-full font-semibold shadow-lg text-sm">
              Easy Integration
            </span>
            <span className="inline-block bg-background border px-4 py-1.5 rounded-full font-semibold text-primary shadow text-sm">
              Customizable
            </span>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <ol className="space-y-8">
            <li className="flex gap-4 items-start">
              <span className="text-2xl font-bold text-primary">1</span>
              <div>
                <div className="font-semibold mb-2">Install the package</div>
                <div className="relative mt-2">
                  <TerminalBlock code={npmCommand} />
                </div>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-2xl font-bold text-primary">2</span>
              <div>
                <div className="font-semibold mb-2">
                  Get your <span className="text-primary">orgId</span>
                </div>
                <div className="text-muted-foreground">
                  Copy it from the Apps & Services dashboard.
                </div>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-2xl font-bold text-primary">3</span>
              <div>
                <div className="font-semibold mb-2">Create an API token</div>
                <div className="text-muted-foreground">
                  Generate it in the API section of Apps & Services.
                </div>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-2xl font-bold text-primary">4</span>
              <div>
                <div className="font-semibold mb-2">
                  Import and use the widget
                </div>
                <div className="relative mt-4">
                  <TerminalBlock code={codeExample} />
                </div>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Props Table */}
      <section className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto bg-muted p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Widget Props</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2">Prop</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Required</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono font-bold">orgId</td>
                <td>string</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td className="font-mono font-bold">token</td>
                <td>string</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td className="font-mono font-bold">whatsappNumber</td>
                <td>string</td>
                <td>No</td>
              </tr>
              <tr>
                <td className="font-mono font-bold">companyName</td>
                <td>string</td>
                <td>No</td>
              </tr>
              <tr>
                <td className="font-mono font-bold">backendUrl</td>
                <td>string</td>
                <td>No</td>
              </tr>
              <tr>
                <td className="font-mono font-bold">webhookUrl</td>
                <td>string</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-lg font-semibold mb-4">Live Widget Demo</h3>
          <div className="flex justify-center">
            <SupportWidget
              orgId={import.meta.env.VITE_ROOT_ORG}
              token={import.meta.env.VITE_ROOT_TOKEN}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
