import { IconPhotoOff } from "@tabler/icons-react";

import type { LinktreeLink, LinktreeTheme } from "@/backend/linktree/linktree.api.ts";
import { cn } from "@/lib/utils.ts";

/**
 * A link page as visitors see it. The public `/lt/…` route and the editor's phone preview both
 * render this, so the preview cannot drift from what ships. Colours and sizes are the owner's
 * data, which is why they arrive as inline styles.
 */
export function LinkPageView({
  theme,
  links,
  backgroundImage,
  onLinkClick,
  className,
}: Readonly<{
  theme: LinktreeTheme;
  links: readonly LinktreeLink[];
  backgroundImage: string | null;
  onLinkClick?: (linkId: string) => void;
  className?: string;
}>) {
  const { background, logo, title, subtitle, linkListItem } = theme;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-6 overflow-auto bg-cover bg-center bg-no-repeat px-4 pt-16 pb-10",
        className,
      )}
      style={{
        ...background.styles,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      }}
    >
      <div className="flex justify-center">
        {logo.logoUrl ? (
          <img src={logo.logoUrl} alt="" className="object-contain" style={logo.styles} />
        ) : (
          <IconPhotoOff
            className="opacity-30"
            style={{ ...logo.styles, color: title.styles.color }}
            aria-hidden="true"
          />
        )}
      </div>
      <h1 className="m-0 text-center leading-tight wrap-break-word" style={title.styles}>
        {title.text}
      </h1>
      {subtitle.text && (
        <p className="m-0 text-center wrap-break-word" style={subtitle.styles}>
          {subtitle.text}
        </p>
      )}
      <div className="mt-2 flex flex-col items-center gap-4">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full max-w-125 items-center justify-center p-3 text-center no-underline"
            style={linkListItem.styles}
            onClick={() => onLinkClick?.(link.id)}
          >
            {link.linkDisplayName}
          </a>
        ))}
      </div>
      {backgroundImage && <UnsplashCredit url={backgroundImage} />}
    </div>
  );
}

/** Unsplash's licence asks for a credit wherever one of its photos is shown. */
function UnsplashCredit({ url }: Readonly<{ url: string }>) {
  const params = new URLSearchParams(url.split("?")[1]);
  const author = params.get("author");
  if (!author) return null;
  const utm = "utm_source=Rateup&utm_medium=referral";

  return (
    <p className="absolute bottom-1.5 left-2 m-0 text-[10px] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
      Photo by{" "}
      <a
        href={`https://unsplash.com/@${params.get("username")}?${utm}`}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        {author}
      </a>{" "}
      on{" "}
      <a
        href={`https://unsplash.com/?${utm}`}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Unsplash
      </a>
    </p>
  );
}
