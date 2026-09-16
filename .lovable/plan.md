# Dealit — In-app confirmation as the default (WhatsApp optional)

## What the user wants
After adding a transaction, the app currently opens WhatsApp automatically. The user wants confirmation to work fully inside Dealit, so people who don't want to share on WhatsApp never have to. WhatsApp sharing stays, but as an optional extra.

## Changes

### 1. Add flow — stop forcing WhatsApp (src/routes/_authenticated/add.tsx)
- After "Send for Confirmation" succeeds, do NOT auto-open WhatsApp.
- If the other person's phone matches an existing Dealit user, navigate straight to Requests and show: "Sent — {name} will see it in their Requests."
- If the phone has no Dealit account yet, show a small follow-up step: "Invite {name} to Dealit" with an optional "Share on WhatsApp" button (opens WhatsApp only when tapped) and a "Done — I'll tell them later" link that goes to Requests.

### 2. Transaction detail & Requests — optional share buttons
- On a pending transaction (details page and Requests card), add a subtle "Remind on WhatsApp" share button for the person waiting on confirmation. Tapping is optional; the in-app request remains the source of truth.
- Keep the secure invite link unchanged (no amount or phone in the URL).

### 3. Wording cleanup
- Update the helper text under the add button from "A secure link is shared on WhatsApp…" to explain that the other person gets an in-app request, and WhatsApp sharing is optional.

## What stays the same
- Mutual-confirmation rules, RLS, invite tokens, demo data, and all other screens. No database changes needed.

## Technical notes
- `useCreateTransaction` already returns the created transaction and resolves the counterparty user id by phone; the add page will branch on whether that match exists.
- WhatsApp message text and `whatsappMessage()` stay as-is, reused by the optional share buttons.

## Verification
- Playwright pass: add a transaction for an existing user → confirm no WhatsApp popup, request appears in the other account's Requests; add for an unknown phone → invite step shows with optional share; confirm/reject flows still work.
