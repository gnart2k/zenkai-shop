"use client"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { ReactNode } from "react"
import { SubmitButton } from "./submit-button"

/** Delete button that asks first. `action` is a server action; `fields` are sent with it. */
export function ConfirmDelete({
  action,
  fields,
  title,
  text,
  triggerLabel,
  confirmLabel,
  cancelLabel,
  iconOnly,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>
  fields: Record<string, string>
  title: string
  text: string
  triggerLabel: string
  confirmLabel: string
  cancelLabel: string
  iconOnly?: boolean
  children?: ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? "icon" : "sm"}
          className="text-destructive hover:text-destructive"
          aria-label={triggerLabel}
        >
          <Trash2 />
          {iconOnly ? null : (children ?? triggerLabel)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <form action={action}>
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <SubmitButton variant="destructive">{confirmLabel}</SubmitButton>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
