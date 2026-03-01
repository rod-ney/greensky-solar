"use client";

import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

type ParallaxImageProps = {
  children: React.ReactNode;
  className?: string;
  speed?: number;
};

export default function ParallaxImage({
  children,
  className = "",
  speed = 0.3,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 50}%`]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
