'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Category, CategoryKind } from '@/lib/database.types'
import { CATEGORY_KIND_LABELS } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initial: Category[]
  userId: string
}

interface FormState {
  name: string
  kind: CategoryKind
  color: string
}

const DEFAULT_FORM: FormState = { name: '', kind: 'course', color: '#3b82f6' }

export function CategoryManager({ initial, userId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  function openCreate() {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditTarget(cat)
    setForm({ name: cat.name, kind: cat.kind as CategoryKind, color: cat.color ?? '#3b82f6' })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    startTransition(async () => {
      if (editTarget) {
        const { data, error } = await supabase
          .from('categories')
          .update({
            name: form.name.trim(),
            kind: form.kind,
            color: form.color,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTarget.id)
          .select()
          .single()
        if (error) {
          toast.error(error.message)
          return
        }
        setCategories((prev) => prev.map((c) => (c.id === editTarget.id ? data : c)))
        toast.success('Category updated')
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert({ name: form.name.trim(), kind: form.kind, color: form.color, owner_id: userId })
          .select()
          .single()
        if (error) {
          toast.error(error.message)
          return
        }
        setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Category created')
      }
      setDialogOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) {
        toast.error(error.message)
        return
      }
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setDeleteConfirm(null)
      toast.success('Category deleted')
      router.refresh()
    })
  }

  return (
    <>
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </span>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New category
          </Button>
        </div>
        <Separator />
        {categories.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No categories yet. Create one to get started.
          </div>
        ) : (
          <ul className="divide-y">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="h-4 w-4 rounded-full flex-shrink-0 border border-black/10"
                  style={{ background: cat.color ?? '#3b82f6' }}
                />
                <span className="flex-1 font-medium text-sm">{cat.name}</span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {CATEGORY_KIND_LABELS[cat.kind as CategoryKind]}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(cat)}
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteConfirm(cat.id)}
                  aria-label="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Algorithms"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => v && setForm((f) => ({ ...f, kind: v as CategoryKind }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_KIND_LABELS) as [CategoryKind, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="cat-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <span className="text-sm font-mono text-muted-foreground">{form.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? 'Saving…' : editTarget ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Events and logs using this category will lose their category link. This cannot be
            undone.
          </p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={pending}
            >
              {pending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
