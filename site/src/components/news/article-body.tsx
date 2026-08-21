/**
 * Styled wrapper for CMS/TipTap-rendered HTML (article bodies, rich_text
 * blocks). Reading copy is Titillium 17/28 (`body-m`) on the light surface,
 * headings are uppercase Formula1, and blockquotes become the F1 pull-quote:
 * an oversized brand-colour quote mark beside uppercase display type. All
 * element styling is done with Tailwind arbitrary variants so no global
 * stylesheet changes are needed.
 */
export function ArticleBody({ html, className = "" }: { html: string; className?: string }) {
  const classes = [
    "article-body body-m text-text-4",
    // headings — Formula1, uppercase ("bold" = weight 500 for this face)
    "[&_h2]:display-l [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-medium [&_h2]:uppercase [&_h2]:text-text-5 [&_h2]:md:text-[1.5rem] [&_h2]:md:leading-7",
    "[&_h3]:display-m [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:font-medium [&_h3]:uppercase [&_h3]:text-text-5",
    "[&_h4]:body-s [&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:font-bold [&_h4]:uppercase [&_h4]:text-text-5",
    // paragraphs & links
    "[&_p]:my-5",
    "[&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-2 [&_a:hover]:text-brand-dark",
    // lists
    "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6",
    "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6",
    "[&_li]:my-2",
    // pull-quote — brand quote mark + uppercase Formula1
    "[&_blockquote]:relative [&_blockquote]:my-10 [&_blockquote]:pl-10",
    "[&_blockquote]:font-display [&_blockquote]:text-[1.25rem] [&_blockquote]:leading-6 [&_blockquote]:uppercase [&_blockquote]:text-text-5 [&_blockquote]:md:text-[1.5rem] [&_blockquote]:md:leading-7",
    "[&_blockquote]:before:absolute [&_blockquote]:before:left-0 [&_blockquote]:before:top-0 [&_blockquote]:before:content-['“'] [&_blockquote]:before:font-display [&_blockquote]:before:text-[3.5rem] [&_blockquote]:before:leading-[0.9] [&_blockquote]:before:text-brand",
    "[&_blockquote_p]:my-0 [&_blockquote_p+p]:mt-3",
    "[&_blockquote_cite]:body-xs [&_blockquote_cite]:mt-3 [&_blockquote_cite]:block [&_blockquote_cite]:font-semibold [&_blockquote_cite]:not-italic [&_blockquote_cite]:uppercase [&_blockquote_cite]:text-text-3",
    // rules & media
    "[&_hr]:my-10 [&_hr]:border-surface-4",
    "[&_img]:my-8 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-md",
    "[&_figure]:my-8",
    "[&_figcaption]:body-xs [&_figcaption]:mt-2 [&_figcaption]:text-text-3",
    // tables & code
    "[&_table]:my-8 [&_table]:w-full [&_table]:text-left",
    "[&_th]:body-xs [&_th]:border-b-2 [&_th]:border-surface-6 [&_th]:py-3 [&_th]:pr-6 [&_th]:font-semibold [&_th]:uppercase [&_th]:text-text-3",
    "[&_td]:body-s [&_td]:border-b [&_td]:border-surface-4 [&_td]:py-3 [&_td]:pr-6",
    "[&_pre]:my-8 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-surface-3 [&_pre]:p-4",
    // misc
    "[&_strong]:font-bold [&_strong]:text-text-5",
    className,
  ].join(" ");

  return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}
