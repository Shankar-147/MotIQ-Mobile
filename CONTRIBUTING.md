# Contributing

## Workflow

1. Claim a module in [MODULES.md](MODULES.md).
2. Branch off `main`: `<module>/<short-task>` (e.g. `auth/otp-login`).
3. Commit in small, real steps as you build — see [GIT_GUIDE.md](GIT_GUIDE.md)
   if you're new to git.
4. Open a PR into `main`. One teammate reviews before merge.
5. No direct commits to `main`.

## Code style

- TypeScript, strict mode.
- Backend: NestJS conventions — thin controllers, logic in services.
- Money values: use `Decimal`, never `number`/`float`.
- No secrets or config values hardcoded — use `.env` (never commit `.env`,
  only `.env.example`).

## Commit messages

Short, present-tense, specific: `"Add OTP verify endpoint"`, not `"stuff"`
or `"fix bug"`.
