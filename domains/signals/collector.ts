/** @deprecated Use lib/signals/ingest/run-ingest.ts for RSS collection. */
export interface SignalCollector {
  readonly id: string;
  readonly sourceType: string;
  collect(tenantId: string): Promise<
    Array<{
      title: string;
      url?: string;
      rawText: string;
      occurredAt?: string;
      metadata?: Record<string, unknown>;
    }>
  >;
}
