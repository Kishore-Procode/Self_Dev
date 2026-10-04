ASTA WALLPAPER PACK
====================

These are the Asta wallpapers supplied in the conversation, prepared for use as
background/hero imagery in the ASTA-themed productivity app.

Folders:
- webp/  -> recommended for the web app; smaller file sizes
- jpg/   -> compatibility fallback

Suggested usage:
- Full-screen background: object-fit: cover
- Dashboard hero: object-fit: cover + dark overlay
- Focus mode: use the darker/red variants
- Quote screen: use the quote/collage variants

Example CSS:
.hero-bg {
  background-image:
    linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.78)),
    url("../assets/backgrounds/asta/asta_02_red_background.webp");
  background-size: cover;
  background-position: center;
}
