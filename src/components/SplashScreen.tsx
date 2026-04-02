import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@/assets/logo.png";
import nexusLogo from "/logo-nexuserp.svg";
import { getActiveLogo, getSelectedEmpresaId } from "@/lib/logoUtils";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2400);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glow background pulse */}
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-primary/20 blur-3xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1.2], opacity: [0, 0.6, 0.3] }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Logo */}
      <motion.img
        src="/logo-nexuserp.svg"
        alt="NexusERP"
        className="w-32 h-32 object-contain relative z-10 drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]"
        initial={{ scale: 0, opacity: 0, rotateY: 90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Title */}
      <motion.h1
        className="mt-6 text-2xl font-bold text-foreground tracking-wider relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        NexusERP
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="mt-2 text-xs text-muted-foreground tracking-[0.3em] uppercase relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        A tecnologia em suas mãos
      </motion.p>

      {/* Loading bar */}
      <motion.div
        className="mt-8 h-0.5 bg-primary/30 rounded-full overflow-hidden w-48 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          className="h-full bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 1, duration: 1.3, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
