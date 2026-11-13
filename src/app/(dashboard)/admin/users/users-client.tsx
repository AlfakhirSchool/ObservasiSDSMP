"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Copy, KeyRound, Pencil, Plus, Trash2, UserCog, Wand2 } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { INTERVIEWERS } from "@/lib/constants"
import { cn, formatDate } from "@/lib/utils"
import { createUser, deleteUser, resetUserPassword, updateUserName } from "@/lib/user-actions"

type Role = "ADMIN" | "ADMIN_SD" | "ADMIN_SMP" | "INTERVIEWER"

interface UserRow {
  id: string
  username: string
  name: string
  role: Role
  createdAt: string
}

const ROLE_META: Record<Role, { label: string; pill: string }> = {
  ADMIN: { label: "Admin Pusat", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ADMIN_SD: { label: "Admin SD", pill: "bg-orange-50 text-orange-700 ring-orange-200" },
  ADMIN_SMP: { label: "Admin SMP", pill: "bg-teal-50 text-teal-700 ring-teal-200" },
  INTERVIEWER: { label: "Pewawancara", pill: "bg-blue-50 text-blue-700 ring-blue-200" },
}

const ROLE_ORDER: Role[] = ["ADMIN", "ADMIN_SD", "ADMIN_SMP", "INTERVIEWER"]

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
const BTN_PRIMARY = cn(BTN_BASE, "bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700")
const BTN_SECONDARY = cn(BTN_BASE, "border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50")
const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

const PASSWORD_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generatePassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("")
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Disalin")
  } catch {
    toast.error("Gagal menyalin, salin manual")
  }
}

interface Props {
  users: UserRow[]
  currentUserId: string
}

