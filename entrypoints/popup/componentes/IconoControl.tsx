import {
  ArrowClockwise,
  ArrowSquareOut,
  HeartStraight,
  Pause,
  Play,
  Repeat,
  RepeatOnce,
  Shuffle,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSimpleSlash,
  type IconProps,
} from '@phosphor-icons/react';
import { unirClases } from '../utilidades';

const ICONOS_CONTROL = {
  anterior: SkipBack,
  play: Play,
  pausa: Pause,
  siguiente: SkipForward,
  corazon: HeartStraight,
  aleatorio: Shuffle,
  repetirLista: Repeat,
  repetirPista: RepeatOnce,
  volumenAlto: SpeakerHigh,
  volumenMute: SpeakerSimpleSlash,
  abrir: ArrowSquareOut,
  recargar: ArrowClockwise,
} as const;

export type NombreIcono = keyof typeof ICONOS_CONTROL;

export function IconoControl(props: {
  nombre: NombreIcono;
  className?: string;
  weight?: IconProps['weight'];
}) {
  const { className, nombre, weight = 'fill' } = props;
  const ComponenteIcono = ICONOS_CONTROL[nombre];

  return (
    <ComponenteIcono
      aria-hidden="true"
      weight={weight}
      className={unirClases('h-4.75 w-4.75 shrink-0', className)}
    />
  );
}