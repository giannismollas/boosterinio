# Image sources

Every raster the site ships, and where it came from. All of these are the publishers' own artwork,
used only to identify the game or rank being sold (see the footer notice). They were downloaded,
cropped and converted to WebP; nothing was redrawn. Before launch, confirm you are comfortable using
them or swap in licensed art (Admin → Games → image URL for game covers).

Brand assets (the B mark, wordmark, favicon `src/app/icon.svg` and the social image
`src/app/opengraph-image.tsx`) are drawn in code for Boosterinio. The hero's metal B plate (`public/images/brand/b-plate-v2.webp`, and `b-plate-og.png` for the social image) is drawn for Boosterinio in SVG (`docs/brand/b-plate.html`) and rendered to a transparent image with headless Chrome; re-render it from that file if the mark changes. The social image uses Saira and Rubik
(SIL Open Font License), pinned to static TTFs in `src/app/fonts/` from the same Google Fonts files the
site loads.

## Rank emblems (League of Legends)

| File | Source |
| --- | --- |
| `public/images/ranks/lol/arena-bronze.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/cherry-rated-medallions/ (Arena medallion, bronze) |
| `public/images/ranks/lol/arena-gladiator.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/cherry-rated-medallions/ (Arena medallion, gladiator) |
| `public/images/ranks/lol/arena-gold.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/cherry-rated-medallions/ (Arena medallion, gold) |
| `public/images/ranks/lol/arena-silver.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/cherry-rated-medallions/ (Arena medallion, silver) |
| `public/images/ranks/lol/arena-wood.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/cherry-rated-medallions/ (Arena medallion, wood) |
| `public/images/ranks/lol/bronze.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-bronze.png |
| `public/images/ranks/lol/challenger.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-challenger.png |
| `public/images/ranks/lol/diamond.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-diamond.png |
| `public/images/ranks/lol/emerald.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-emerald.png |
| `public/images/ranks/lol/gold.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-gold.png |
| `public/images/ranks/lol/grandmaster.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-grandmaster.png |
| `public/images/ranks/lol/iron.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-iron.png |
| `public/images/ranks/lol/master.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-master.png |
| `public/images/ranks/lol/platinum.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-platinum.png |
| `public/images/ranks/lol/silver.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-silver.png |
| `public/images/ranks/lol/unranked.webp` | Riot Games client asset via CommunityDragon: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked_crest_placeholder.png |

## Game covers

| File | Source |
| --- | --- |
| `public/images/games/albion-online.webp` | Steam store header art, app 761890 (Albion Online): https://store.steampowered.com/app/761890 |
| `public/images/games/apex-legends.webp` | Steam store header art, app 1172470 (Apex Legends): https://store.steampowered.com/app/1172470 |
| `public/images/games/arc-raiders.webp` | Steam store header art, app 1808500 (ARC Raiders): https://store.steampowered.com/app/1808500 |
| `public/images/games/battlefield-6.webp` | Steam store header art, app 2807960 (Battlefield 6): https://store.steampowered.com/app/2807960 |
| `public/images/games/black-desert.webp` | Steam store header art, app 582660 (Black Desert): https://store.steampowered.com/app/582660 |
| `public/images/games/brawl-stars.webp` | Publisher image (supercell.com): https://supercell.com/images/b524ca49e8549e5d3f5485452da7f26c/cropped.png |
| `public/images/games/call-of-duty.webp` | Steam store header art, app 1938090 (Call of Duty): https://store.steampowered.com/app/1938090 |
| `public/images/games/clash-of-clans.webp` | Publisher image (supercell.com): https://supercell.com/images/4c0ab0c1fb2958e72103f81632fee096/og_clashofclans.f3149338.jpg |
| `public/images/games/clash-royale.webp` | Publisher image (supercell.com): https://supercell.com/images/8654bffbaa77efb91243d3706b739c25/og_clashroyale.d235f90b.jpg |
| `public/images/games/counter-strike-2.webp` | Steam store header art, app 730 (Counter-Strike 2): https://store.steampowered.com/app/730 |
| `public/images/games/dead-by-daylight.webp` | Steam store header art, app 381210 (Dead by Daylight): https://store.steampowered.com/app/381210 |
| `public/images/games/deadlock.webp` | Steam store header art, app 1422450 (Deadlock): https://store.steampowered.com/app/1422450 |
| `public/images/games/destiny-2.webp` | Steam store header art, app 1085660 (Destiny 2): https://store.steampowered.com/app/1085660 |
| `public/images/games/diablo-4.webp` | Steam store header art, app 2344520 (Diablo IV): https://store.steampowered.com/app/2344520 |
| `public/images/games/dota-2.webp` | Steam store header art, app 570 (Dota 2): https://store.steampowered.com/app/570 |
| `public/images/games/ea-sports-fc.webp` | Steam store header art, app 3405690 (EA SPORTS FC 26): https://store.steampowered.com/app/3405690 |
| `public/images/games/escape-from-tarkov.webp` | Steam store header art, app 3932890 (Escape from Tarkov): https://store.steampowered.com/app/3932890 |
| `public/images/games/final-fantasy-xiv.webp` | Steam store header art, app 39210 (FINAL FANTASY XIV Online): https://store.steampowered.com/app/39210 |
| `public/images/games/fortnite.webp` | Publisher image (image.api.playstation.com): https://image.api.playstation.com/vulcan/ap/rnd/202610/2822/9540e915e26a7168ee5dfc697d8fa756b6a6343b8969d6e5.png |
| `public/images/games/genshin-impact.webp` | Publisher image (upload-static.hoyoverse.com): https://upload-static.hoyoverse.com/hk4e/upload/fb/common.jpg |
| `public/images/games/gta-5.webp` | Steam store header art, app 271590 (Grand Theft Auto V Legacy): https://store.steampowered.com/app/271590 |
| `public/images/games/guild-wars-2.webp` | Steam store header art, app 1284210 (Guild Wars 2): https://store.steampowered.com/app/1284210 |
| `public/images/games/hearthstone.webp` | Publisher image (d39zum0jwvcigt.cloudfront.net): https://d39zum0jwvcigt.cloudfront.net/_next/static/images/default-475d770302527dbab7708dca |
| `public/images/games/honkai-star-rail.webp` | Publisher image (fastcdn.hoyoverse.com): https://fastcdn.hoyoverse.com/mi18n/hkrpg_global/m20260904hy5hcii9ds/upload/f0981b5c04af1c |
| `public/images/games/league-of-legends.webp` | Publisher image (ddragon.leagueoflegends.com): https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg |
| `public/images/games/lost-ark.webp` | Steam store header art, app 1599340 (Lost Ark): https://store.steampowered.com/app/1599340 |
| `public/images/games/marvel-rivals.webp` | Steam store header art, app 2767030 (Marvel Rivals): https://store.steampowered.com/app/2767030 |
| `public/images/games/minecraft.webp` | Publisher image (www.minecraft.net): https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Hero-Image_Vanilla_Standard_1200x675.jpg |
| `public/images/games/mobile-legends.webp` | Publisher image (akmweb.youngjoygame.com): https://akmweb.youngjoygame.com/web/gms/image/c3d1596795b86dc26e5f1ef2d48c3dfd.jpg |
| `public/images/games/old-school-runescape.webp` | Steam store header art, app 1343370 (Old School RuneScape): https://store.steampowered.com/app/1343370 |
| `public/images/games/overwatch-2.webp` | Steam store header art, app 2357570 (Overwatch): https://store.steampowered.com/app/2357570 |
| `public/images/games/path-of-exile-2.webp` | Steam store header art, app 2694490 (Path of Exile 2): https://store.steampowered.com/app/2694490 |
| `public/images/games/path-of-exile.webp` | Steam store header art, app 238960 (Path of Exile): https://store.steampowered.com/app/238960 |
| `public/images/games/pokemon-go.webp` | Publisher image (www.pokemon.com): https://www.pokemon.com/static-assets/content-assets/cms2/img/video-games/video-games/pokemon_go/169.jpg |
| `public/images/games/pubg-battlegrounds.webp` | Steam store header art, app 578080 (PUBG: BATTLEGROUNDS): https://store.steampowered.com/app/578080 |
| `public/images/games/pubg-mobile.webp` | Publisher image (www.pubgmobile.com): https://www.pubgmobile.com/images/event/home/share.jpg |
| `public/images/games/raid-shadow-legends.webp` | Steam store header art, app 2333480 (RAID: Shadow Legends): https://store.steampowered.com/app/2333480 |
| `public/images/games/rainbow-six-siege.webp` | Steam store header art, app 359550 (Tom Clancy's Rainbow Six Siege): https://store.steampowered.com/app/359550 |
| `public/images/games/roblox.webp` | Publisher image (images.rbxcdn.com): https://images.rbxcdn.com/5348266ea6c5e67b19d6a814cbbb70f6.jpg |
| `public/images/games/rocket-league.webp` | Steam store header art, app 252950 (Rocket League): https://store.steampowered.com/app/252950 |
| `public/images/games/runescape-3.webp` | Steam store header art, app 1343400 (RuneScape): https://store.steampowered.com/app/1343400 |
| `public/images/games/rust.webp` | Steam store header art, app 252490 (Rust): https://store.steampowered.com/app/252490 |
| `public/images/games/teamfight-tactics.webp` | Publisher image (cmsassets.rgpub.io): https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/d63adacd93e313c1e61bbeb2eb37d8 |
| `public/images/games/the-finals.webp` | Steam store header art, app 2073850 (THE FINALS): https://store.steampowered.com/app/2073850 |
| `public/images/games/valorant.webp` | Publisher image (media.valorant-api.com): https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png |
| `public/images/games/world-of-warcraft.webp` | Publisher image (blz-contentstack-images.akamaized.net): https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltb5a24e5ab1e |
| `public/images/games/wuthering-waves.webp` | Steam store header art, app 3513350 (Wuthering Waves): https://store.steampowered.com/app/3513350 |
| `public/images/games/zenless-zone-zero.webp` | Publisher image (fastcdn.hoyoverse.com): https://fastcdn.hoyoverse.com/mi18n/nap_global/m20261008hy2hoy3400/upload/617d66c68cf74647 |
