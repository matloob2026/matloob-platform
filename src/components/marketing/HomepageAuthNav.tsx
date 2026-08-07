"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/layout/UserMenu";

export function HomepageAuthNav() {
  const { data: session, status } = useSession();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const loginLinks = Array.from(document.querySelectorAll('a[href="/login"]')) as HTMLElement[];
    const registerLinks = Array.from(document.querySelectorAll('a[href="/register"]')) as HTMLElement[];
    // The site's own static hamburger button/drawer (#mobileMenuBtn,
    // #mobileNav, #mobileNavOverlay — see homepage-body.html and
    // homepage-scripts.js) exists to show marketing nav links + Login/
    // Register to signed-out visitors. Once signed in, UserMenu below
    // renders its OWN hamburger trigger right next to it inside the
    // same .header-actions container — leaving the static one visible
    // too produced exactly the reported bug ("the four-line menu icon
    // next to the avatar is not working"): two uncoordinated triggers
    // side by side. So when authenticated, hide the static hamburger
    // and close/hide its drawer if it happened to be open; when
    // signed out, restore both exactly as they were (unchanged
    // behavior for anonymous visitors).
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    let container: HTMLElement | null = null;

    if (status === "authenticated" && session?.user) {
      loginLinks.forEach((el) => { el.style.display = "none"; });
      registerLinks.forEach((el, index) => {
        el.style.display = "none";
        if (index === 0) {
          const slot = document.createElement("span");
          slot.style.display = "inline-flex";
          el.insertAdjacentElement("afterend", slot);
          container = slot;
        }
      });
      if (mobileMenuBtn) {
        (window as unknown as { closeMobileMenu?: () => void }).closeMobileMenu?.();
        mobileMenuBtn.style.display = "none";
      }
      setPortalContainer(container);
    } else {
      loginLinks.forEach((el) => { el.style.display = ""; });
      registerLinks.forEach((el) => { el.style.display = ""; });
      if (mobileMenuBtn) mobileMenuBtn.style.display = "";
      setPortalContainer(null);
    }

    return () => {
      container?.remove();
      if (mobileMenuBtn) mobileMenuBtn.style.display = "";
    };
  }, [status, session]);

  if (!portalContainer || status !== "authenticated" || !session?.user) return null;

  return createPortal(
    <UserMenu name={session.user.name ?? session.user.email ?? "حسابي"} email={session.user.email} imageUrl={session.user.image} />,
    portalContainer
  );
}
