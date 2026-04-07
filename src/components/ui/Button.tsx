"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  ...rest
}) => {
  const base = "inline-flex items-center justify-center rounded-[1rem] font-bold transition-all duration-250 ease-in-out";
  const variants: Record<string, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
  };
  const classes = `${base} ${variants[variant]} ${className}`.trim();
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};
