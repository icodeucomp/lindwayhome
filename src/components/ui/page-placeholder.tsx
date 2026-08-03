import { Container } from "@/components";

import { Footer } from "./footer";
import { Header } from "./header";

/**
 * Route shell for v2 pages whose content lands in a later phase (CLAUDE.md Part C).
 * It exists so the header and footer never link to a 404 while phase 0 is in flight —
 * replace the whole file usage, not just the copy, when the real page is built.
 */
export const PagePlaceholder = ({ title, phase }: { title: string; phase: string }) => (
  <>
    <Header isDark />
    <main className="flex-1">
      <Container className="flex flex-col items-center justify-center gap-3 py-32 text-center">
        <h1 className="text-3xl font-heading text-primary">{title}</h1>
        <p className="max-w-md text-sm text-body/70">This page is part of {phase} and has not been built yet.</p>
      </Container>
    </main>
    <Footer />
  </>
);
