import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AtalhosNavegacaoModal } from "./AtalhosNavegacaoModal";
import { motion, AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export function AppLayout() {
  const isMobile = useIsMobile();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();

  useKeyboardShortcuts(() => setShortcutsOpen(true));

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className={`flex-1 overflow-auto min-w-0 ${isMobile ? "pt-14" : ""}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <AtalhosNavegacaoModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
