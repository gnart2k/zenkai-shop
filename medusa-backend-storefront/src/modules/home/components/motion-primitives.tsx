"use client"

import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"

const ease = [0.22, 1, 0.36, 1] as const

const viewport = {
  once: true,
  margin: "-10% 0px -10% 0px",
} as const

export function Reveal({
  children,
  className,
  delay = 0,
  id,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  id?: string
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.55, delay, ease }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export function RevealStagger({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export function HeroMotion(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease }}
      {...props}
    />
  )
}
