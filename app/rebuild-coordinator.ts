export interface RebuildTicket<T> {
  id: number;
  payload: T;
  signal: AbortSignal;
}

interface InternalTicket<T> {
  id: number;
  payload: T;
  controller: AbortController;
}

function publicTicket<T>(ticket: InternalTicket<T>): RebuildTicket<T> {
  return { id: ticket.id, payload: ticket.payload, signal: ticket.controller.signal };
}

export class RebuildCoordinator<T> {
  private nextId = 0;
  private pending: InternalTicket<T> | null = null;
  private active: InternalTicket<T> | null = null;
  private disposed = false;

  get hasPending() {
    return this.pending !== null;
  }

  get isBusy() {
    return this.active !== null || this.pending !== null;
  }

  request(payload: T): RebuildTicket<T> {
    if (this.disposed) throw new Error('Cannot request a rebuild after coordinator disposal.');

    this.pending?.controller.abort();
    this.active?.controller.abort();

    const ticket: InternalTicket<T> = {
      id: ++this.nextId,
      payload,
      controller: new AbortController(),
    };
    this.pending = ticket;
    return publicTicket(ticket);
  }

  takeLatest(): RebuildTicket<T> | null {
    if (this.disposed || !this.pending) return null;

    this.active?.controller.abort();
    this.active = this.pending;
    this.pending = null;
    return publicTicket(this.active);
  }

  complete(id: number) {
    if (!this.active || this.active.id !== id) return false;

    const accepted = !this.active.controller.signal.aborted;
    this.active = null;
    return accepted;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.pending?.controller.abort();
    this.active?.controller.abort();
    this.pending = null;
    this.active = null;
  }
}
