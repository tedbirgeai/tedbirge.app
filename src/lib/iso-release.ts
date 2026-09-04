/**
 * BARE-METAL İMAJ YAYIN ADRESİ — TEK DOĞRULUK KAYNAĞI
 * ------------------------------------------------------------------
 * Önyüklenebilir imaj GitHub Actions hattında üretilir ve GitHub
 * Releases alanına yüklenir. Son kullanıcı hiçbir şey derlemez:
 * "ISO İndir" düğmesi doğrudan hazır ikili dosyayı indirir.
 *
 * `VITE_ISO_DOWNLOAD_URL` tanımlıysa (CDN/ayna) o adres önceliklidir.
 */

const RAW = (import.meta.env["VITE_ISO_DOWNLOAD_URL"] as string | undefined) ?? "";

/** Elle yapılandırılmış doğrudan imaj adresi (varsa). */
export const ISO_DOWNLOAD_URL = RAW.trim();

/** İmajın yayınlandığı GitHub deposu. */
export const ISO_GITHUB_REPO =
  ((import.meta.env["VITE_ISO_GITHUB_REPO"] as string | undefined) ?? "tedbirgeai/aetheris").trim();

/** Sürüm sayfası (kullanıcıya gösterilen bağlantı). */
export const ISO_RELEASES_PAGE = `https://github.com/${ISO_GITHUB_REPO}/releases/latest`;

/** İndirme rotası: sunucu en güncel imaja yönlendirir. */
export const ISO_DOWNLOAD_ROUTE = "/api/public/iso";

/** İmaj durumunu soran hafif uç nokta. */
export const ISO_STATUS_ROUTE = "/api/public/iso?durum=1";

export type IsoStatus = {
  ready: boolean;
  url: string;
  name: string;
  size: number;
  version: string;
  page: string;
};

/** Yapılandırılmış doğrudan adres var mı? */
export function hasRemoteIso(): boolean {
  return ISO_DOWNLOAD_URL.length > 0;
}

/** Yayındaki imajın durumunu sorar; hata olursa "hazır değil" döner. */
export async function fetchIsoStatus(): Promise<IsoStatus> {
  const bos: IsoStatus = {
    ready: false,
    url: "",
    name: "",
    size: 0,
    version: "",
    page: ISO_RELEASES_PAGE,
  };
  try {
    const res = await fetch(ISO_STATUS_ROUTE, { headers: { Accept: "application/json" } });
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
