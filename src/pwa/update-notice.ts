/** Session-only presentation state. Dismissal never activates a worker. */
export class UpdateNotice {
  private waiting: object | null = null;
  private dismissed: object | null = null;
  get visible(): boolean {
    return this.waiting !== null && this.waiting !== this.dismissed;
  }
  offer(worker: object | null): void {
    if (worker !== this.waiting) this.dismissed = null;
    this.waiting = worker;
  }
  dismiss(): void { this.dismissed = this.waiting; }
  show(): void { this.dismissed = null; }
}
