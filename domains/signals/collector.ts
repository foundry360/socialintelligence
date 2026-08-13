/** Future signal collector contract (not implemented in MVP). */
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
