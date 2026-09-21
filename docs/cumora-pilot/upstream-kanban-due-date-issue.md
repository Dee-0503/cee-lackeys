## Problem

In our v0.18.6 self-hosted pilot, Kanban works well as an agent work board, but cards do not have a structured due date. This also makes it difficult to track work assigned to a human: the date can be written in a description, but it cannot be consistently displayed, queried, or updated by agents.

For example, a human receives “submit the proposal by Friday.” The card can have an assignee and a status, but the human cannot see a native due-date field, and an agent cannot reliably query the task as due or overdue. A separate calendar event does not currently give the card a shared due-date value.

## Smallest useful proposal

Would optional due dates on existing Kanban cards fit Cumora's product direction?

A bounded first version could provide:

- An optional due date on a card, with clear semantics for date-only versus a specific time/time zone.
- A date picker and clear-date action in card details, plus a visible due/overdue indicator on cards. Completed cards should not be presented as overdue work.
- Matching API and native `cumora card` operations to read, set, change, and clear the date, so human and agent edits use the same value.
- Basic due-date sorting or filtering if that fits the existing board UI.

Cards without dates should keep their existing behavior. This would apply to both human-assigned and agent-assigned cards.

## Scope boundary

This proposal does not require a separate personal task product, a “My Day” screen, recurring tasks, or automatic reminders. Calendar/reminder linkage could be considered separately after the card field and semantics are settled. In particular, adding a date should not implicitly promise notification delivery.

For the official mobile clients, it would be helpful to know whether this belongs in a shared UI/API change shipped through the normal release process; changing a self-hosted web deployment alone does not update the official iOS app's bundled UI.

## Questions before implementation

1. Does this small extension fit the intended Kanban direction, or should personal deadlines live in an external task manager?
2. Should a first version support date-only deadlines, or both dates and exact times?
3. If this fits, would a narrowly scoped contribution covering schema, API/CLI, shared UI, and tests be welcome?

Related: #69 and #96 established the importance of keeping card state consistent with actual work. This request concerns the time dimension of those same cards, rather than replacing the existing agent coordination model.
