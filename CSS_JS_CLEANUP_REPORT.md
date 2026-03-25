# CSS/JS Cleanup Report

Date: 2026-03-07
Project: Titi Golden Taste
Scope: static audit of HTML/PHP includes, duplicate selector hotspots, inline-style hotspots, first safe consolidation pass

## 1. Static include map

CSS referenced by HTML/PHP:

- `assets/css/style.css` x15
- `assets/css/admin.css` x5
- `assets/css/modal-universal.css` x2
- `assets/css/order-enhanced.css` x2
- `assets/css/auth.css` x2
- `assets/css/profile.css` x1
- `assets/css/profile-enhanced.css` x1
- `assets/css/delivery.css` x1
- `assets/css/delivery-dashboard.css` x1

JS referenced by HTML/PHP:

- `assets/js/config.js` x15
- `assets/js/header-manager.js` x7
- `assets/js/admin.js` x5
- `assets/js/frontend.js` x4
- `assets/js/cart.js` x3
- `assets/js/order-enhanced.js` x2
- `assets/js/auth.js` x2
- `assets/js/modal-universal.js` x2
- `assets/js/live-streaming.js` x2
- `assets/js/menu-likes.js` x2
- `assets/js/menu-media.js` x2
- `assets/js/menu-videos.js` x2
- `assets/js/social-sync.js` x2
- `assets/js/notifications.js` x2

## 2. Files from the requested list not referenced statically

CSS not referenced in HTML/PHP:

- `assets/css/custom.css`
- `assets/css/customize-order.css`
- `assets/css/dashboard.css`
- `assets/css/dropdowns.css`
- `assets/css/order.css`
- `assets/css/orders.css`

JS not referenced in HTML/PHP:

- `assets/js/admin-dashboard.js`
- `assets/js/anti-bybit-shield.js`
- `assets/js/app.js`
- `assets/js/auths.js`
- `assets/js/dashboard.js`
- `assets/js/delivery-options.js`
- `assets/js/extension-protection.js`
- `assets/js/header-scroll.js`
- `assets/js/image-config.js`
- `assets/js/main.js`
- `assets/js/order-manager.js`
- `assets/js/orders-enhanced.js`
- `assets/js/product-modal.js`
- `assets/js/recipes-live.js`
- `assets/js/scroll-animations.js`

Note:

- This is a static include audit only.
- Some of these files may still be loaded dynamically or be legacy candidates kept for future migration.

## 3. Duplicate selector hotspots across active CSS

Highest-risk shared selectors found in more than one active stylesheet:

- `.form-group`
  Active in: `admin.css`, `auth.css`, `delivery.css`, `delivery-dashboard.css`, `order-enhanced.css`, `profile.css`, `profile-enhanced.css`, `style.css`
- `.btn`
  Active in: `admin.css`, `auth.css`, `delivery.css`, `delivery-dashboard.css`, `profile.css`, `profile-enhanced.css`, `style.css`
- `.btn-primary`
  Active in: `admin.css`, `auth.css`, `delivery.css`, `delivery-dashboard.css`, `profile.css`, `profile-enhanced.css`, `style.css`
- `.btn-outline`
  Active in: `admin.css`, `auth.css`, `delivery-dashboard.css`, `profile.css`, `profile-enhanced.css`, `style.css`
- `.form-input`
  Active in: `admin.css`, `auth.css`, `delivery.css`, `delivery-dashboard.css`, `style.css`
- `.form-row`
  Active in: `admin.css`, `auth.css`, `delivery-dashboard.css`, `style.css`
- `.status-badge`
  Active in: `admin.css`, `delivery.css`, `delivery-dashboard.css`, `style.css`
- `.product-card`
  Duplicated inside `style.css`, also present in `dashboard.css` from the broader repository
- `.menu-card`
  Duplicated inside `style.css`, also present in `order-enhanced.css` and `order.css`
- `.modal`
  Duplicated inside `style.css`, also present in `modal-universal.css`

## 4. JS inline-style hotspots

Files with the most inline CSS / direct style mutations:

