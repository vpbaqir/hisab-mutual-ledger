# Hisab: Mutual Ledger

Build a production-ready mobile-first PWA called Dealit

A mutual debt tracker for small borrowing and lending between friends and family.

Core philosophy

This is not a banking app, accounting app, or loan marketplace.

It is a shared digital ledger where two people mutually record money given and money returned.

A transaction is valid only when both users confirm it.

Target amounts: ₹100 – ₹10,000

Design should be extremely simple, modern, and trustworthy.

Tech Stack

Use:

Next.js 15

React

TypeScript

Tailwind CSS

shadcn/ui

Supabase

PostgreSQL

Phone OTP Authentication

PWA support

Firebase Cloud Messaging for notifications (prepare structure)

Generate all code, database schema, and API integration.

Authentication

Login only with:

Phone number

OTP verification

User profile fields:

id

full_name

phone

avatar (optional)

created_at

No passwords.
No KYC.
No government ID.

Database

profiles

id (uuid)

full_name

phone

avatar_url

created_at

transactions

id

lender_id

borrower_id

amount

note

created_at

due_date

status

Status enum:

pending

active

partial

settled

disputed

rejected

confirmations

id

transaction_id

user_id

type (create / repayment)

confirmed

confirmed_at

repayments

id

transaction_id

amount

initiated_by

status

created_at

identity_snapshots

Store immutable details after both confirm:

transaction_id

user_id

name_snapshot

phone_snapshot

avatar_snapshot

Never overwrite snapshot data.

Business Rules

Rule 1

Creating a transaction does NOT activate it.

Workflow:

Create

↓

Pending

↓

Both confirm

↓

Active

Rule 2

Both users must confirm repayment.

Workflow:

Borrower records return

↓

Lender confirms

↓

Balance updates

Rule 3

Original amount never changes.

Remaining balance is calculated from confirmed repayments.

Rule 4

Identity is locked after activation.

Changing profile later must NOT affect previous transactions.

Screens

1. Splash

Minimal logo

Hisab

Subtitle:

Both agree. Both see the record.

2. Login

Phone number

OTP

Continue

3. Home

Show four cards:

Money to Receive

Money to Return

Pending Requests

Overdue

Below:

Recent Transactions

Floating Action Button:

+ Add

4. Add Transaction

Question:

What happened?

Two buttons:

🟢 I Gave Money

🟠 I Borrowed Money

Fields:

Other person's name

Phone number

Amount

Due date

Optional note

Button:

Send for Confirmation

5. Requests

Two tabs:

Received

Sent

Each request card shows:

Person

Amount

Date

Status

Buttons:

Confirm

Reject

6. Transaction Details

Header:

Person

Large amount

Status badge

Cards:

Original Amount

Returned

Remaining

Due Date

Confirmation status

Timeline:

Transaction created

Confirmed by both

Repayments

Settlement

Bottom button:

Record Return

7. Record Return

Amount

Today

Submit

Status becomes:

Waiting for confirmation

8. People

List every contact.

Each card:

Avatar

Name

Net balance

Number of transactions

Open profile shows all shared transactions.

9. Settings

Profile

Notifications

Dark mode

Export data

Privacy

About

Notifications

Trigger notifications for:

New transaction request

Transaction confirmed

Repayment awaiting confirmation

Due tomorrow

Overdue

Fully settled

WhatsApp Sharing

When creating a transaction:

Generate a secure invite link.

Use native WhatsApp share.

Message:

Baq invited you to confirm a ₹500 money transaction in Hisab. Open the secure link to review and confirm.

Do NOT expose amount or phone in URL parameters.

UI Style

Apple-quality minimal design.

Use:

Rounded 2xl cards

Soft shadows

White background

Green for receive

Orange for borrow

Red for overdue

Gray for pending

Typography:

Inter

Large bold numbers

Clean spacing

Bottom navigation

Icons:

Lucide React

Security

Use Supabase Row Level Security.

Users may only read/write transactions where:

user.id == lender_id

OR

user.id == borrower_id

Never expose other users' data.

Empty States

Home:

No transactions yet

"Record your first borrowing or lending."

People:

No contacts yet

Requests:

Nothing waiting

Use beautiful illustrations/placeholders.

Sample Demo Data

Create demo users:

Baq

Ahmed

Ali

Example transactions:

Ahmed owes Baq ₹500 (active)

Baq owes Ali ₹1,000 (pending)

Rahman repaid ₹300 (settled)

Deliverables

Generate:

Complete UI

Responsive mobile layout

Supabase SQL schema

Authentication

Database queries

Row Level Security policies

TypeScript types

Realtime updates

PWA manifest

Production-ready folder structure

The app should feel polished enough to publish as version 1.0.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/64192488-63df-4c16-ae70-3b2f83c94e78).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
