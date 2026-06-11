# Screen mapping: React (`packages/frontend`) → Flutter (`packages/mobile`)

This document mirrors [`packages/frontend/src/App.tsx`](../frontend/src/App.tsx) routes and [`packages/frontend/src/components/layout/BottomNav.tsx`](../frontend/src/components/layout/BottomNav.tsx) tab targets. Primary APIs reference the existing Express backend under `/api` ([`packages/backend/src/index.ts`](../backend/src/index.ts)).

## Bottom navigation (Material `NavigationBar`)

| Role | Tabs (path order) | Hidden when path starts with |
|------|-------------------|------------------------------|
| Customer / Trader | `/`, `/saved`, `/network`, `/orders`, `/profile` | `/products/`, `/bulk-order`, `/trader/share`, `/trader/groups` |
| Vendor | `/vendor`, `/vendor/products`, `/network`, `/vendor/orders`, `/profile` | Same product prefix + bulk/trader share/groups |
| Admin | `/admin`, `/admin/users`, `/admin/orders`, `/profile` | `/products/`, `/bulk-order`, `/trader/share`, `/trader/groups` |

## Route table

| React path | Flutter path | Feature module | Primary APIs |
|------------|----------------|----------------|--------------|
| `/login` | `/login` | `auth` | `POST /auth/send-otp`, `POST /auth/verify-otp` |
| `/` (customer home) | `/` | `home` | `GET /products/feed`, `GET /curation/received`, `GET /products/categories` |
| `/` (trader home) | `/` | `home` + `workflow` + `orders` + `curation` | `GET /workflow/counts`, `GET /workflow/unseen-grouped` (or `GET /workflow/unseen`), `GET /workflow/feed?state=…`, `GET /orders/trader/alerts`, `GET /curation/sent` (PWA SHARED grouping) |
| `/search` | `/search` | `products` | `GET /products`, `GET /products/filters` |
| `/products/:id` | `/products/:id` | `products` | `GET /products/:id`, `POST /products/save`, `DELETE /products/save/:id` |
| `/products/:id/gallery` | `/products/:id/gallery` | `products` | `GET /products/:id/gallery` |
| `/products/:id/customer-shared` | `/products/:id/shared-photos` | `curation` | `GET /curation/shared-photos/:productId` |
| `/bulk-order` | `/bulk-order` | `orders` | `POST /orders` (guard: **CUSTOMER** only) |
| `/orders` | `/orders` | `orders` | `GET /orders` |
| `/orders/:id` | `/orders/:id` | `orders` + `orders/domain` | `GET /orders/:id`, `POST /orders/:id/confirm`, `POST /orders/:id/release-to-vendors` (trader) |
| `/saved` | `/saved` | `products` | `GET /products/saved` |
| `/network` | `/network` | `network` | `GET /network/connections`, `GET /network/suggestions`, `POST /network/follow/:id` |
| `/network/traders/:traderId` | `/network/traders/:traderId` | `network` | `GET /network/traders/:id/insights`, `POST /network/connect-trader/:id` |
| `/notifications` | `/notifications` | `notifications` | `GET /notifications`, `PUT /notifications/read-all`, `PUT /notifications/:id/read` |
| `/profile` | `/profile` | `auth` | `PUT /auth/me`, session clear on logout |
| `/trader/share` | `/trader/share` | `curation` | `POST /curation/share` |
| `/trader/groups` | `/trader/groups` | `curation` | `GET /curation/groups`, `POST /curation/groups` |
| `/trader/groups/:groupId` | `/trader/groups/:groupId` | `curation` | `GET /curation/groups/:id`, `POST .../members`, `DELETE .../members/:customerId` |
| `/vendor` | `/vendor` | `vendor` | `GET /products/my` (dashboard count) |
| `/vendor/brands` | `/vendor/brands` | `vendor` + `brands` | `GET /brands/my`, `POST /brands` |
| `/vendor/products` | `/vendor/products` | `vendor` + `products` | `GET /products/my` |
| `/vendor/products/new` | `/vendor/products/new` | `vendor` | `POST /products` |
| `/vendor/products/:id/edit` | `/vendor/products/:id/edit` | `vendor` | `GET /products/:id`, `PUT /products/:id` |
| `/vendor/upload` | `/vendor/upload` | `vendor` | `POST /api/upload/images` (multipart) |
| — | `/vendor/inbound-share` | `vendor` | Android share intent → `POST /api/upload/images` |
| `/vendor/orders` | `/vendor/orders` | `vendor` | `GET /vendor/orders`, `PUT /vendor/orders/items/:id/respond` |
| `/vendor/history` | `/vendor/history` | `vendor` | Same as web: `GET /vendor/orders` (client filters non-`PENDING`) |
| `/vendor/catalog` | `/vendor/catalog` | `vendor` | `GET /vendor/categories` |
| `/admin` | `/admin` | `admin` | `GET /admin/stats` |
| `/admin/users` | `/admin/users` | `admin` | `GET /admin/users`, `PUT /admin/users/:id` |
| `/admin/orders` | `/admin/orders` | `admin` | `GET /admin/orders` |
| `/admin/settings` | `/admin/settings` | `admin` | `GET /admin/categories`, `POST /admin/categories` |

## Post-login redirects

Matches `RoleRedirect` in React: **VENDOR** → `/vendor`, **ADMIN** → `/admin`, else `/`.

## Guards

- **Vendor subtree** (`/vendor/*`): non-vendor → `/`.
- **Bulk order** (`/bulk-order`): non-customer → `/`.

## Order workflow logic (Dart)

[`lib/features/orders/domain/order_workflow.dart`](../lib/features/orders/domain/order_workflow.dart) ports customer/trader labels from [`packages/frontend/src/lib/orderWorkflow.ts`](../frontend/src/lib/orderWorkflow.ts).
