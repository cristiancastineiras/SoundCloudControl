import type { ModoApariencia } from '@/entities/preferencias';

const ANCHO_POPUP_NORMAL = 312;
const ANCHO_POPUP_COMPACTO = 480;

let rafSincronizacionPopup: number | null = null;

export function obtenerAnchoPopup(compactoActivo: boolean) {
  return compactoActivo ? ANCHO_POPUP_COMPACTO : ANCHO_POPUP_NORMAL;
}

export function aplicarModoAparienciaDocumento(modoApariencia: ModoApariencia) {
  document.body.dataset.uiMode = modoApariencia;
  document.documentElement.style.colorScheme = modoApariencia;
}

export function aplicarLayoutCompactoPopup(compactoActivo: boolean) {
  document.body.classList.toggle('sc-compact', compactoActivo);
}

export function programarSincronizacionTamanoPopup(
  elemento: HTMLElement | null,
  anchoObjetivo: number,
) {
  if (!elemento || document.body.dataset.page === 'options') {
    return;
  }

  if (rafSincronizacionPopup !== null) {
    window.cancelAnimationFrame(rafSincronizacionPopup);
  }

  rafSincronizacionPopup = window.requestAnimationFrame(() => {
    aplicarAnchoPopup(anchoObjetivo);

    rafSincronizacionPopup = window.requestAnimationFrame(() => {
      const altoObjetivo = Math.max(1, Math.ceil(elemento.scrollHeight));
      const altoPx = `${altoObjetivo}px`;

      document.documentElement.style.height = altoPx;
      document.documentElement.style.minHeight = altoPx;
      document.body.style.height = altoPx;
      document.body.style.minHeight = altoPx;

      const root = document.getElementById('root');

      if (root) {
        root.style.height = altoPx;
        root.style.minHeight = altoPx;
      }
    });
  });
}

function aplicarAnchoPopup(anchoObjetivo: number) {
  const anchoPx = `${anchoObjetivo}px`;

  document.documentElement.style.width = anchoPx;
  document.documentElement.style.minWidth = anchoPx;
  document.body.style.width = anchoPx;
  document.body.style.minWidth = anchoPx;

  const root = document.getElementById('root');

  if (root) {
    root.style.width = anchoPx;
    root.style.minWidth = anchoPx;
  }
}