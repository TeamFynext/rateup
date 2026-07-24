import { useCallback, useMemo, useRef, useState } from "react";
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from "react-native";

import { useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { TeamMembersData } from "@/context/type";

export type MentionUser = { id: string; name: string };

const MAX_SUGGESTIONS = 8;

/**
 * `@` either opens the note or follows whitespace, and the query runs to the
 * caret without spaces. Same shape as tiptap's suggestion utility on the web
 * app, rebuilt by hand here — RN has no rich-text editor to hang a plugin on,
 * so the note stays a plain string and the picked ids are tracked alongside it.
 */
const TRIGGER = /(?:^|\s)@([^\s@]*)$/;

type Selection = { start: number; end: number };

export function useMention({
  enabled,
  text,
  setText,
}: {
  /** Only the private note composes mentions; the message tab types normally. */
  enabled: boolean;
  text: string;
  setText: (value: string) => void;
}) {
  // Shared cache with AssignToUser and the rest of the app, so opening the
  // picker costs no extra request.
  const { data: orgMembers } = useTeamsMembersOfOrg();

  const users = useMemo<MentionUser[]>(
    () =>
      ((orgMembers?.data ?? []) as TeamMembersData[])
        .filter((m) => m?.id && m?.name)
        .map((m) => ({ id: m.id, name: m.name })),
    [orgMembers],
  );

  const [caret, setCaret] = useState(0);
  // Set only to move the caret after inserting a mention; released as soon as
  // the native input reports back that it landed there.
  const [forcedSelection, setForcedSelection] = useState<Selection | undefined>();

  // The mentions the user actually picked from the list. A ref, not state: it is
  // read once on send and rewriting it must never re-render mid-typing.
  const pickedRef = useRef<MentionUser[]>([]);

  const query = useMemo(() => {
    // While the caret is being repositioned the text and caret disagree, and
    // evaluating the trigger against that pair flashes the list back open.
    if (!enabled || forcedSelection) return null;
    const match = text.slice(0, Math.min(caret, text.length)).match(TRIGGER);
    return match ? match[1] : null;
  }, [enabled, forcedSelection, text, caret]);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, users]);

  const handleChangeText = useCallback(
    (next: string) => {
      // Advance the caret by the size of the edit so the trigger is tested
      // against the keystroke that just landed — onSelectionChange fires after
      // onChangeText and corrects this for pastes and mid-text edits.
      setCaret((c) => Math.max(0, Math.min(next.length, c + (next.length - text.length))));
      setText(next);
    },
    [text, setText],
  );

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { start } = e.nativeEvent.selection;
      // Release the forced caret only once the input reports it, so a selection
      // event queued before the insert doesn't drop us back to the old position.
      setForcedSelection((forced) => (forced && forced.start !== start ? forced : undefined));
      setCaret(start);
    },
    [],
  );

  const pick = useCallback(
    (user: MentionUser) => {
      const cursor = Math.min(caret, text.length);
      const before = text.slice(0, cursor);
      const match = before.match(TRIGGER);
      if (!match) return;

      const at = before.length - match[1].length - 1; // index of the "@"
      const inserted = `@${user.name} `;
      const next = text.slice(0, at) + inserted + text.slice(cursor);
      const position = at + inserted.length;

      if (!pickedRef.current.some((u) => u.id === user.id)) {
        pickedRef.current.push(user);
      }
      setText(next);
      setCaret(position);
      setForcedSelection({ start: position, end: position });
    },
    [caret, text, setText],
  );

  /**
   * Ids for the mentions still present in the note. The server prefers these
   * over matching `@name` out of the text, which can't handle names with spaces
   * — but a user who typed `@Ann` and then deleted it shouldn't be notified, so
   * every pick is re-checked against the body being sent.
   */
  const getMentionedUserIds = useCallback((body: string) => {
    const ids = new Set<string>();
    for (const user of pickedRef.current) {
      if (body.includes(`@${user.name}`)) ids.add(user.id);
    }
    return Array.from(ids);
  }, []);

  /** Mentions belong to the note being composed — drop them once it is sent. */
  const reset = useCallback(() => {
    pickedRef.current = [];
    setCaret(0);
    setForcedSelection(undefined);
  }, []);

  return {
    /** True once `@` opens a query, even when nothing matches it. */
    isOpen: query !== null,
    suggestions,
    forcedSelection,
    handleChangeText,
    handleSelectionChange,
    pick,
    getMentionedUserIds,
    reset,
  };
}
