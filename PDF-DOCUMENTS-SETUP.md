# PDF quotes, invoices and receipts

## Install
1. Copy this cumulative patch into the repository root, replacing matching files.
2. In Supabase SQL Editor run `supabase/v20-12-41-pdf-documents.sql` BEFORE deployment. Existing quote/email migrations, including v20-12-35, must already be installed. Supported Artist v39/v40 setup is unchanged.
3. Commit package.json and package-lock.json along with the code. Vercel installs the two PDF dependencies during deployment. Local installs: npm ci.
4. Confirm issuer details in Vercel environment variables, then deploy:
   - INVOICE_BUSINESS_NAME: defaults to Silkcrayon Studios.
   - INVOICE_BUSINESS_ADDRESS: defaults to STUDIO_ADDRESS if set, otherwise Portland House, Bute Street, Cardiff CF10 5EQ.
   - INVOICE_BUSINESS_EMAIL: defaults to info@silkcrayon.com.
   - INVOICE_BUSINESS_DETAILS: optional additional issuer details (for example the legal proprietor/company name and company number).
   Existing RESEND_API_KEY, EMAIL_FROM and email logging setup are reused.

## Where to use it
- OS > Projects & quotes > open a project: Download saved quote PDF. Save edits first. The existing Send quote action now attaches that same saved quote as a PDF and logs delivery in Automations.
- OS > open a booking/session: Download invoice / receipt PDF, Email PDF to customer, and Previously generated PDFs. Engineers have access only to sessions assigned to them; project quotes remain owner-managed.
- My Studio > Your quotes, invoices & receipts: customers can download booking documents and quote versions actually sent to them. Unsent owner drafts are hidden. Documents are also on the individual booking page.

## Automatic attachments
Customer booking confirmations, admin-created booking confirmations, payment-link messages and balance reminders include the corresponding PDF. Marking a booking paid manually sends a receipt email. Stripe booking confirmation flows use the same attachment handler. Existing confirmations are not mass resent when deploying.

## Amounts and document history
- Quote: itemised saved project prices, scope, handover, exclusions and timing. Quotes retain the existing reply-to-confirm workflow; no new payment/acceptance mechanism is implied.
- Invoice: booking amount, payments already received (including recorded deposits) and balance due. An existing HTTPS balance-payment link is clickable in the PDF.
- Paid invoice / receipt: fully paid booking, with recorded refunds shown separately.
- Credit- or project-funded booking: session statement, explicitly showing no new cash receipt. A project session statement does not invoice the entire project.
- Separately billed extras, standalone payment links, mix jobs and prepaid-hour purchases retain their existing billing; they are not folded into a booking PDF or represented as additional payments against that booking.
- PDFs use saved booking amounts, including supported-artist rates. They do not recalculate prices from current studio defaults.
- Distinct snapshots get unique SC-Q/I/R/S numbers. Repeating the same document reuses its number and saved issue date. A changed booking balance or quote produces another snapshot; earlier snapshots remain downloadable. Sent quote emails retain their exact PDF snapshot reference.
- Current documents show recorded refund totals. This update does not produce tax credit notes or calculate VAT; amounts are the stored GBP charges. Do not treat these as VAT invoices.

## Failure handling and verification
A PDF failure is logged as booking_pdf_failed; the booking confirmation still sends so a document-generation problem does not block a paid booking. Use Email PDF to customer after correcting the issue. Quote delivery fails visibly if its PDF cannot be generated and can be retried. Email actions use the existing message_activity audit trail/Automations. Resending a document is explicit; the endpoint always uses the stored customer email, never a browser-supplied recipient.

Validated: PDF financial cases and route permissions; customer/engineer isolation; unsent draft denial; CSRF on manual email; email attachment payload; quote-version duplicate guard; migration repeatability, sequence uniqueness and anonymous denial in isolated PostgreSQL; PDF sample rendering including long multi-page quotes. No live email, Stripe payment or production database was used for testing.

Presentation update: tightened PDF spacing to keep standard quotes on one page; quote and manual document emails use a white card with purple accents and explain the attachment. The browser address is the domain used to open the OS; use https://silkcrayon.com/admin for the custom domain.
