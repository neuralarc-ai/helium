'use client';

import { cn } from "@/lib/utils";
import { ShinyText } from "../ui/shiny-text";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReleaseBadgeProps {
    text: string;
    link: string;
    className?: string;
}
export const ReleaseBadge = ({ text, link, className }: ReleaseBadgeProps) => {
    const router = useRouter();
  return (
    <div className="z-10 flex items-center justify-center">
      <div
        onClick={() => router.push(link)}
        className={cn(
          "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
          className
        )}
      >
        <ShinyText className="text-sm inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
          <span className="text-blue-500 font-semibold mr-2">New!</span>
          <span>{text}</span>
          <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        </ShinyText>
      </div>
    </div>
  );
};