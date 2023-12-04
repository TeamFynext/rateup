export function findPreviousMonday(date: Date): Date {
  const day = date.getDay();
  const difference = day === 0 ? 6 : day - 1; // if Sunday, go back 6 days to last Monday, else go back to last Monday
  const previousMonday = new Date(date);
  previousMonday.setDate(date.getDate() - difference);
  return previousMonday;
}
