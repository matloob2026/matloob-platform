"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/layout/UserMenu";

/**
 * The homepage's markup (src/content/marketing/homepage-body.html) is
 * locked/unmodified — this component instead finds the existing
 * `<a href="/login">`/`<a href="/register">` elements it already
 * renders and, once a session exists, hides them and mounts a real
 * <UserMenu> dropdown (via a portal) in their place — the exact same
 * dropdown component used on every other page, so behavior is
 * consistent everywhere: clicking the name/avatar opens a menu
 * (My Profile / My Requests / Logout), it never redirects directly,
 * and there is no separate standalone logout button.
 */
export function HomepageAuthNav() {
  const { data: session, status } = useSession();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const loginLinks = Array.from(document.querySelectorAll('a[href="/login"]')) as HTMLElement[];
    const registerLinks = Array.from(document.querySelectorAll('a[href="/register"]')) as HTMLElement[];
    let container: HTMLElement | null = null;

    if (status === "authenticated" && session?.user) {
      loginLinks.forEach((el) => {
        el.style.display = "none";
      });

      // Mount one portal container right where the first register
      // link was (desktop nav) — the mobile nav's pair is just hidden
      // (the mobile menu already collapses to a single action area).
      registerLinks.forEach((el, index) => {
        el.style.display = "none";
        if (index === 0) {
          const slot = document.createElement("span");
          slot.style.display = "inline-flex";
          el.insertAdjacentElement("afterend", slot);
          container = slot;
        }
      });

      setPortalContainer(container);
    } else {
      loginLinks.forEach((el) => {
        el.style.display = "";
      });
      registerLinks.forEach((el) => {
        el.style.display = "";
      });
      setPortalContainer(null);
    }

    return () => {
      container?.remove();
    };
  }, [status, session]);

  if (!portalContainer || status !== "authenticated" || !session?.user) return null;

  return createPortal(
    <UserMenu name={session.user.name ?? session.user.email ?? "حسابي"} imageUrl={session.user.image} />,
    portalContainer
  );
}
