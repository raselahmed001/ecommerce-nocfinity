import Link from "next/link";
import type { SiteContent } from "@/lib/types";
import { Newsletter } from "./Newsletter";

// Round social buttons like the design: Twitter and Facebook are filled glyphs, Instagram and GitHub are outlines.
const SOCIAL_ICONS: Record<string, { dark: boolean; fill: boolean; d: string }> = {
  Twitter: {
    dark: false,
    fill: true,
    d: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
  },
  Facebook: { dark: true, fill: true, d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
  Instagram: { dark: false, fill: false, d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z" },
  GitHub: { dark: false, fill: false, d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" },
};

/** Payment brand marks drawn as small SVGs (white card with the brand's own colors). */
function PaymentLogo({ name }: { name: string }) {
  const card = "flex h-8 w-[3.25rem] items-center justify-center rounded-md border border-black/10 bg-white";

  if (name === "Visa") {
    return (
      <li className={card} title="Visa">
        <span className="text-[13px] font-black italic tracking-tight text-[#1a1f71]">VISA</span>
      </li>
    );
  }
  if (name === "Mastercard") {
    return (
      <li className={card} title="Mastercard">
        <svg width="26" height="16" viewBox="0 0 26 16" role="img" aria-label="Mastercard">
          <circle cx="8.5" cy="8" r="7.5" fill="#eb001b" />
          <circle cx="17.5" cy="8" r="7.5" fill="#f79e1b" />
          <path d="M13 2.1a7.5 7.5 0 0 1 0 11.8 7.5 7.5 0 0 1 0-11.8z" fill="#ff5f00" />
        </svg>
      </li>
    );
  }
  if (name === "PayPal") {
    return (
      <li className={card} title="PayPal">
        <span className="text-[11px] font-extrabold italic leading-none">
          <span className="text-[#253b80]">Pay</span>
          <span className="text-[#179bd7]">Pal</span>
        </span>
      </li>
    );
  }
  if (name === "Apple Pay") {
    return (
      <li className={card} title="Apple Pay">
        <span className="flex items-center gap-0.5 text-[11px] font-bold">
          <svg width="11" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
          </svg>
          Pay
        </span>
      </li>
    );
  }
  if (name !== "Google Pay") {
    return (
      <li className={`${card} text-[10px] font-bold`} title={name}>
        {name}
      </li>
    );
  }
  return (
    <li className={card} title="Google Pay">
      <span className="text-[11px] font-bold leading-none">
        <span className="text-[#4285f4]">G</span>
        <span className="text-[#5f6368]"> Pay</span>
      </span>
    </li>
  );
}

export function Footer({ site }: { site: SiteContent }) {
  const { footer } = site;

  return (
    <footer className="relative mt-32">
      {/* The newsletter box overlaps the grey footer */}
      <div className="relative z-10 -mb-24">
        {site.newsletter && <Newsletter title={site.newsletter.title} />}
      </div>
      <div className="bg-surface pt-36">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-10 sm:px-6 md:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <p className="display text-3xl">{site.name}</p>
            <p className="mt-4 max-w-[16rem] text-sm text-black/60">{footer.about}</p>
            <ul className="mt-6 flex gap-3" aria-label="Social media">
              {footer.socials.map((name) => {
                const social = SOCIAL_ICONS[name];
                return (
                  <li key={name}>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-xs font-bold ${social?.dark ? "bg-black text-white" : "bg-white text-black"}`}
                      role="img"
                      aria-label={name}
                    >
                      {social ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={social.fill ? "currentColor" : "none"} stroke={social.fill ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d={social.d} />
                        </svg>
                      ) : (
                        name.charAt(0)
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm uppercase tracking-[0.2em]">{column.title}</h2>
              <ul className="mt-5 space-y-3.5 text-sm text-black/60">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link href={link.href} className="hover:text-black">
                        {link.label}
                      </Link>
                    ) : (
                      link.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6"><div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:border-t sm:border-black/10 sm:pt-6">
          <p className="text-sm text-black/60">{site.name} &copy; {new Date().getFullYear()}, All Rights Reserved</p>
          <ul className="flex shrink-0 gap-2" aria-label="Accepted payments">
            {site.payments.map((name) => (
              <PaymentLogo key={name} name={name} />
            ))}
          </ul>
        </div></div>
      </div>
    </footer>
  );
}
