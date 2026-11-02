/**
 * OWNER: three
 * 第二章网络场景（R3F 内部实现）。节点 = 事件，小方块 = 机构枢纽。
 * hover 只改变 DOM 浮签与精密括号标记，不做发光 / 缩放动画。
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createBracketGeometry, createSegmentGeometry } from '../lib/geometry';
import { damp } from '../lib/math';
import { createScreenPoint, projectToScreen } from '../lib/project';
import type { NetworkLayout } from './network-layout';

export interface NetworkHover {
  kind: 'event' | 'org';
  index: number;
}

export interface NetworkSceneProps {
  layout: NetworkLayout;
  hovered: NetworkHover | null;
  selectedId: string | null;
  rotationRef: { current: { x: number; y: number } };
  draggingRef: { current: boolean };
  reducedMotion: boolean;
  revision: number;
  hoverLabelRef: { current: HTMLDivElement | null };
  onHover: (hover: NetworkHover | null) => void;
  onClickNode: (kind: 'event' | 'org', index: number) => void;
}

const NODE_SIZE = 0.027;
const HUB_SIZE = 0.018;

function buildPointGeometry(nodes: NetworkLayout['eventNodes']): THREE.BufferGeometry {
  const positions = new Float32Array(nodes.length * 3);
  nodes.forEach((node, index) => {
    positions[index * 3] = node.position[0];
    positions[index * 3 + 1] = node.position[1];
    positions[index * 3 + 2] = node.position[2];
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export default function NetworkScene({
  layout,
  hovered,
  selectedId,
  rotationRef,
  draggingRef,
  reducedMotion,
  revision,
  hoverLabelRef,
  onHover,
  onClickNode,
}: NetworkSceneProps) {
  const invalidate = useThree((state) => state.invalidate);
  const raycaster = useThree((state) => state.raycaster);
  const groupRef = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const screen = useMemo(() => createScreenPoint(), []);

  const resources = useMemo(() => {
    const eventGeometry = buildPointGeometry(layout.eventNodes);
    const orgGeometry = buildPointGeometry(layout.orgNodes);
    const chronologyGeometry = createSegmentGeometry(layout.chronology);
    const orgLinksGeometry = createSegmentGeometry(layout.orgLinks);
    const bracketGeometry = createBracketGeometry(0.1, 0.032);
    const selectedGeometry = createBracketGeometry(0.15, 0.048);
    const eventMaterial = new THREE.PointsMaterial({
      color: 0x161616,
      size: NODE_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const orgMaterial = new THREE.PointsMaterial({
      color: 0x8f8f8a,
      size: HUB_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const chronologyMaterial = new THREE.LineBasicMaterial({
      color: 0xc9c9c4,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const orgLinkMaterial = new THREE.LineBasicMaterial({
      color: 0xd9d8d3,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    const bracketMaterial = new THREE.LineBasicMaterial({
      color: 0x161616,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const selectedMaterial = new THREE.LineBasicMaterial({
      color: 0x161616,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    return {
      eventGeometry,
      orgGeometry,
      chronologyGeometry,
      orgLinksGeometry,
      bracketGeometry,
      selectedGeometry,
      eventMaterial,
      orgMaterial,
      chronologyMaterial,
      orgLinkMaterial,
      bracketMaterial,
      selectedMaterial,
      dispose(): void {
        eventGeometry.dispose();
        orgGeometry.dispose();
        chronologyGeometry.dispose();
        orgLinksGeometry.dispose();
        bracketGeometry.dispose();
        selectedGeometry.dispose();
        eventMaterial.dispose();
        orgMaterial.dispose();
        chronologyMaterial.dispose();
        orgLinkMaterial.dispose();
        bracketMaterial.dispose();
        selectedMaterial.dispose();
      },
    };
  }, [layout]);

  useEffect(() => () => resources.dispose(), [resources]);

  // Points 的拾取阈值（世界单位）；默认 1 会几乎整屏命中。
  useEffect(() => {
    raycaster.params.Points.threshold = 0.052;
  }, [raycaster]);

  useEffect(() => {
    invalidate();
  }, [invalidate, hovered, selectedId, revision, layout]);

  const hoveredNode = hovered
    ? hovered.kind === 'event'
      ? layout.eventNodes[hovered.index]
      : layout.orgNodes[hovered.index]
    : null;
  const selectedNode = selectedId
    ? layout.eventNodes.find((node) => node.id === selectedId)
    : undefined;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = rotationRef.current;
    const group = groupRef.current;

    if (!draggingRef.current && !hovered && !reducedMotion) {
      target.y += dt * 0.035;
    }

    if (group) {
      if (reducedMotion) {
        group.rotation.set(target.x, target.y, 0);
      } else {
        group.rotation.x = damp(group.rotation.x, target.x, 3.2, dt);
        group.rotation.y = damp(group.rotation.y, target.y, 3.2, dt);
      }
    }

    const label = hoverLabelRef.current;
    if (label) {
      if (!hoveredNode || !group) {
        label.style.visibility = 'hidden';
      } else {
        world.set(hoveredNode.position[0], hoveredNode.position[1], hoveredNode.position[2]);
        group.localToWorld(world);
        projectToScreen(world, state.camera, state.size.width, state.size.height, screen);
        label.style.visibility = screen.visible ? 'visible' : 'hidden';
        label.style.transform = `translate3d(${Math.round(screen.x)}px, ${Math.round(screen.y)}px, 0)`;
      }
    }
  });

  return (
    <group ref={groupRef} rotation={[rotationRef.current.x, rotationRef.current.y, 0]}>
      <lineSegments geometry={resources.chronologyGeometry} material={resources.chronologyMaterial} />
      <lineSegments geometry={resources.orgLinksGeometry} material={resources.orgLinkMaterial} />

      <points
        geometry={resources.eventGeometry}
        material={resources.eventMaterial}
        onPointerMove={(event) => {
          if (draggingRef.current) return;
          event.stopPropagation();
          onHover({ kind: 'event', index: event.index ?? 0 });
        }}
        onPointerOut={() => {
          if (!draggingRef.current) onHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onClickNode('event', event.index ?? 0);
        }}
      />

      <points
        geometry={resources.orgGeometry}
        material={resources.orgMaterial}
        onPointerMove={(event) => {
          if (draggingRef.current) return;
          event.stopPropagation();
          onHover({ kind: 'org', index: event.index ?? 0 });
        }}
        onPointerOut={() => {
          if (!draggingRef.current) onHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onClickNode('org', event.index ?? 0);
        }}
      />

      {hoveredNode && (
        <lineSegments
          geometry={resources.bracketGeometry}
          material={resources.bracketMaterial}
          position={hoveredNode.position}
        />
      )}
      {selectedNode && (
        <lineSegments
          geometry={resources.selectedGeometry}
          material={resources.selectedMaterial}
          position={selectedNode.position}
        />
      )}
    </group>
  );
}
