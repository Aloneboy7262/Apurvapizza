# Apurva Pizza Hub - Media Assets Directory (Videos)

This directory houses all photorealistic handcrafted food motion assets served directly to the client via Vite / Nginx static routing (`/videos/*`).

## Video Asset Inventory

| File Name | Dimensions | Purpose | Variant Key |
| :--- | :--- | :--- | :--- |
| `pizza-craft.mp4` | 1080p | Wood-fired artisan pizza showcase with real mozzarella pull | `'pizza'` |
| `burger-craft.mp4` | 1080p | Charcoal smashed double cheddar gourmet burger | `'burger'` |
| `drink-craft.mp4` | 1080p | Ice-chilled refreshing beverages & mocktails | `'drink'` |
| `wood-fired-craft.mp4` | 1080p | Wood-fired oven artisan baking sequence | `'wood-fired'` |

## Streaming & Compression Standards
- Codec: H.264 / AAC
- Container: MP4 (FastStart enabled for instant byte-range playback)
- Delivery: Nginx configured with `Accept-Ranges bytes` and 1-year immutable caching (`max-age=31536000`).
