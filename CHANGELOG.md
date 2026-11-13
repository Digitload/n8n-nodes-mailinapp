# Changelog

## 0.5.0

- `MailInApp` node: Deal **Get Many**. Lists your deals, most recently moved
  first, and filters by contact email, status (open, won or lost) or
  pipeline. Use it to find a contact's deal from an address a trigger gives
  you, then pass its ID to Deal **Update** (the same as Zapier's Find Deal).

## 0.4.0

- `MailInApp Trigger` node: new event Response Completed, sent once a
  recipient has answered every block an email counts.

## 0.3.0

- `MailInApp` node: new Experiment resource. **Get** reads one A/B
  experiment (the analysis engine's latest result and any recorded
  decision), optionally with its full report. **Get Many** lists them,
  filtered by status and kind. Read-only: locking, launching and deciding
  stay in MailInApp.
- Deal **Update** picks the deal from a dropdown, and Email **Send
  Transactional** from a studio project picks the project from one (both
  still take a mapped ID).

## 0.2.0

- `MailInApp Trigger` node: new events Experiment Decided and Experiment
  Results Ready.

## 0.1.1

- Node categories use n8n's current names ("Marketing & Content" instead of
  "Marketing"). This fixes the verification pre-check.

## 0.1.0

- First version. `MailInApp` node: contacts (create or update, get), contacts
  lists, deals (create, update), transactional email, journeys (enroll, get
  many) and pipelines. Usable as an AI-agent tool.
- `MailInApp Trigger` node: every MailInApp webhook event, subscribed on
  activation and unsubscribed on deactivation, with signature checks.
- An AI-agent example workflow that uses the MailInApp MCP server.
