# Git & GitHub — quick guide for this team

You don't need to know all of git. You need about 10 commands. Here they are.

## One-time setup (each teammate, once)

1. Make a GitHub account if you don't have one: https://github.com/signup
2. Install git: https://git-scm.com/downloads
3. Tell git who you are (use your real name and the email tied to your
   GitHub account — this is what shows up as the commit author):
   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
4. Ask the repo owner (Shankararam) to add you as a **collaborator** on the
   GitHub repo: Settings → Collaborators → add your GitHub username. Accept
   the invite email.
5. Clone the repo to your laptop:
   ```
   git clone https://github.com/Shankar-147/motiq-team-project.git
   cd motiq-team-project
   ```

## Every time you sit down to work

```
git checkout main
git pull                      # get the latest changes from GitHub
git checkout -b <module>/<what-you're-doing>    # e.g. matching/provider-search
```

## While working

```
git status                    # see what files you've changed
git add <file>                # stage a file you want to commit (or `git add .` for all)
git commit -m "short message describing what you just did"
```

Commit often — every time something works, not just at the end of the day.
Small, frequent, honest commits are the whole point.

## Sending your work to GitHub

```
git push -u origin <your-branch-name>
```

The first time, this prints a link — open it, or go to the repo on
GitHub.com, and click **"Compare & pull request"** to open a PR into `main`.
Ask a teammate to review it, then click **Merge**.

## Getting other people's changes

```
git checkout main
git pull
```

## Cheatsheet table

| I want to... | Command |
|---|---|
| See what changed | `git status` |
| See the actual line changes | `git diff` |
| Stage a file | `git add <file>` |
| Commit staged changes | `git commit -m "message"` |
| Push my branch | `git push -u origin <branch>` |
| Switch branches | `git checkout <branch>` |
| Make a new branch | `git checkout -b <branch>` |
| Get latest from GitHub | `git pull` |
| See commit history | `git log --oneline` |

## Common mistakes to avoid

- **Don't commit to `main` directly.** Always work on your own branch.
- **Don't commit `node_modules`, `.env`, or build output.** The `.gitignore`
  already excludes these — if `git status` shows them, something's wrong,
  ask before committing.
- **Write commit messages that say what you did**, e.g.
  `"Add OTP verify endpoint"` not `"update"` or `"fix"`.
- **If you're stuck or about to force-push, stop and ask** — force-pushing
  can delete teammates' work.
