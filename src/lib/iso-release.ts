/**
 * BARE-METAL İMAJ YAYIN ADRESİ — TEK DOĞRULUK KAYNAĞI
 * ------------------------------------------------------------------
 * Önyüklenebilir imaj GitHub Actions hattında üretilir ve GitHub
 * Releases alanına yüklenir. Son kullanıcı hiçbir şey derlemez:
 * "ISO İndir" düğmesi doğrudan hazır ikili dosyayı indirir.
 *
 * İndirme kararı yalnız sunucunun doğruladığı yayın manifestine göre verilir.
 */

/** İmajın yayınlandığı GitHub deposu. */
export const ISO_GITHUB_REPO = (
  (import.meta.env["VITE_ISO_GITHUB_REPO"] as string | undefined) ?? "tedbirgeai/tedbirge.app"
).trim();

/** Sürüm sayfası (kullanıcıya gösterilen bağlantı). */
export const ISO_RELEASES_PAGE = `https://github.com/${ISO_GITHUB_REPO}/releases/latest`;

/** İki ürün sürümü: masaüstü/dizüstü ve tablet/2'si 1 arada. */
export type IsoEdition = "workstation" | "touch";

export const ISO_EDITIONS: ReadonlyArray<{
  id: IsoEdition;
  title: string;
  subtitle: string;
}> = [
  {
    id: "workstation",
    title: "Masaüstü & Dizüstü",
    subtitle: "Workstation — klavye/fare odaklı; klasik PC ve laptop için",
  },
  {
    id: "touch",
    title: "Tablet & 2'si 1 Arada",
    subtitle: "Touch & Mobile — dokunmatik ekran, kalem ve ekran döndürme destekli",
  },
];

/** İndirme rotası: sunucu en güncel imaja yönlendirir. */
export const ISO_DOWNLOAD_ROUTE = "/api/public/iso";

/** Sürüme özel indirme/durum adresleri. */
export function isoDownloadRoute(edition: IsoEdition): string {
  return `${ISO_DOWNLOAD_ROUTE}?surum=${edition}`;
}

export function isoStatusRoute(edition: IsoEdition): string {
  return `${ISO_DOWNLOAD_ROUTE}?durum=1&surum=${edition}`;
}

export type IsoStatus = {
  ready: boolean;
  url: string;
  name: string;
  size: number;
  version: string;
  page: string;
  sha256: string;
  distribution: string;
  commit: string;
  edition: string;
};

/** Yayındaki imajın durumunu sorar; hata olursa "hazır değil" döner. */
export async function fetchIsoStatus(edition: IsoEdition = "workstation"): Promise<IsoStatus> {
  const bos: IsoStatus = {
    ready: false,
    url: "",
    name: "",
    size: 0,
    version: "",
    page: ISO_RELEASES_PAGE,
    sha256: "",
    distribution: "",
    commit: "",
    edition,
  };
  try {
    const res = await fetch(isoStatusRoute(edition), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return bos;
    const data = (await res.json()) as Partial<IsoStatus>;
    return { ...bos, ...data, ready: Boolean(data.ready) };
  } catch {
    return bos;
  }
}

/** İnsan okunur boyut. */
export function formatIsoSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}
