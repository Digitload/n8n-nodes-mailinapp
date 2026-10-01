# n8n-nodes-mailinapp

[MailInApp](https://mailinapp.com) nodes for [n8n](https://n8n.io): keep
contacts and deals in sync, enroll contacts in journeys, send transactional
email, and start workflows when something happens in MailInApp.

- [Installation](#installation)
- [Credentials](#credentials)
- [MailInApp node](#mailinapp-node)
- [MailInApp Trigger node](#mailinapp-trigger-node)
- [Use with an AI agent](#use-with-an-ai-agent)
- [Compatibility](#compatibility)

## Installation

In n8n, go to **Settings → Community Nodes → Install** and enter
`n8n-nodes-mailinapp`. See n8n's
[community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

1. In MailInApp, open **Dashboard → Developers** and create an API key. It
   starts with `mia_live_` and is shown once.
2. In n8n, create a **MailInApp API** credential and paste the key. Leave
   **Base URL** as `https://mailinapp.com`.

The key acts as the whole MailInApp account, so treat it like a password.
Revoking it in MailInApp also turns off every trigger subscription it
created.

## MailInApp node

| Resource | Operations |
| --- | --- |
| Contact | **Create or Update**: add an address to a contacts list, or update its fields. MailInApp verifies the address as it saves it, and never marks a contact as consented. **Get**: the address's row in every list, or in one. |
| Contacts List | **Get Many**: lists with their fields and row counts. |
| Deal | **Create** on a contact (by email). Set an **Idempotency Key** (e.g. an order ID) so a retried run doesn't create a second deal. **Update**: move to another stage, won and lost included, or change the title, value or currency. |
| Email | **Send Transactional**: your own subject and HTML/text, or a studio project (interactive blocks included) with merge data. A `failed` send is an error. A `suppressed` one (the address bounced or is invalid) is a normal result you can branch on. |
| Journey | **Enroll Contact** in a journey whose trigger is "API". **Get Many**. |
| Pipeline | **Get Many**: deal pipelines and their stages. |

Marketing sends aren't offered: a workflow can't prove the recipient's
consent. Send marketing email from MailInApp itself, or enroll the contact in
a journey.

## MailInApp Trigger node

Pick one or more events. When the workflow is activated, the node subscribes
to them in MailInApp. When it's deactivated, the subscription is removed. You
can see the subscriptions under **Dashboard → Developers → Webhooks**.

| Event | When |
| --- | --- |
| Interaction Received | A recipient votes in a poll, answers a quiz, clicks a tracked button, and so on. |
| Form Submitted | A form in an email, or a signup form, is submitted. |
| Contact Created / Contact Updated | A contact is added to a list, or its fields change. Bulk imports of more than 500 rows don't fire. |
| Lead Turned Hot | A contact's engagement score crosses your hot-lead threshold. |
| New Lead | A new lead arrives from a signup form or a form in an email. |
| Meeting Booked / Meeting Cancelled | A meeting is booked from an email, or cancelled. |
| Deal Created / Deal Stage Changed | A deal is created, or moves stage (won and lost included). |
| Purchase Completed | A recipient buys from an email. |
| Journey Completed | A contact reaches the end of a journey. |

Each run gets the event as MailInApp sent it:

```json
{ "id": "evt_…", "type": "deal.stage_changed", "createdAt": 1790000000000, "data": { … } }
```

`id` is the same for every delivery of one event, so you can use it to
deduplicate retries. A **Send test** from the dashboard carries the event's
sample data with `"test": true` added to `data`.

Every delivery is signed. The node rejects any request whose
`X-MailInApp-Signature` doesn't match the subscription's secret, or whose
timestamp is more than 5 minutes off, so knowing the webhook URL isn't enough
to start your workflow.

## Use with an AI agent

The MailInApp node is usable as a tool for n8n's **AI Agent**. For a broader
toolset, connect the agent to MailInApp's MCP server too.
[`examples/ai-agent-mcp.workflow.json`](examples/ai-agent-mcp.workflow.json)
is a ready-made workflow. Import it, then:

1. **MailInApp MCP** (an *MCP Client Tool* node): create a **Bearer Auth**
   credential holding your MailInApp API key. The endpoint is
   `https://mailinapp.com/api/mcp`.
2. **Find contact by email** (this package's node, as a tool): pick your
   MailInApp API credential.
3. **Anthropic Chat Model**: pick your Anthropic credential, or swap in any
   other chat model.

The example lets the agent read contacts, results, form responses, segments
and journeys, and draft new journeys. It has no tool that sends email.
MailInApp saves agent-built journeys turned off, so a person reviews and
turns them on.

## Compatibility

Built with `@n8n/node-cli` 0.50.4 and tested against `n8n-workflow` 2.41. It
has no runtime dependencies.

---

## Maintaining this package

This section is for MailInApp developers. The package lives in the MailInApp
monorepo at `integrations/n8n-nodes-mailinapp/` (`LEAD_FLYWHEEL_PLAN.md`
10.4), next to the Zapier app (`integrations/zapier/`). It's a pure client of
the public API (`/api/v1`, `public/openapi.json`) with no MailInApp code
inside. It's a separate package with its own lockfile, and the Next.js build,
`tsconfig.json` and ESLint config all exclude it.

```sh
cd integrations/n8n-nodes-mailinapp
npm install --ignore-scripts   # skips isolated-vm's native build (needs Node 24) in the dev-only n8n CLI
npm test                       # builds, then node:test against fake n8n contexts
npm run lint                   # n8n's community-node rules, the ones n8n Cloud verification uses
npm run dev                    # a local n8n on :5678 with these nodes loaded
```

- **Event catalog copy.** `nodes/shared/events.ts` mirrors
  `src/lib/webhooks/events.ts`. The web app's
  `src/lib/webhooks/n8nCatalog.test.ts` fails until a new event type is added
  there, and also checks that the example workflow only selects MCP tools
  the server still registers.
- **API contract.** `test/nodes.test.js` checks every route the nodes call
  against `../../public/openapi.json`. That's why the tests only run inside
  the monorepo.
- **Icons.** `icons/*.svg` are generated from `public/mark.svg` by
  `npm run gen:brand`. Don't edit them.
- **Lint autofix.** `n8n-node lint --fix` rewrites descriptions it can't read
  statically, so keep parameter descriptions as string literals.

### Publishing

Since May 2026, n8n only verifies community nodes that npm published from
GitHub Actions with provenance. npm can't generate provenance for a private
repository, and the monorepo is private. So the package is published from its
own public repository, which `package.json`'s `repository` already names:

1. **Create the public repo** `Digitload/n8n-nodes-mailinapp` and push this
   directory's contents to its root. `.github/workflows/publish.yml` then
   becomes live. Drop `test/` from the mirror, or vendor `openapi.json` into
   it, because the tests read it from the monorepo.
2. **Set up npm publishing.** Claim `n8n-nodes-mailinapp` on npm under the
   MailInApp account, then add the repo as a Trusted Publisher
   (`publish.yml`, no environment). The workflow's header explains how.
3. **Release.** Bump `version` and `CHANGELOG.md` here and copy the change to
   the mirror. Tag it there (`0.1.0`, no `v` prefix) and push the tag. The
   workflow lints, builds and publishes with provenance.
4. **Submit for verification** in the
   [n8n Creator Portal](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).
   Verified nodes can be installed on n8n Cloud.
5. **Update the docs.** Rewrite the n8n docs page (`LEAD_FLYWHEEL_PLAN.md`
   11.1) to link the npm package.