export default function UsersClient({ users, currentUserId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", username: "", role: "INTERVIEWER" as Role, password: "" })
  const [error, setError] = useState("")
  /** Kredensial yang baru dibuat/diganti; ditampilkan sekali karena password tidak bisa dilihat lagi. */
  const [credential, setCredential] = useState<{ title: string; username: string; password: string } | null>(null)

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [resetPassword, setResetPasswordValue] = useState("")
  const [resetError, setResetError] = useState("")

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleteError, setDeleteError] = useState("")

  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editError, setEditError] = useState("")

  const openAdd = () => {
    setForm({ name: "", username: "", role: "INTERVIEWER", password: generatePassword() })
    setError("")
    setShowAdd(true)
  }

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await createUser(form)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setShowAdd(false)
      setCredential({ title: "Pengguna dibuat", username: form.username.trim().toLowerCase(), password: form.password })
      router.refresh()
    })
  }

  const openReset = (user: UserRow) => {
    setResetTarget(user)
    setResetPasswordValue(generatePassword())
    setResetError("")
  }

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setResetError("")
    startTransition(async () => {
      const res = await resetUserPassword(resetTarget.id, resetPassword)
      if (!res.ok) {
        setResetError(res.error)
        return
      }
      setCredential({ title: "Password diganti", username: resetTarget.username, password: resetPassword })
      setResetTarget(null)
    })
  }

  const openEdit = (user: UserRow) => {
    setEditTarget(user)
    setEditName(user.name)
    setEditError("")
  }

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setEditError("")
    startTransition(async () => {
      const res = await updateUserName(editTarget.id, editName)
      if (!res.ok) {
        setEditError(res.error)
        return
      }
      toast.success("Nama diperbarui")
      setEditTarget(null)
      router.refresh()
    })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setDeleteError("")
    startTransition(async () => {
      const res = await deleteUser(deleteTarget.id)
      if (!res.ok) {
        setDeleteError(res.error)
        return
      }
      toast.success(`${deleteTarget.name} dihapus`)
      setDeleteTarget(null)
      router.refresh()
    })
  }

  const isInterviewer = form.role === "INTERVIEWER"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna"
        description="Kelola akun yang dapat masuk ke dashboard. Pewawancara masuk dengan username dan password."
        actions={
          <button type="button" onClick={openAdd} className={BTN_PRIMARY}>
            <Plus size={16} aria-hidden="true" /> Tambah Pengguna
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {users.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="Belum ada pengguna"
            description="Tambahkan pengguna pertama agar dapat masuk ke dashboard."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Username</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Peran</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Dibuat</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.name}
                      {u.id === currentUserId && <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", ROLE_META[u.role].pill)}>
                        {ROLE_META[u.role].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className={ICON_BTN}
                          aria-label={`Ubah nama ${u.name}`}
                          title="Ubah nama"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openReset(u)}
                          className={ICON_BTN}
                          aria-label={`Ganti password ${u.name}`}
                          title="Ganti password"
                        >
                          <KeyRound size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("")
                            setDeleteTarget(u)
                          }}
                          disabled={u.id === currentUserId}
                          className={cn(ICON_BTN, "text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40")}
                          aria-label={`Hapus ${u.name}`}
                          title={u.id === currentUserId ? "Akun yang sedang dipakai tidak dapat dihapus" : "Hapus"}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tambah pengguna */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <form onSubmit={submitAdd}>
          <DialogHeader className="border-b border-slate-100 px-6 py-4">
            <DialogTitle>Tambah Pengguna</DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-4 pt-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-role" className="text-sm font-medium text-slate-700">Peran</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Input
                id="user-name"
                label="Nama lengkap"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                list={isInterviewer ? "interviewer-names" : undefined}
                placeholder="Contoh: Mrs. Siti Rokoyah, S.Pd"
                required
                autoComplete="off"
              />
              {isInterviewer && (
                <>
                  <datalist id="interviewer-names">
                    {INTERVIEWERS.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                  <p className="text-xs text-slate-500">
                    Untuk pewawancara, nama harus sama persis dengan nama di kolom Pewawancara pada data siswa agar siswanya tampil.
                  </p>
                </>
              )}
            </div>

            <Input
              id="user-username"
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              placeholder="huruf kecil, angka, titik, - atau _"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-password" className="text-sm font-medium text-slate-700">Password</label>
              <div className="flex gap-2">
                <input
                  id="user-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                  required
                  minLength={8}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                  className={cn(ICON_BTN, "h-10 w-10 shrink-0")}
                  aria-label="Buat password acak"
                  title="Buat password acak"
                >
                  <Wand2 size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-slate-500">Minimal 8 karakter. Password hanya ditampilkan sekali setelah pengguna dibuat.</p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </DialogContent>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowAdd(false)} className={BTN_SECONDARY}>Batal</button>
            <button type="submit" disabled={pending} className={BTN_PRIMARY}>
              {pending ? "Menyimpan..." : "Simpan"}
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Ubah nama */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <form onSubmit={submitEdit}>
          <DialogHeader className="border-b border-slate-100 px-6 py-4">
            <DialogTitle>Ubah Nama</DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-4 pt-5">
            <Input
              id="edit-name"
              label="Nama lengkap"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              autoComplete="off"
            />
            {editTarget?.role === "INTERVIEWER" && (
              <p className="text-xs text-slate-500">
                Untuk pewawancara, nama harus sama persis dengan nama di kolom Pewawancara pada data siswa agar siswanya tampil.
              </p>
            )}
            {editError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {editError}
              </p>
            )}
          </DialogContent>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setEditTarget(null)} className={BTN_SECONDARY}>Batal</button>
            <button type="submit" disabled={pending} className={BTN_PRIMARY}>
              {pending ? "Menyimpan..." : "Simpan"}
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Ganti password */}
      <Dialog open={resetTarget !== null} onOpenChange={(open) => !open && setResetTarget(null)}>
        <form onSubmit={submitReset}>
          <DialogHeader className="border-b border-slate-100 px-6 py-4">
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>
          <DialogDescription className="px-6 pt-4">
            {resetTarget?.name} ({resetTarget?.username})
          </DialogDescription>
          <DialogContent className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-password" className="text-sm font-medium text-slate-700">Password baru</label>
              <div className="flex gap-2">
                <input
                  id="reset-password"
                  value={resetPassword}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                  required
                  minLength={8}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setResetPasswordValue(generatePassword())}
                  className={cn(ICON_BTN, "h-10 w-10 shrink-0")}
                  aria-label="Buat password acak"
                  title="Buat password acak"
                >
                  <Wand2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            {resetError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {resetError}
              </p>
            )}
          </DialogContent>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setResetTarget(null)} className={BTN_SECONDARY}>Batal</button>
            <button type="submit" disabled={pending} className={BTN_PRIMARY}>
              {pending ? "Menyimpan..." : "Ganti password"}
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Hapus */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle>Hapus pengguna?</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3 pt-5">
          <p className="text-sm text-slate-700">
            Akun <span className="font-semibold text-slate-900">{deleteTarget?.name}</span> ({deleteTarget?.username}) tidak akan
            bisa masuk lagi. Catatan observasi yang sudah dikirim tidak ikut terhapus.
          </p>
          {deleteError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {deleteError}
            </p>
          )}
        </DialogContent>
        <DialogFooter className="border-t border-slate-100 pt-4">
          <button type="button" onClick={() => setDeleteTarget(null)} className={BTN_SECONDARY}>Batal</button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={pending}
            className={cn(BTN_BASE, "bg-rose-600 px-4 py-2 text-white hover:bg-rose-700")}
          >
            {pending ? "Menghapus..." : "Hapus"}
          </button>
        </DialogFooter>
      </Dialog>

      {/* Kredensial sekali tampil */}
      <Dialog open={credential !== null} onOpenChange={(open) => !open && setCredential(null)}>
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle>{credential?.title}</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4 pt-5">
          <p className="text-sm text-slate-600">Catat atau salin sekarang. Password tidak dapat dilihat lagi setelah dialog ini ditutup.</p>
          <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Username</dt>
              <dd className="font-mono font-semibold text-slate-900">{credential?.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Password</dt>
              <dd className="font-mono font-semibold text-slate-900">{credential?.password}</dd>
            </div>
          </dl>
        </DialogContent>
        <DialogFooter className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => credential && copyText(`Username: ${credential.username}\nPassword: ${credential.password}`)}
            className={BTN_SECONDARY}
          >
            <Copy size={16} aria-hidden="true" /> Salin
          </button>
          <button type="button" onClick={() => setCredential(null)} className={BTN_PRIMARY}>Selesai</button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
