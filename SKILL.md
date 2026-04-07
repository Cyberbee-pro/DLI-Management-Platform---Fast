# F.A.S.T. DLI Platform - AI Developer Skills & Mandates

You are an expert Full-Stack Architect building the F.A.S.T. DLI Platform. You must strictly adhere to the following architectural, stylistic, and business logic constraints.

## 1. TECH STACK
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React.
- **Backend:** Node.js, Express.js, JSON Web Tokens (JWT).
- **Database:** Native `mongodb` Node.js driver. 

## 2. BACKEND MANDATES (CRITICAL)
- **NO ORMs/ODMs:** Mongoose is STRICTLY BANNED. You must use the official `mongodb` Node.js driver.
- **Validation:** All collections must be initialized and validated at the database level using `$jsonSchema`. Do not use application-level schema wrappers.
- **Point Economy:** Standard JavaScript floating-point math is banned for user balances and task multipliers to prevent precision errors. You MUST use the `Decimal128` BSON type via `src/utils/decimal.utils.js`.
- **Transactions:** Any operation that modifies more than one collection (e.g., Approving a Course, Claiming a Task) MUST be wrapped in a strict MongoDB session transaction (`session.startTransaction()`).
- **Audit Logging:** Every state-changing action must generate an immutable entry in the `auditlogs` collection tracking the `action`, `actor`, `target`, and `metadata`.
- **Environment:** Always use `JWT_ACCESS_SECRET` for tokens. Never hardcode ports or URIs.

## 3. FRONTEND MANDATES
- **No Hardcoded APIs:** All data fetching must use `process.env.NEXT_PUBLIC_API_URL`.
- **Modular Data:** Never hardcode arrays for Ranks, Categories, or Difficulties in the UI. Always import them from `src/config/constants.ts`.
- **Design System:** - **Theme:** Strict Dark Mode. Backgrounds should be deep neutrals (`#0a0a0a` to `#141414`).
  - **Accent Color:** Neon "NVIDIA" Green (`#a3e635`, `text-lime-400`, `bg-lime-500`). Use for active states, primary buttons, and positive indicators.
  - **Typography:** Sans-serif for UI, Monospace for node IDs, timestamps, and tech specs.
- **Components:** Use functional React components, hooks, and clean Tailwind utility classes. Avoid heavy third-party UI libraries unless absolutely necessary; build custom using Tailwind.

## 4. DOMAIN LOGIC & THE "WORK-TO-LEARN" ECONOMY
- **The Loop:** Members claim technical Tasks -> Submit Proof of Work -> Admins approve -> Members earn XP -> Members spend XP on premium DLI Courses.
- **Hot Bounties:** Tasks flagged as "Urgent" automatically receive a 1.5x or 2.0x multiplier to their base points.
- **Sub-Roles:** The system uses a flat hierarchy. "Members" can be assigned to `projects` as a "Project Lead", granting them scoped admin rights to approve tasks *only* within their specific squad.
- **Inventory Protection:** DLI codes must be atomically verified as `isUsed: false` and reserved during the approval transaction to prevent double-spending.