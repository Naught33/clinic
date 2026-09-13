import type { HTMLAttributes } from "react";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-line bg-white shadow-panel dark:border-line-dark dark:bg-[#161A18] ${className ?? ""}`}
      {...rest}
    />
  );
}
