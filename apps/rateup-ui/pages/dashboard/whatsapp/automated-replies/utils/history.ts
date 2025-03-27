import type { Edge, Node } from "@xyflow/react";

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
}

export class HistoryManager {
  private past: FlowState[] = [];
  private future: FlowState[] = [];
  private current: FlowState | null = null;
  private maxHistorySize: number;

  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  // Save the current state to history
  public saveState(state: FlowState): void {
    // If there's a current state, add it to past
    if (this.current) {
      this.past.push({ ...this.current });

      // Limit the history size
      if (this.past.length > this.maxHistorySize) {
        this.past.shift();
      }
    }

    // Set the new current state
    this.current = { ...state };

    // Clear the future when a new action is performed
    this.future = [];
  }

  // Undo the last action
  public undo(): FlowState | null {
    if (this.past.length === 0 || !this.current) {
      return null;
    }

    // Move current state to future
    this.future.unshift({ ...this.current });

    // Get the last state from past
    const previousState = this.past.pop();

    // Set it as current
    this.current = previousState || null;

    return this.current;
  }

  // Redo the last undone action
  public redo(): FlowState | null {
    if (this.future.length === 0 || !this.current) {
      return null;
    }

    // Move current state to past
    this.past.push({ ...this.current });

    // Get the next state from future
    const nextState = this.future.shift();

    // Set it as current
    this.current = nextState || null;

    return this.current;
  }

  // Check if undo is available
  public canUndo(): boolean {
    return this.past.length > 0;
  }

  // Check if redo is available
  public canRedo(): boolean {
    return this.future.length > 0;
  }

  // Get the current state
  public getCurrentState(): FlowState | null {
    return this.current;
  }

  // Clear all history
  public clear(): void {
    this.past = [];
    this.future = [];
    this.current = null;
  }
}
