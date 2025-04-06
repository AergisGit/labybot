import { performance } from 'node:perf_hooks';
import { Logger } from '../api';

export class PerfLogger {
  private enabled: boolean;
  private timers: Map<string, number>;
  private log: Logger;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
    this.timers = new Map();
    
    this.log = new Logger('PERF', 'info', true, 'blue');
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled;
  }

  start(label: string): string | null {
    if (!this.enabled) return null;
    const id = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.timers.set(id, performance.now());
    return id;
  }

  end(label: string, id: string | null): void {
    if (!this.enabled || !id) return;
    const start = this.timers.get(id);
    if (start === undefined) {
        this.log.warn(`Aucun début trouvé pour "${label}" avec id "${id}"`);
        return;
    }
    const duration = (performance.now() - start).toFixed(2);
    this.log.info(`${label}: ${duration}ms`);
    this.timers.delete(id);
  }

  /*log(label: string, message: string): void {
    if (!this.enabled) return;
    this.log.info(`${label}: ${message}`);
  }*/
}

export const perf = new PerfLogger(true);
