/**
 * Styled wrapper for CMS/TipTap-rendered HTML (article bodies, rich_text
 * blocks), tuned for the dark theme. All element styling is done with Tailwind
 * arbitrary variants so no global stylesheet changes are needed.
 */
export function ArticleBody({ html, className = "" }: { html: string; className?: string }) {
  const classes = [
    "article-body text-[17px] leading-relaxed text-fg-muted",
    // headings
    "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:border-l-4 [&_h2]:border-accent [&_h2]:pl-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-white",
    "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-black [&_h3]:uppercase [&_h3]:tracking-tight [&_h3]:text-white",
    // paragraphs & links
    "[&_p]:my-4",
    "[&_a]:font-semibold [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-white",
    // lists
    "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
    "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6",
    "[&_li]:my-1",
    // quotes, rules, media
    "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-surface [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-lg [&_blockquote]:font-semibold [&_blockquote]:italic [&_blockquote]:text-white",
    "[&_hr]:my-8 [&_hr]:border-line",
    "[&_img]:chamfer-tr [&_img]:my-6 [&_img]:h-auto [&_img]:w-full",
    "[&_figure]:my-6 [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-fg-faint",
    // misc
    "[&_strong]:font-bold [&_strong]:text-white",
    className,
  ].join(" ");

  return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}
