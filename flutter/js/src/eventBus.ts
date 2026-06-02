type EventHandler = (data: any) => void;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(event: string, data?: any): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const h of list) {
      try {
        h(data);
      } catch (e) {
        console.error(`[eventBus] handler error for "${event}":`, e);
      }
    }
  }
}

export const bus = new EventBus();
