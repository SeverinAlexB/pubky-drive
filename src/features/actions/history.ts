// Undo and redo (⌘Z, ⌘Y). See docs/spec/04-menus-and-shortcuts.md.

/** A finished action that can be reversed. */
export interface Undoable {
  /** Reverses the action. Resolves to the action that reverses it again, for redo. */
  undo(): Promise<Undoable>
}

const MAX_ACTIONS = 50

/**
 * The session's recent actions, newest last. Undoing moves an action to the redo list; any new
 * action clears that list. One undo or redo runs at a time.
 */
export class ActionHistory {
  private done: Undoable[] = []
  private undone: Undoable[] = []
  private busy = false

  record(action: Undoable) {
    this.done = [...this.done, action].slice(-MAX_ACTIONS)
    this.undone = []
  }

  /**
   * Undoes `action`, such as from its snackbar's Undo button, or else the latest action. Resolves
   * to false when there is nothing to undo, the action was undone already, or another undo or
   * redo is running. An action whose undo fails is dropped.
   */
  async undo(action?: Undoable) {
    const target = action ?? this.done.at(-1)
    if (!target || this.busy || !this.done.includes(target)) return false
    this.done = this.done.filter((each) => each !== target)
    this.undone = [...this.undone, await this.reverse(target)]
    return true
  }

  /** Redoes the latest undone action. Resolves to false when there is none, or one is running. */
  async redo() {
    const target = this.undone.at(-1)
    if (!target || this.busy) return false
    this.undone = this.undone.slice(0, -1)
    this.done = [...this.done, await this.reverse(target)]
    return true
  }

  private async reverse(action: Undoable) {
    this.busy = true
    try {
      return await action.undo()
    } finally {
      this.busy = false
    }
  }
}
