import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 5.6 18.5 12 8 18.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 6v12M15.5 6v12" strokeWidth="2" />
    </svg>
  );
}

export function ReplayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.8 10.2A7.4 7.4 0 1 1 5 13.7" />
      <path d="M4.8 5.6v4.6h4.6" />
    </svg>
  );
}

export function StepBackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17.5 6.5 9.6 12l7.9 5.5Z" fill="currentColor" stroke="none" />
      <path d="M6.2 6.2v11.6" />
    </svg>
  );
}

export function StepForwardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 6.5 14.4 12l-7.9 5.5Z" fill="currentColor" stroke="none" />
      <path d="M17.8 6.2v11.6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 6.5 11 11m0-11-11 11" />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15m-5.4-5.4L19 12l-5.4 5.4" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m15.3 8.7-2 4.6-4.6 2 2-4.6Z" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CameraResetIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 9.3 12 3l7.5 6.3" />
      <path d="M6.4 8.4v10.1h11.2V8.4" />
      <path d="M10 18.5v-5h4v5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.5h16M4 12h11M4 16.5h16" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.7v5.2" />
      <circle cx="12" cy="7.9" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SoundWaveIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 10v4M8.5 7v10M12.5 4.5v15M16.5 7.5v9M20 10.5v3" />
    </svg>
  );
}
