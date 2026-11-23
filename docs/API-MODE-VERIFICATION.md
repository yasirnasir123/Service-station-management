# Isolated API adapter browser verification

The browser test suite's main flow uses DemoAdapter. To inspect real API failure isolation manually: sign in with the local seeded API account, confirm only database customers appear, then stop MySQL and apply a customer filter. The page must show an error rather than synthesize successful rows. Future preview screens continue to use only demo identities. Source `frontend/js/adapters/api.js` throws on non-2xx responses and contains no fallback or DemoAdapter import.
