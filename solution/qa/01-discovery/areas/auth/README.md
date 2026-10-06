# Area: auth - summary
See endpoints.json (17 entries, 16 verified), flows.md, notes.md. Main risks: no CSRF on login/address/recovery, 500 on missing token, account enumeration, logout does not invalidate the cookie, delete via GET, backinstocksubscriptions not gated. Throwaway accounts created (cannot be deleted): see notes.md.
