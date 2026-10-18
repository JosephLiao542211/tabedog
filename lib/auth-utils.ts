/** Only allow same-origin relative paths as a post-login destination. */
export const safeNext = (v: string | null | undefined) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/");
