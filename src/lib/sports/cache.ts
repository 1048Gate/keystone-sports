export class SportsCache {
  readonly entries = new Map<string, { at: number; value: unknown }>();
  readonly inflight = new Map<string, Promise<unknown>>();
  constructor(private clock = Date.now, private capacity = 256) {}
  async get<T>(key: string, ttl: number, fetcher: () => Promise<T>, staleLimit = ttl * 4): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && this.clock() - hit.at < ttl) return hit.value as T;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;
    const job = fetcher().then(value => {
      this.entries.delete(key);
      this.entries.set(key, { at: this.clock(), value });
      while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
      return value;
    }).catch(error => {
      if (hit && this.clock() - hit.at <= staleLimit) return hit.value as T;
      this.entries.delete(key);
      throw error;
    }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }
  peek<T>(key: string, maxAge = 90_000): T | undefined {
    const hit = this.entries.get(key);
    return hit && this.clock() - hit.at <= maxAge ? hit.value as T : undefined;
  }
}
