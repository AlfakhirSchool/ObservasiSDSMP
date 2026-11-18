/**
 * Pewawancara khusus Al-Qur'an: Ustd. Faisal, Ustd. Dedi, Mrs. Fida, Mr. Malik, Mrs. Inggrid, Mr. Rhoyan,
 * Mrs. Nazly, Ustd. Irfan. Dikenali dari username akun (nama tampilan bisa berubah/berbeda ejaan).
 * Mereka hanya boleh membuka /interviewer/quran dan menyimpan lewat /api/quran; aturannya dipaksa di src/proxy.ts.
 */
const QURAN_OBSERVER_USERNAMES: Record<string, true> = {
  faisal: true,
  dedi: true,
  fida: true,
  malik: true,
  inggrid: true,
  rhoyan: true,
  nazly: true,
  irfan: true,
}

export const QURAN_HOME = "/interviewer/quran"

export function isQuranObserver(username: string | null | undefined): boolean {
  return !!username && QURAN_OBSERVER_USERNAMES[username.trim().toLowerCase()] === true
}
