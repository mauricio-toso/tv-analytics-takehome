# Session 03 — harness execution

Append-only record of every task run through the `sdd-loop` harness: architect passes, implementer
dispatches, validator verdicts (PASS **and** FAIL, verbatim), and the commands handed to the human.
Written by the orchestrator as work happens, not reconstructed afterwards.

Entry format:

```
### <T-nn> · attempt <n> · <implementer|validator|architect|human-command> · <PASS|FAIL|BLOCKED|REFINED|AWAITING>
<verbatim verdict / evidence / diagnosis / command + human-reported output>
```

Model policy in force: implementer and validator on sonnet; task-architect on the session model.

---

_(no runs yet — first entry will be the Phase 0 architect pass)_
