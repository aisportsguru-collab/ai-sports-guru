export type TriStatus = 'active' | 'trialing' | 'none';

export function toTriStatus(stripeStatus?: string | null): TriStatus {
  if (!stripeStatus) return 'none';
  const s = stripeStatus.toLowerCase();
  if (s === 'trialing') return 'trialing';
  if (s === 'active' || s === 'past_due' || s === 'unpaid') return 'active';
  return 'none';
}
