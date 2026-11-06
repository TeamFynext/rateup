import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";

/** The checklist under a feature grid, for capabilities that don't need a card of their own. */
export default function AlsoList({ items }: Readonly<{ items: readonly string[] }>) {
  return (
    <ul className="mt-8 grid list-none gap-x-6 gap-y-2.5 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-5.5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[15px] text-ru-n-600">
          <CheckIcon className="mt-1 size-3.5 flex-none text-ru-green-600" />
          {item}
        </li>
      ))}
    </ul>
  );
}
