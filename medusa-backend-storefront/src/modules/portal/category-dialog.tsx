"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { SubmitButton } from "./submit-button"

type Category = { id: string; name: string; description: string | null; is_active: boolean }

/** Create (no `category`) or edit one category in a dialog. `action` is a server action. */
export function CategoryDialog({
  action,
  base,
  category,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>
  base: string
  category?: Category
  labels: {
    trigger: string
    title: string
    name: string
    description: string
    visible: string
    save: string
    cancel: string
  }
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button type="button" variant="outline" size="icon" aria-label={labels.trigger}>
            <Pencil />
          </Button>
        ) : (
          <Button type="button">
            <Plus />
            {labels.trigger}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription className="sr-only">{labels.title}</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="base" value={base} />
          <input type="hidden" name="returnTo" value={`${base}/admin/categories`} />
          {category ? <input type="hidden" name="id" value={category.id} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor={`name-${category?.id ?? "new"}`}>{labels.name}</Label>
            <Input id={`name-${category?.id ?? "new"}`} name="name" required defaultValue={category?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`desc-${category?.id ?? "new"}`}>{labels.description}</Label>
            <Textarea id={`desc-${category?.id ?? "new"}`} name="description" rows={3} defaultValue={category?.description ?? ""} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id={`active-${category?.id ?? "new"}`} name="is_active" defaultChecked={category?.is_active ?? true} />
            <Label htmlFor={`active-${category?.id ?? "new"}`}>{labels.visible}</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <SubmitButton>{labels.save}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
