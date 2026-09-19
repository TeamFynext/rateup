const VIEWS = [
  { label: "Open", count: 12 },
  { label: "New", live: true },
  { label: "Closed" },
  { label: "All" },
  { label: "Mine", count: 4 },
  { label: "@Mentions", count: 1 },
  { label: "Favourites" },
  { label: "Spam" },
];

const TEAMS = [
  { label: "Support", count: 9 },
  { label: "Sales", count: 6 },
  { label: "Orders", count: 4 },
];

const heading =
  "px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase";

export default function NavPane({ newCount }: Readonly<{ newCount: number }>) {
  return (
    <div className="hidden flex-col border-r border-ru-n-200 bg-white p-2 lg:flex">
      <div className="px-2.5 pt-1.5 pb-2 font-display text-[15px] font-bold text-ru-n-700">
        Inbox
      </div>
      {VIEWS.map((view) => {
        const count = view.live ? newCount : view.count;
        return (
          <div
            key={view.label}
            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12.5px] ${
              view.live ? "bg-ru-blue-50 font-semibold text-ru-blue-600" : "text-ru-n-600"
            }`}
          >
            {view.label}
            {count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums ${
                  view.live ? "bg-ru-blue-600 text-white" : "text-ru-n-400"
                }`}
              >
                {count}
              </span>
            )}
          </div>
        );
      })}

      <div className={heading}>Teams</div>
      {TEAMS.map((team) => (
        <div
          key={team.label}
          className="flex items-center justify-between px-2.5 py-1.25 text-[12.5px] text-ru-n-600"
        >
          {team.label}
          <span className="text-[10.5px] text-ru-n-400 tabular-nums">{team.count}</span>
        </div>
      ))}
    </div>
  );
}
