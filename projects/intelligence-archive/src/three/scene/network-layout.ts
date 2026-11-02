/**
 * OWNER: three
 * 第二章网络布局：真实章节事件 = 节点，事件提及的机构 = 内圈枢纽。
 * 全部由数据确定性生成，无随机抖动；同一份数据每次渲染完全一致。
 */
import { getOrgName, type HistoryEvent } from '../../data';
import type { VerificationStatus } from '../../data/types';
import { clamp } from '../lib/math';

export interface NetworkNode {
  kind: 'event' | 'org';
  id: string;
  title: string;
  meta: string;
  verification?: VerificationStatus;
  position: [number, number, number];
}

export interface NetworkLayout {
  eventNodes: NetworkNode[];
  orgNodes: NetworkNode[];
  chronology: Float32Array;
  orgLinks: Float32Array;
}

function pushSegment(
  out: number[],
  from: [number, number, number],
  to: [number, number, number],
): void {
  out.push(from[0], from[1], from[2], to[0], to[1], to[2]);
}

export function buildNetworkLayout(events: HistoryEvent[], maxNodes = 80): NetworkLayout {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, maxNodes);
  const count = sorted.length;

  const eventNodes: NetworkNode[] = [];
  const angles: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const event = sorted[index];
    const t = count === 1 ? 0.5 : index / (count - 1);
    // 经度 = 时间（一圈），纬度 = 平滑起伏 → 一条在三维空间里起伏的年表带
    const angle = -Math.PI / 2 + t * Math.PI * 2;
    const lift = Math.sin(t * Math.PI * 2.15 + 0.5) * 0.72;
    const radius = 1.02;
    const ring = Math.cos(lift) * radius;
    angles.push(angle);
    eventNodes.push({
      kind: 'event',
      id: event.id,
      title: event.title,
      meta: event.displayDate,
      verification: event.verificationStatus,
      position: [Math.cos(angle) * ring, Math.sin(lift) * radius, Math.sin(angle) * ring],
    });
  }

  interface Hub {
    name: string;
    firstIndex: number;
    heightSum: number;
    xSum: number;
    zSum: number;
    mentions: number;
  }

  const hubs = new Map<string, Hub>();
  sorted.forEach((event, index) => {
    const node = eventNodes[index];
    for (const organizationId of event.organizations) {
      const hub = hubs.get(organizationId);
      if (hub) {
        hub.heightSum += node.position[1];
        hub.xSum += node.position[0];
        hub.zSum += node.position[2];
        hub.mentions += 1;
      } else {
        hubs.set(organizationId, {
          name: getOrgName(organizationId),
          firstIndex: index,
          heightSum: node.position[1],
          xSum: node.position[0],
          zSum: node.position[2],
          mentions: 1,
        });
      }
    }
  });

  const orgNodes: NetworkNode[] = [];
  const orgIndexById = new Map<string, number>();
  let hubIndex = 0;
  for (const [organizationId, hub] of hubs) {
    const length = Math.hypot(hub.xSum, hub.zSum);
    const baseAngle =
      length > 0.2
        ? Math.atan2(hub.zSum, hub.xSum)
        : angles[hub.firstIndex] ?? 0;
    const angle = baseAngle + (hubIndex % 2 === 0 ? 0.18 : -0.18);
    const radius = 0.44 + (hubIndex % 3) * 0.05;
    const y = clamp((hub.heightSum / Math.max(hub.mentions, 1)) * 0.6, -0.3, 0.3);
    orgIndexById.set(organizationId, orgNodes.length);
    orgNodes.push({
      kind: 'org',
      id: organizationId,
      title: hub.name,
      meta: hub.mentions > 1 ? `${hub.mentions} MENTIONS` : 'ORGANIZATION',
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    });
    hubIndex += 1;
  }

  const chronology: number[] = [];
  for (let index = 0; index < eventNodes.length - 1; index += 1) {
    pushSegment(chronology, eventNodes[index].position, eventNodes[index + 1].position);
  }

  const orgLinks: number[] = [];
  sorted.forEach((event, index) => {
    for (const organizationId of event.organizations) {
      const hub = orgIndexById.get(organizationId);
      if (hub === undefined) continue;
      pushSegment(orgLinks, eventNodes[index].position, orgNodes[hub].position);
    }
  });

  return {
    eventNodes,
    orgNodes,
    chronology: new Float32Array(chronology),
    orgLinks: new Float32Array(orgLinks),
  };
}
