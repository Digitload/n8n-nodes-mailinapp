# Changelog

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
