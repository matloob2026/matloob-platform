"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * The homepage's markup (src/content/marketing/homepage-body.html) is
 * locked/unmodified — this component instead finds the existing
 * `<a href="/login">`/`<a href="/register">` elements it already
 * renders and, once a session exists, hides them and injects two new
 * elements built from the exact same `btn btn-outline`/`btn
 * btn-primary` classes already defined in the homepage's own
 * stylesheet (src/styles/marketing.css) — so nothing is visually
 * "redesigned", the anonymous-visitor buttons just correctly stop
 * showing once the visitor is actually signed in.
 */
export function HomepageAuthNav() {
  const { data: session, status } = useSession();

  useEffect(() => {
    const loginLinks = Array.from(document.querySelectorAll('a[href="/login"]'));
    const registerLinks = Array.from(document.querySelectorAll('a[href="/register"]'));
    const injected: HTMLElement[] = [];

    if (status === "authenticated" && session?.user) {
      const displayName = session.user.name ?? session.user.email ?? "حسابي";

      loginLinks.forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });

      registerLinks.forEach((el) => {
        (el as HTMLElement).style.display = "none";

        const accountLink = document.createElement("a");
        accountLink.href = "/my-requests";
        accountLink.className = "btn btn-primary";
        accountLink.textContent = displayName;
        el.insertAdjacentElement("afterend", accountLink);
        injected.push(accountLink);

        const logoutButton = document.createElement("button");
        logoutButton.type = "button";
        logoutButton.className = "btn btn-outline";
        logoutButton.textContent = "تسجيل الخروج";
        logoutButton.addEventListener("click", () => signOut({ callbackUrl: "/" }));
        el.insertAdjacentElement("afterend", logoutButton);
        injected.push(logoutButton);
      });
    } else {
      loginLinks.forEach((el) => {
        (el as HTMLElement).style.display = "";
      });
      registerLinks.forEach((el) => {
        (el as HTMLElement).style.display = "";
      });
    }

    return () => {
      injected.forEach((el) => el.remove());
    };
  }, [status, session]);

  return null;
}