- `assets/js/admin.js` 34
- `assets/js/frontend.js` 34
- `assets/js/delivery.js` 32
- `assets/js/header-manager.js` 26
- `assets/js/app.js` 25
- `assets/js/admin-fixes.js` 22
- `assets/js/premium-interactions.js` 19
- `assets/js/auths.js` 17
- `assets/js/orders-enhanced.js` 16
- `assets/js/menu-videos.js` 14

## 5. Changes applied in this pass

### `assets/js/admin.js`

- Fixed a broken `DOMContentLoaded` block that left `admin.js` syntactically invalid.
- Kept driver filter bindings and initial section bootstrapping inside the init block.
- Removed inline `style=` fragments for:
  - JSON modal content
  - driver document preview blocks
  - admin dashboard quick-action wrappers
  - menu/product table thumbnails
  - hidden category inputs
  - hidden file inputs
  - order customer name/email formatting

### `assets/css/admin.css`

- Added reusable utility classes used by `admin.js`:
  - `.json-view`
  - `.detail-help-text`
  - `.detail-empty`
  - `.detail-actions`
  - `.detail-doc-*`
  - `.table-thumb`
  - `.new-category-input`
  - `.file-input-hidden`
  - `.order-customer-name`
  - `.order-customer-email`
- Removed a duplicate `.form-group label` declaration inside the same file.
- Kept modal scroll lock and modal presentation improvements from the current branch state.

## 6. Phase 2 normalization applied

### Shared UI foundation

- Added `assets/css/ui-primitives.css` as a shared base layer for:
  - `.btn`, `.btn-primary`, `.btn-outline`, `.btn-block`, `.btn-sm`
  - `.form-group`, `.form-group.full-width`
  - `.form-input` and grouped inputs/selects/textareas
- The base layer is token-driven through `--ui-*` variables so each page can keep its own visual identity without redefining the same selectors.

### Files converted to variable overrides

- `assets/css/style.css`
  - now imports `ui-primitives.css`
  - removed duplicate global `.btn`, `.btn-primary`, `.btn-outline`, `.btn-block`
  - removed duplicate global `.form-group` field styling
  - scoped older `.form-input` and `.form-group` blocks to contact-specific containers to stop leaking into profile/auth/delivery pages
- `assets/css/auth.css`
  - now imports `ui-primitives.css`
  - moved auth button/input sizing and colors into `--ui-*` variables
  - kept only auth-specific variants such as `.btn-secondary`
- `assets/css/profile.css`
  - replaced local `.btn`, `.btn-primary`, `.btn-outline`, `.form-group`, `.form-input` definitions with profile-scoped `--ui-*` variables
  - removed a second legacy `.btn*` duplicate block
- `assets/css/profile-enhanced.css`
  - replaced local button/form primitives with `--ui-*` overrides
- `assets/css/delivery.css`
  - replaced local button/form primitives with `--ui-*` overrides
- `assets/css/delivery-dashboard.css`
  - replaced duplicate button/form primitives with `--ui-*` overrides
  - kept only dashboard-specific button effects (`.btn::before`) and semantic variants (`.btn-success`, `.btn-danger`)

### Result

- Shared primitives now have one canonical implementation.
- Remaining button/form rules in the targeted files are contextual variants rather than full redefinitions.
- The main remaining CSS cleanup work is component-level (`.menu-card`, `.product-card`, `.modal`, etc.), not base-form/button primitives.

## 7. Recommended next phases

1. Normalize shared primitives:
   complete the same tokenization pattern for remaining shared utilities such as `.form-row`, `.status-badge`, `.card`, and modal shells.

2. Split contextual components:
   rename context-specific collisions such as `.menu-card`, `.product-card`, `.stat-card`, `.order-summary` into page-scoped variants where the visual intent differs.

3. Reduce `style.css` surface area:
   `style.css` is the dominant file by size and currently mixes landing page, modal, order, profile and utility rules.

4. Remove or archive inactive files:
   only after validating there is no dynamic loading path for the inactive CSS/JS listed above.
