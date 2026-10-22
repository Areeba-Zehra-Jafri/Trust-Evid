# Agent rules (read these every session)
1. Read context.md first. It overrides your assumptions and older notes.
2. Your file reader truncates. For any file over ~150 lines, read it in line ranges and say explicitly if a read was cut off. Never describe code you did not fully see. Say UNVERIFIED instead.
3. Never claim something works unless you saw evidence (log, test output, DB result). You cannot run builds or SQL, so say "needs user to verify".
4. One task per message. Write whole files when asked, verbatim.
5. After any change, reply with: files changed, then the last 5 lines of each file written.
6. Do not invent features, tables, columns or env vars. If something is missing, ask.
7. Do not touch custody_events grants, RLS policies or migrations. Provide SQL as text for the user.
8. Never display "authentic" or "valid" without a real check behind it.
-----