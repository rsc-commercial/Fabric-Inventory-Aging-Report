# Fabric & Leather Inventory Aging & Liability Dashboard

An enterprise dashboard for monitoring monthly fabric, leather, and upholstery cover inventory valuation, statutory tax liabilities (12% Import Duty, 8% VAT), aging distribution, and 4-month demand projections at Rochdale Spears Co.

Live automated deployment to Azure Static Web Apps, restricted to authorized staff.

---

## Business Logic & Calculation Rules

### 1. Scope & Filtering (per NOTES.md)
- **Product Groups**: Raw Materials (`RM_FABRIC`, `RM_LEATHER`, `RM_PU/PVC`, `RM_UPACCES`, `RM_BARRIER`).
- **Material Prefix Filtering**: Restricted to upholstery cover codes starting with `LH-01` (Leather), `LH-03` (Fabric), and `LH-07` (Microfiber / Other Covers).
- **Location Exclusion**: Filtered out locations containing `-DEFECT` and `UPH WIP`.
- **Quantity Basis**: Physical on-hand inventory (`PHYSICALINVENTORY`).

### 2. Standard Cost Valuation & Customer Mapping
- **Standard Costs**: Mapped from Dynamics 365 Supply Chain Management (`InventOnhandItem`). Items designated as Customer's Own Material (`COM`) carry $0.00 standard cost liability.
- **Customer Program**: Mapped from enterprise cross-reference table (`RM to Customer.xlsx`) into dedicated programs (RH, HS, Sonder, Arhaus, Soho, etc.).

### 3. Aging Buckets & Financial Liability
- **Aging Tiers**:
  - `0 - 3 months` (0 to 89 days)
  - `3 - 6 months` (90 to 179 days)
  - `6 - 12 months` (180 to 359 days)
  - `12 - 24 months` (360 to 719 days)
  - `+24 months` (720+ days)
- **Statutory Taxes**:
  - `Total Cost` = `PHYSICALINVENTORY` x `Standard Cost`
  - `Import Duty` = `Total Cost` x 12%
  - `VAT` = (`Total Cost` + `Import Duty`) x 8%
  - `Total After Tax` = `Total Cost` + `Import Duty` + `VAT`

### 4. 4-Month Raw Material Stock Projection
- **Formula**: `Ending Stock (M)` = `Starting Stock` + `Inbound (Registered PO)` - `Monthly Allocated Demand`
- **Horizon**: November 2026, December 2026, January 2027, and February 2027.
- **AWS (Average Weeks of Stock)**: Measured against forward average weekly demand.

---

## Architecture & Tech Stack

- **ETL Data Pipeline**: Python 3 (`scripts/build_data.py`) reading source workbooks and generating normalized `inventory_data.json`.
- **Frontend Dashboard**: React 18, Vite 6, Tailwind CSS. Built to zero-dependency static assets (`base: './'`).
- **Antislop Compliance**: Purposeful UI adhering strictly to Mode 1 guidelines (WCAG AA $\ge$ 4.5:1 contrast, zero AI filler or placeholder buzzwords, resilient loading/empty states, keyboard accessibility with visible focus rings).
- **CI/CD Deployment**: GitHub Actions workflow (`.github/workflows/azure-static-web-apps.yml`) builds and deploys to Azure Static Web Apps on every push to `main`.
- **Access Control**: Entra ID sign-in gated on the `rsc_reader` role. See [Access Control](#access-control).

---

## Access Control

The site is hosted on the Azure Static Web Apps **Free** plan. Every route requires sign-in
and the `rsc_reader` role, enforced by `public/staticwebapp.config.json`.

The Free plan uses the preconfigured Entra ID provider, which accepts **any** Microsoft
account. Tenant restriction is not available without upgrading to Standard, so access is
controlled by invitation rather than by tenant. Two consequences to be aware of:

- An outside account can complete sign-in, but sees only the "Access not authorized" page,
  and cannot download `inventory_data.json` — the role gate covers every route, including
  static assets.
- Access is per-user and must be granted manually. The Free plan caps this at 25 invitations.

### Granting access to a user

1. Azure portal → the Static Web App resource → **Settings → Role Management**.
2. Select **Invite**, provider **Microsoft Entra ID**.
3. Enter the user's work email, domain, and role `rsc_reader`. Invitations expire within
   7 days, so send the generated link promptly.
4. To revoke, delete the user's row. Changes propagate within a few minutes.

### Removing a user

Deleting a role assignment invalidates access, but the user's browser holds a signed auth
cookie until it expires. To cut off immediately, rotate the deployment token and redeploy.

---

## Local Development

```bash
# 1. Run data ETL pipeline
python scripts/build_data.py

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Compile static production build
npm run build
```

---

## First-time Azure Setup

These are one-time portal steps. The workflow file is committed, but the Azure resource
and its deployment token are not — they must exist before the first deploy.

1. **Create the Static Web App.** Azure portal → *Create a resource* → *Static Web App*.
   Plan **Free**, source **GitHub**, repository `rsc-commercial/Fabric-Inventory-Aging-Report`,
   branch `main`.
2. **Set the build locations.** On the *Build* tab: App location `/`, API location empty,
   Output location `dist`. Azure will commit its own generated workflow — delete it, since
   `.github/workflows/azure-static-web-apps.yml` supersedes it and already runs the Python ETL.
3. **Copy the deployment token.** Resource → **Overview → Manage deployment token**. In GitHub:
   *Settings → Secrets and variables → Actions → New repository secret*, named
   `AZURE_STATIC_WEB_APPS_API_TOKEN`.
4. **Delete the Pages workflow.** Remove `.github/workflows/deploy.yml` so pushes stop
   targeting GitHub Pages.
5. **Make the repository private.** *Settings → General → Danger Zone → Change visibility*.
   Requires Azure to be live first — a private repo cannot serve GitHub Pages on the
   GitHub Free plan, so the site would otherwise go dark.
6. **Invite the first user** (see [Access Control](#access-control)) and confirm the site
   loads for them, not just for you.

### Verifying a deploy

The workflow reports the site URL on success. Confirm the gate actually works by opening
the site in a private browser window — you should get the Entra sign-in page, and
`/<site>/inventory_data.json` should redirect to sign-in rather than return JSON.

