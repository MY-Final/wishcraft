import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  type Blending,
  type Side,
} from 'three';
import { PALETTE } from './palette';

export function graphiteMaterial(options: { color?: string; roughness?: number; metalness?: number } = {}) {
  return new MeshStandardMaterial({
    color: new Color(options.color ?? PALETTE.graphite),
    roughness: options.roughness ?? 0.3,
    metalness: options.metalness ?? 0.68,
  });
}

export function steelMaterial(options: { color?: string; roughness?: number } = {}) {
  return new MeshStandardMaterial({
    color: new Color(options.color ?? '#8a8b86'),
    roughness: options.roughness ?? 0.22,
    metalness: 0.9,
  });
}

export function paleMaterial(options: { color?: string; opacity?: number; side?: Side } = {}) {
  return new MeshStandardMaterial({
    color: new Color(options.color ?? PALETTE.white),
    roughness: 0.5,
    metalness: 0.05,
    transparent: true,
    opacity: options.opacity ?? 0.9,
    side: options.side ?? DoubleSide,
  });
}

export interface GlassOptions {
  color?: string;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  thickness?: number;
  clearcoat?: number;
}

/**
 * A light, jewel-like glass for the white laboratory. We deliberately avoid
 * transmission because several dozen transmissive slabs would each trigger a
 * scene re-render. Clearcoat + a low opacity reads as glass at this scale.
 */
export function glassMaterial(options: GlassOptions = {}) {
  return new MeshPhysicalMaterial({
    color: new Color(options.color ?? '#e8efed'),
    roughness: options.roughness ?? 0.08,
    metalness: options.metalness ?? 0.16,
    transparent: true,
    opacity: options.opacity ?? 0.22,
    thickness: options.thickness ?? 0.6,
    clearcoat: options.clearcoat ?? 1,
    clearcoatRoughness: 0.08,
    side: DoubleSide,
    depthWrite: false,
  });
}

export function smokedGlassMaterial(options: GlassOptions = {}) {
  return new MeshPhysicalMaterial({
    color: new Color(options.color ?? '#222523'),
    roughness: options.roughness ?? 0.12,
    metalness: options.metalness ?? 0.35,
    transparent: true,
    opacity: options.opacity ?? 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: DoubleSide,
    depthWrite: false,
  });
}

export function accentMaterial(colorHex: string = PALETTE.orange, intensity = 2) {
  const material = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true,
    opacity: 0.98,
    toneMapped: false,
  });
  material.userData.intensity = intensity;
  return material;
}

export function emissiveMaterial(colorHex: string = PALETTE.orange, intensity = 2.2) {
  return new MeshStandardMaterial({
    color: new Color(colorHex),
    emissive: new Color(colorHex),
    emissiveIntensity: intensity,
    roughness: 0.34,
    metalness: 0.1,
    toneMapped: false,
  });
}

export function wireMaterial(colorHex: string = PALETTE.graphite, opacity = 0.28) {
  return new MeshBasicMaterial({
    color: new Color(colorHex),
    wireframe: true,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

export interface GlowOptions {
  color?: string;
  opacity?: number;
  additive?: boolean;
  side?: Side;
  blending?: Blending;
}

export function glowMaterial(options: GlowOptions = {}) {
  return new MeshBasicMaterial({
    color: new Color(options.color ?? PALETTE.orange),
    transparent: true,
    opacity: options.opacity ?? 0.5,
    depthWrite: false,
    blending: options.additive === false ? NormalBlending : AdditiveBlending,
    side: options.side ?? DoubleSide,
    toneMapped: false,
  });
}
