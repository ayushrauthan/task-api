# Stage 1 — Fetch and cache

Every real request identifies itself with the FlyRank A9 user-agent, has a 10-second timeout, checks the status code, and waits at least 500 ms between network requests.

Successful HTML is cached locally. Development reruns read cached HTML instead of repeatedly asking the sandbox for the same page.
