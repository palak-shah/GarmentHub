# PWA parity QA (Flutter mobile)

Run these flows **side by side** with the PWA (`packages/frontend`) and the Flutter app (`packages/mobile`), same backend and roles.

Before starting:

```bash
cd /home/Palak/garmenthub/packages/mobile
dart analyze
flutter test
```

Optional invite testing: build with `--dart-define=WEB_APP_URL=https://<your-web-app-host>` so copied invite links match production (see [README.md](../README.md)).

## Customer

| Step | PWA reference | Pass? |
|------|----------------|-------|
| Network: search (≥2 chars), follow / unfollow | `Network.tsx` | |
| My Traders card → curated product list | `/search?traderId=…&traderName=…` | |
| Stories strip → vendor-scoped listing | `/search?vendorId=…` | |
| Following (non-trader) unfollow | | |
| Search screen: 2-column grid, **Show more**, **Select** → Save / Order | `ProductListing.tsx` | |
| Orders: tabs incl. “Pending from me” | `Orders.tsx` | |

## Trader

| Step | PWA reference | Pass? |
|------|----------------|-------|
| My Vendors → `/search?vendorId=…` | | |
| My Customers unfollow | | |
| Suggestions follow | | |
| Search products: Select → Skip / Save / Share | `SelectionActionBar.tsx` | |

## Vendor

| Step | PWA reference | Pass? |
|------|----------------|-------|
| Header “Connect”, search traders | | |
| Connect / Disconnect (search + connected cards) | | |
| Connected trader → insights | `/network/traders/:id` | |
| Invite (+): copied text contains `/login?invite=` when `WEB_APP_URL` set | | |

Record device/OS, app build flags, and API URL for any failure.
