import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TextInput, TextInputSelectionChangeEvent } from "react-native";

import { useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { TeamMembersData } from "@/context/type";

export type MentionUser = { id: string; name: string };

const MAX_SUGGESTIONS = 8;

const TRIGGER = /(?:^|\s)@([^\s@]*)$/;

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
  const { data: orgMembers } = useTeamsMembersOfOrg();

  const users = useMemo<MentionUser[]>(
    () =>
      ((orgMembers?.data ?? []) as TeamMembersData[])
        .filter((m) => m?.id && m?.name)
        .map((m) => ({ id: m.id, name: m.name })),
    [orgMembers],
  );

  const [caret, setCaret] = useState(0);
  const [justPicked, setJustPicked] = useState(false);

  const inputRef = useRef<TextInput>(null);
  // Caret position to apply once the inserted text has been committed.
  const pendingCaretRef = useRef<number | null>(null);

  const pickedRef = useRef<MentionUser[]>([]);

  useLayoutEffect(() => {
    const position = pendingCaretRef.current;
    if (position === null) return;
    pendingCaretRef.current = null;
    inputRef.current?.setSelection(position, position);
  }, [text]);

  const query = useMemo(() => {
    if (!enabled || justPicked) return null;
    const match = TRIGGER.exec(text.slice(0, Math.min(caret, text.length)));
    return match ? match[1] : null;
  }, [enabled, justPicked, text, caret]);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => !q || u.name.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [query, users]);

  const handleChangeText = useCallback(
    (next: string) => {
      // Advance the caret by the size of the edit so the trigger is tested
      // against the keystroke that just landed — onSelectionChange fires after
      // onChangeText and corrects this for pastes and mid-text edits.
      setCaret((c) => Math.max(0, Math.min(next.length, c + (next.length - text.length))));
      setJustPicked(false);
      setText(next);
    },
    [text, setText],
  );

  const handleSelectionChange = useCallback((e: TextInputSelectionChangeEvent) => {
    setCaret(e.nativeEvent.selection.start);
  }, []);

  const pick = useCallback(
    (user: MentionUser) => {
      const cursor = Math.min(caret, text.length);
      const before = text.slice(0, cursor);
      const match = TRIGGER.exec(before);
      if (!match) return;

      const at = before.length - match[1].length - 1; // index of the "@"
      const inserted = `@${user.name} `;
      const next = text.slice(0, at) + inserted + text.slice(cursor);
      const position = at + inserted.length;

      if (!pickedRef.current.some((u) => u.id === user.id)) {
        pickedRef.current.push(user);
      }
      pendingCaretRef.current = position;
      setText(next);
      setCaret(position);
      setJustPicked(true);
    },
    [caret, text, setText],
  );

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
    pendingCaretRef.current = null;
    setCaret(0);
    setJustPicked(false);
  }, []);

  return {
    /** True once `@` opens a query, even when nothing matches it. */
    isOpen: query !== null,
    suggestions,
    /** Attach to the composer's TextInput so the caret can be moved on insert. */
    inputRef,
    handleChangeText,
    handleSelectionChange,
    pick,
    getMentionedUserIds,
    reset,
  };
}
