# Mobile UI checklist (Flutter)

Use this when adding or changing screens so layout, theme, and navigation stay consistent across roles (customer, vendor, trader, admin).

## Baseline verification

Before merging UI-heavy work:

1. Run `cd packages/mobile && flutter analyze` (expect **no issues**; CI may use `--no-fatal-infos` if you intentionally allow infos).
2. Exercise the flow on **one real device or emulator** (note Android version and whether **system dark mode** is on). The app uses **`ThemeMode.light`** so the UI should not follow system dark theme.
3. Capture **2–3 screenshots** for regressions on: tab roots, auth, one nested flow (e.g. product detail or edit product).

## Theme and colors

- Prefer **`Theme.of(context).colorScheme`** (and `textTheme`) for surfaces, outlines, and labels.
- Shared vendor-style tokens live on **[`AppTheme`](../lib/core/theme/app_theme.dart)** (e.g. `AppTheme.pageBackgroundSoft`, `AppTheme.formFieldFillMuted`, **`AppTheme.vendorCardBackground`** for list cards on vendor mocks). Avoid duplicating the same hex in multiple widgets.
- **`MaterialApp`** is configured with **`themeMode: ThemeMode.light`** in [`app.dart`](../lib/app.dart) so a dark system theme does not fight the single light `ThemeData`.

## Shell and bottom navigation

- Most routes render inside **[`AppShell`](../lib/features/shell/app_shell.dart)**, which owns the `NavigationBar`.
- **Tab selection** is driven by `_indexForPath` + role-specific tab roots. When you add a nested vendor route that belongs to the “Products” journey (e.g. upload, edit), extend the same logic there instead of relying on “first tab” fallback.
- **Hiding the bottom bar**: add prefixes to `_hidePrefixes` when the screen should be full-bleed (e.g. product detail, order detail, share flows, inbound share). Prefer path prefixes that match **nested** routes (e.g. `/orders/` not only `/orders`).

## Layout and scrolling

- Use **`SafeArea`** for full-screen forms and list bodies when content should not sit under notches or system bars (see login / share products).
- Avoid **unbounded height** inside vertical scrollables: e.g. do not put a plain `Column` with many children inside a `ListView` without `shrinkWrap` / `Sliver` patterns unless you know constraints.
- For **keyboard overlap** on forms, prefer **`ListView`** (or `SingleChildScrollView`) with **`keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag`** where it improves UX.

## Forms

- **`DropdownButtonFormField`**: use **`initialValue`** (not deprecated `value`) and a **`ValueKey`** when the field must rebuild when parent state changes (role picker, mode toggle).

## Flutter Web: image uploads

- **`FilePicker` on web** usually has **`path == null`**; use **`withData: true`** (see `kIsWeb` in product form / vendor upload) so **`PlatformFile.bytes`** is filled.
- Build **`MultipartFile`** via [`upload_multipart_helpers.dart`](../lib/core/api/upload_multipart_helpers.dart) and **`UploadApi.postProductImageParts`** — do not rely on **`MultipartFile.fromFile`** alone on web.
- If **`POST …/upload/images`** appears in DevTools but fails: the page origin (e.g. `http://your-host:8080`) must be allowed by **CORS** on the API (`service.garmenthub.in` / nginx / `corsOptions`). That is a server config issue, not the Flutter client.

## References

- App theme: [`lib/core/theme/app_theme.dart`](../lib/core/theme/app_theme.dart)
- Router (which routes use the shell): [`lib/core/routing/app_router.dart`](../lib/core/routing/app_router.dart)
