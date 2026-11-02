/**
 * OWNER: three
 * 第五章模型星图场景。
 * 黑白灰；机构用「轨道半径 + 线型（实/虚/点）」区分，不用颜色。
 * 节点 = 真实模型，点击回调模型 id；标签全部是二维 DOM。
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  computeSegmentLineDistances,
  createBracketGeometry,
  createCircleGeometry,
  createSegmentGeometry,
} from '../lib/geometry';
import { damp } from '../lib/math';
import { createScreenPoint, projectToScreen } from '../lib/project';
import type { ConstellationLayout } from './constellation-layout';

export interface ConstellationHover {
  orbitIndex: number;
  nodeIndex: number;
}

interface ConstellationSceneProps {
  layout: ConstellationLayout;
  activeOrg: string | null;
  hovered: ConstellationHover | null;
  selectedId: string | null;
  rotationRef: { current: { x: number; y: number } };
  draggingRef: { current: boolean };
  zoom: number;
  reducedMotion: boolean;
  revision: number;
  labelRefs: { current: Array<HTMLDivElement | null> };
  onHover: (hover: ConstellationHover | null) => void;
  onClickNode: (modelId: string) => void;
}

const ORBIT_SHADES = [0x9a9a96, 0xb2b2ae, 0xc4c4c0];
const LABEL_BACK_CUTOFF = -0.18;

interface OrbitResource {
  ringGeometry: THREE.BufferGeometry;
  pointGeometry: THREE.BufferGeometry;
  ringMaterial: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
  pointMaterial: THREE.PointsMaterial;
  opacity: number;
}

export default function ConstellationScene({
  layout,
  activeOrg,
  hovered,
  selectedId,
  rotationRef,
  draggingRef,
  zoom,
  reducedMotion,
  revision,
  labelRefs,
  onHover,
  onClickNode,
}: ConstellationSceneProps) {
  const invalidate = useThree((state) => state.invalidate);
  const raycaster = useThree((state) => state.raycaster);
  const rootRef = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const screen = useMemo(() => createScreenPoint(), []);

  const resources = useMemo(() => {
    const orbits: OrbitResource[] = layout.orbits.map((orbit) => {
      const ringGeometry = createCircleGeometry(orbit.radius, 180, 0);
      const color = ORBIT_SHADES[orbit.tier];
      let ringMaterial: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
      if (orbit.tier === 0) {
        ringMaterial = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
      } else {
        ringMaterial = new THREE.LineDashedMaterial({
          color,
          transparent: true,
          opacity: 0.6,
          dashSize: orbit.tier === 1 ? 0.07 : 0.014,
          gapSize: orbit.tier === 1 ? 0.05 : 0.035,
          depthWrite: false,
        });
      }
      computeSegmentLineDistances(ringGeometry);

      const positions = new Float32Array(orbit.nodes.length * 3);
      orbit.nodes.forEach((node, index) => {
        positions[index * 3] = node.position[0];
        positions[index * 3 + 1] = node.position[1];
        positions[index * 3 + 2] = node.position[2];
      });
      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pointMaterial = new THREE.PointsMaterial({
        color: 0x161616,
        size: 0.03,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });

      return { ringGeometry, pointGeometry, ringMaterial, pointMaterial, opacity: 1 };
    });

    const boundaryGeometry = createCircleGeometry(layout.maxRadius + 0.06, 200, 0);
    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: 0xdededa,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const ticksGeometry = createSegmentGeometry(layout.ticks);
    const ticksMaterial = new THREE.LineBasicMaterial({
      color: 0xc6c6c1,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const bracketGeometry = createBracketGeometry(0.085, 0.028);
    const selectedGeometry = createBracketGeometry(0.14, 0.046);
    const bracketMaterial = new THREE.LineBasicMaterial({
      color: 0x161616,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const selectedMaterial = new THREE.LineBasicMaterial({
      color: 0x161616,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    return {
      orbits,
      boundaryGeometry,
      boundaryMaterial,
      ticksGeometry,
      ticksMaterial,
      bracketGeometry,
      selectedGeometry,
      bracketMaterial,
      selectedMaterial,
      dispose(): void {
        for (const orbit of orbits) {
          orbit.ringGeometry.dispose();
          orbit.pointGeometry.dispose();
          orbit.ringMaterial.dispose();
          orbit.pointMaterial.dispose();
        }
        boundaryGeometry.dispose();
        boundaryMaterial.dispose();
        ticksGeometry.dispose();
        ticksMaterial.dispose();
        bracketGeometry.dispose();
        selectedGeometry.dispose();
        bracketMaterial.dispose();
        selectedMaterial.dispose();
      },
    };
  }, [layout]);

  useEffect(() => () => resources.dispose(), [resources]);

  useEffect(() => {
    raycaster.params.Points.threshold = 0.045;
  }, [raycaster]);

  useEffect(() => {
    invalidate();
  }, [invalidate, hovered, selectedId, activeOrg, zoom, revision, layout]);

  const hoveredNode =
    hovered !== null
      ? layout.orbits[hovered.orbitIndex]?.nodes[hovered.nodeIndex]
      : undefined;
  const selectedNode = selectedId
    ? layout.nodes.find((node) => node.modelId === selectedId)
    : undefined;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const group = rootRef.current;
    const targetRot = rotationRef.current;

    if (!draggingRef.current && !hovered && !reducedMotion) {
      targetRot.y += dt * 0.018;
    }

    if (group) {
      if (reducedMotion) {
        group.rotation.set(targetRot.x, targetRot.y, 0);
        group.scale.setScalar(zoom);
      } else {
        group.rotation.x = damp(group.rotation.x, targetRot.x, 3, dt);
        group.rotation.y = damp(group.rotation.y, targetRot.y, 3, dt);
        const scale = damp(group.scale.x, zoom, 3, dt);
        group.scale.setScalar(scale);
      }
      group.updateMatrixWorld(true);
    }

    // 机构筛选：非选中轨道降到极低透明度
    for (let index = 0; index < resources.orbits.length; index += 1) {
      const orbit = resources.orbits[index];
      const meta = layout.orbits[index];
      const active = activeOrg === null || meta.organizationId === activeOrg;
      const target = active ? 1 : 0.06;
      orbit.opacity = reducedMotion ? target : damp(orbit.opacity, target, 5, dt);
      orbit.ringMaterial.opacity = 0.6 * orbit.opacity;
      orbit.pointMaterial.opacity = 0.95 * orbit.opacity;
    }

    // 二维标签投影
    if (!group) return;
    for (let index = 0; index < layout.nodes.length; index += 1) {
      const node = layout.nodes[index];
      const element = labelRefs.current?.[index];
      if (!element) continue;
      const orbitMeta = layout.orbits[node.orbitIndex];
      const orbitActive = activeOrg === null || orbitMeta.organizationId === activeOrg;
      world.set(node.position[0], node.position[1], node.position[2]);
      group.localToWorld(world);
      projectToScreen(world, state.camera, state.size.width, state.size.height, screen);
      const isFocus =
        selectedId === node.modelId ||
        (hovered !== null &&
          hovered.orbitIndex === node.orbitIndex &&
          layout.orbits[hovered.orbitIndex]?.nodes[hovered.nodeIndex]?.modelId === node.modelId);
      const showLabel = isFocus || node.anchor || (activeOrg !== null && orbitActive);
      const behind = world.z < LABEL_BACK_CUTOFF;
      if (!orbitActive || !showLabel || !screen.visible || (behind && !isFocus)) {
        element.style.visibility = 'hidden';
        continue;
      }
      element.style.visibility = 'visible';
      const stagger = node.orbitIndex * 3;
      element.style.transform = `translate3d(${Math.round(screen.x)}px, ${Math.round(
        screen.y + stagger,
      )}px, 0)`;
      element.style.opacity = String(behind ? 0.35 : isFocus ? 0.95 : 0.62);
    }
  });

  return (
    <group ref={rootRef} rotation={[rotationRef.current.x, rotationRef.current.y, 0]}>
      <lineSegments geometry={resources.boundaryGeometry} material={resources.boundaryMaterial} />
      <lineSegments geometry={resources.ticksGeometry} material={resources.ticksMaterial} />

      {layout.orbits.map((orbit, orbitIndex) => {
        const resource = resources.orbits[orbitIndex];
        return (
          <group key={orbit.organizationId}>
            <lineSegments geometry={resource.ringGeometry} material={resource.ringMaterial} />
            <points
              geometry={resource.pointGeometry}
              material={resource.pointMaterial}
              onPointerMove={(event) => {
                if (draggingRef.current) return;
                event.stopPropagation();
                onHover({ orbitIndex, nodeIndex: event.index ?? 0 });
              }}
              onPointerOut={() => {
                if (!draggingRef.current) onHover(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                const node = orbit.nodes[event.index ?? 0];
                if (node) onClickNode(node.modelId);
              }}
            />
          </group>
        );
      })}

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
