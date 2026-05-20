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
    // Don't save empty states
    if (state.nodes.length === 0 && state.edges.length === 0) {
      return;
    }

    // Don't save if state is identical to current
    if (this.current && this.isEqual(this.current, state)) {
      return;
    }

    // If there's a current state, add it to past
    if (this.current) {
      // Create a deep copy to avoid reference issues
      this.past.push(this.deepCopy(this.current));

      // Limit the history size
      if (this.past.length > this.maxHistorySize) {
        this.past.shift();
      }
    }

    // Set the new current state (deep copy)
    this.current = this.deepCopy(state);

    // Clear the future when a new action is performed
    this.future = [];
  }

  // Undo the last action
  public undo(): FlowState | null {
    if (this.past.length === 0) {
      return null;
    }

    if (!this.current) {
      return null;
    }

    // Move current state to future (deep copy)
    this.future.unshift(this.deepCopy(this.current));

    // Get the last state from past
    const previousState = this.past.pop();

    // Set it as current
    this.current = previousState || null;

    return this.current ? this.deepCopy(this.current) : null;
  }

  // Redo the last undone action
  public redo(): FlowState | null {
    if (this.future.length === 0) {
      return null;
    }

    if (!this.current) {
      return null;
    }

    // Move current state to past (deep copy)
    this.past.push(this.deepCopy(this.current));

    // Get the next state from future
    const nextState = this.future.shift();

    // Set it as current
    this.current = nextState || null;

    return this.current ? this.deepCopy(this.current) : null;
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
    return this.current ? this.deepCopy(this.current) : null;
  }

  // Clear all history
  public clear(): void {
    this.past = [];
    this.future = [];
    this.current = null;
  }

  // Utility function to create a deep copy of a state
  private deepCopy(state: FlowState): FlowState {
    return {
      nodes: state.nodes.map((node) => JSON.parse(JSON.stringify(node))),
      edges: state.edges.map((edge) => JSON.parse(JSON.stringify(edge))),
    };
  }

  // Check if two states are equal
  private isEqual(state1: FlowState, state2: FlowState): boolean {
    // Simple check for length equality
    if (
      state1.nodes.length !== state2.nodes.length ||
      state1.edges.length !== state2.edges.length
    ) {
      return false;
    }

    // This is a simplified equality check - in a real app you might need more sophisticated comparison
    try {
      return JSON.stringify(state1) === JSON.stringify(state2);
    } catch (e) {
      // If JSON stringification fails, consider them different
      return false;
    }
  }
}
