import { APP_VS_API } from "./content";

/**
 * App vs API, as a real `<table>`.
 *
 * The third column is the one being sold, so it carries the accent fill the design gives it. The
 * wrapper scrolls rather than letting the page scroll sideways on a narrow screen.
 */
export default function Comparison() {
  return (
    <section className="border-t border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto max-w-280 px-5 py-[clamp(3rem,7vw,5.5rem)]">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
          Which one do you need
        </span>
        <h2 className="mt-3 mb-3.5 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
          WhatsApp Business App vs WhatsApp Business API
        </h2>
        <p className="mb-8.5 max-w-[66ch] text-[16.5px]/[1.6] text-ru-n-500">
          The free app is built for one person answering chats on one phone. The API is built for a
          team, a catalog and a customer list that keeps growing.
        </p>

        <div className="overflow-x-auto rounded-xl bg-white shadow-xs ring-1 ring-ru-n-200 ring-inset">
          <table className="w-full min-w-160 border-collapse text-left text-[14.5px]">
            <caption className="sr-only">
              WhatsApp Business App compared with the WhatsApp Business API on RateUp
            </caption>
            <thead>
              <tr className="bg-ru-n-50">
                <th
                  scope="col"
                  className="border-b border-ru-n-200 px-5 py-3.5 text-[11.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase"
                >
                  What you get
                </th>
                <th
                  scope="col"
                  className="w-[26%] border-b border-ru-n-200 px-5 py-3.5 text-[13.5px] font-medium text-ru-n-500"
                >
                  Business App
                </th>
                <th
                  scope="col"
                  className="w-[32%] border-b border-ru-blue-200 bg-ru-blue-50 px-5 py-3.5 font-display text-[13.5px] font-bold tracking-[-0.01em] text-ru-blue-600"
                >
                  Business API with RateUp
                </th>
              </tr>
            </thead>
            <tbody>
              {APP_VS_API.map(([feature, app, api], index) => {
                const last = index === APP_VS_API.length - 1;
                return (
                  <tr key={feature}>
                    <th
                      scope="row"
                      className={`px-5 py-3.75 text-[14.5px] font-medium text-ru-n-700 ${last ? "" : "border-b border-ru-n-100"}`}
                    >
                      {feature}
                    </th>
                    <td
                      className={`px-5 py-3.75 text-ru-n-500 ${last ? "" : "border-b border-ru-n-100"}`}
                    >
                      {app}
                    </td>
                    <td
                      className={`bg-ru-blue-50 px-5 py-3.75 font-medium text-ru-n-700 ${last ? "" : "border-b border-ru-blue-200"}`}
                    >
                      {api}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
