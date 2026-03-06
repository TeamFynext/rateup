/**
 * Acts as a sandbox for containing components that should not propagate events to the parent.
 * @param param0
 * @returns
 */
export function StopPropagation({ children }) {
  function handleClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.stopPropagation();
    event.preventDefault();
  }
  return <div onClick={handleClick}>{children}</div>;
}
