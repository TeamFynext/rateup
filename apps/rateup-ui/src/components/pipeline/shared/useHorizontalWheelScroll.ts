import { useEffect, type RefObject } from "react";

/**
 * Whether this element is a vertical scroller with room left to move in
 * `direction` — negative for up, positive for down.
 *
 * `scrollHeight > clientHeight` alone is not enough: plenty of elements overflow
 * without scrolling. The computed `overflow-y` is what decides whether the
 * browser would actually move it.
 */
function canScrollVertically(element: HTMLElement, direction: number) {
  const room = element.scrollHeight - element.clientHeight;
  if (room <= 1) return false;

  const overflowY = getComputedStyle(element).overflowY;
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") return false;

  // Sub-pixel scroll positions mean the ends never land on exact integers.
  return direction < 0 ? element.scrollTop > 1 : element.scrollTop < room - 1;
}

/**
 * Lets a mouse wheel scroll a horizontal-only container sideways.
 *
 * Browsers do this themselves for a container that only scrolls on X — but on the
 * board the container never receives the wheel. The columns are full height, so
 * the pointer is nearly always over a column's card list, and the event is spent
 * there.
 *
 * Removing that list's `overscroll-contain` to let the wheel chain outward was
 * tried and does not work: the chaining walk will not turn a vertical wheel into
 * horizontal scroll on an ancestor, so the delta passes the board by. Hence this
 * hook, and hence the containment stays — it is still what stops the page behind
 * moving when a column reaches its end.
 *
 * It hands the gesture to whatever should own it rather than always taking it:
 *
 * - A sideways trackpad swipe already scrolls this container natively, so a
 *   gesture that is mostly horizontal is left alone rather than double-counted.
 * - A column under the pointer that can still scroll vertically keeps the wheel.
 *   Reading down a long column is what the wheel is for while you are over one;
 *   only once it has nothing left to give does the board move sideways instead.
 */
export function useHorizontalWheelScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      for (
        let node = event.target instanceof HTMLElement ? event.target : null;
        node && node !== element;
        node = node.parentElement
      ) {
        if (canScrollVertically(node, event.deltaY)) return;
      }

      if (element.scrollWidth <= element.clientWidth) return;

      element.scrollLeft += event.deltaY;
      // Otherwise the page behind the board scrolls as well as the board.
      event.preventDefault();
    };

    // Not passive: taking the gesture over is the whole point, and a passive
    // listener is not allowed to call `preventDefault`.
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref]);
}
