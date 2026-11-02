import { getOrganization, getOrgName, models } from '../data';
import type { FacetOption } from '../data/types';
import { verificationLabel } from '../lib/format';

/** 机构 ID + 英文名 + 中文名，供检索使用（"深度求索" 也能命中 DeepSeek 条目）。 */
export function orgText(id: string): string {
  const organization = getOrganization(id);
  if (!organization) return id;
  return [id, organization.name, organization.nameZh, organization.countryOrRegion]
    .filter(Boolean)
    .join(' ');
}

export function orgName(id: string): string {
  return getOrgName(id);
}

export function verificationFacets(): FacetOption[] {
  const order = ['verified', 'partially-verified', 'unverified'] as const;
  const counts = new Map<string, number>();
  for (const model of models) {
    counts.set(model.verificationStatus, (counts.get(model.verificationStatus) ?? 0) + 1);
  }
  return order
    .filter((status) => (counts.get(status) ?? 0) > 0)
    .map((status) => ({
      value: status,
      label: verificationLabel[status],
      count: counts.get(status) ?? 0,
    }));
}
