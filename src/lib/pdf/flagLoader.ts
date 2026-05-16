import type { Team } from '../../types/tournament';

const cache = new Map<string, string>();

async function svgToPngDataUrl(svgText: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D no disponible'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Carga y convierte las banderas SVG a PNG data URLs para usar en @react-pdf/renderer.
 * Cachea por fifa_code en memoria así llamadas sucesivas son instantáneas.
 *
 * Devuelve un Map<fifa_code_lowercase, dataUrl PNG>. Si alguna falla, se omite.
 */
export async function loadFlagPngMap(teams: Team[]): Promise<Map<string, string>> {
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const teamsToLoad = teams.filter((t) => !cache.has(t.fifaCode.toLowerCase()));
  await Promise.all(teamsToLoad.map(async (team) => {
    const fifa = team.fifaCode.toLowerCase();
    try {
      const url = `${baseUrl}assets/flags/circle/${fifa}.svg`;
      const res = await fetch(url);
      if (!res.ok) return;
      const svgText = await res.text();
      const dataUrl = await svgToPngDataUrl(svgText, 64);
      cache.set(fifa, dataUrl);
    } catch {
      // si una bandera falla, seguimos sin ella (caerá al fallback en el template).
    }
  }));
  // Devuelve una copia para evitar mutaciones externas.
  return new Map(cache);
}
