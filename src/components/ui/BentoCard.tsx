"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  index: number;
}

export function BentoCard({
  title,
  description,
  icon: Icon,
  className,
  index,
}: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={cn(
        "surface-interactive group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-9 cursor-default",
        className
      )}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-accent/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.05] text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
          <Icon size={24} strokeWidth={1.8} />
        </div>
        <h3 className="mb-3 text-xl font-extrabold tracking-tight text-on-surface">
          {title}
        </h3>
        <p className="text-on-surface-variant text-base leading-relaxed">
          {description}
        </p>
      </div>

      {/* Corner accent */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}
