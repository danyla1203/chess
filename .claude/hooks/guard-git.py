#!/usr/bin/env python3
import json
import os
import re
import shlex
import subprocess
import sys

GLOBAL_OPTS_WITH_ARG = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env", "--super-prefix"}
ALWAYS_BLOCKED = {"push", "filter-repo", "filter-branch", "replace", "update-ref", "fast-import", "rebase", "gc", "prune", "send-pack"}
OPERATORS = {";", "&", "&&", "|", "||", "(", ")", "\n"}
PROTECTED_PATHS = re.compile(r"\.claude/(settings(\.local)?\.json|hooks/)")
WRITE_VERBS = re.compile(r"(>|\bsed\s+-i|\bperl\s+-[a-z]*i|\brm\b|\bmv\b|\bcp\b|\btee\b|\bchmod\b|\btruncate\b|\bln\b)")
RM_DOT_GIT = re.compile(r"\b(rm|mv|rmdir)\b[^;&|]*(^|[\s/'\"])\.git([/\s'\"]|$)")


def deny(reason):
    sys.stderr.write(f"Blocked by .claude/hooks/guard-git.py: {reason}. Ask the user to run it themselves.\n")
    sys.exit(2)


def has(args, *flags):
    for a in args:
        if a in flags:
            return True
        for f in flags:
            if f.startswith("--") and a.startswith(f + "="):
                return True
            if len(f) == 2 and f[0] == "-" and re.fullmatch(r"-[a-zA-Z]+", a) and f[1] in a[1:]:
                return True
    return False


def resolve_alias(sub):
    try:
        out = subprocess.run(["git", "config", "--get", f"alias.{sub}"], capture_output=True, text=True, timeout=2)
    except Exception:
        return None
    return out.stdout.strip() or None


def check_git(sub, args, depth=0):
    if sub in ALWAYS_BLOCKED:
        deny(f"git {sub}")
    first = args[0] if args else ""
    if sub == "reflog" and first in {"expire", "delete"}:
        deny(f"git reflog {first}")
    if sub == "stash" and first in {"drop", "clear"}:
        deny(f"git stash {first}")
    if sub == "commit" and has(args, "--amend"):
        deny("git commit --amend")
    if sub == "reset":
        if has(args, "--hard", "--soft", "--keep", "--merge"):
            deny("git reset with a mode flag")
        before = args[: args.index("--")] if "--" in args else args
        if [a for a in before if not a.startswith("-") and a != "HEAD"]:
            deny("git reset to another commit; use `git restore --staged <path>` to unstage")
    if sub == "clean" and not has(args, "-n", "--dry-run"):
        deny("git clean")
    if sub == "checkout" and (has(args, "-f", "--force", "-B") or "--" in args or "." in args):
        deny("git checkout that discards changes")
    if sub == "switch" and has(args, "-f", "--force", "--discard-changes", "-C"):
        deny("git switch that discards changes")
    if sub == "restore" and (not has(args, "-S", "--staged") or has(args, "-W", "--worktree")):
        deny("git restore of the working tree")
    if sub == "branch" and (has(args, "-D", "-M", "-f", "--force") or (has(args, "-d", "--delete") and has(args, "-f", "--force"))):
        deny("git branch force delete/move")
    if sub == "tag" and has(args, "-d", "--delete", "-f", "--force"):
        deny("git tag delete/overwrite")
    if sub == "worktree" and first == "remove" and has(args, "-f", "--force"):
        deny("git worktree remove --force")
    if sub == "remote" and first in {"remove", "rm", "set-url"}:
        deny(f"git remote {first}")
    if sub == "config" and any(a.startswith("alias.") or a.lower() == "core.hookspath" for a in args):
        deny("git config of aliases or core.hooksPath")
    if depth < 3 and sub and not sub.startswith("-"):
        alias = resolve_alias(sub)
        if alias:
            if alias.startswith("!"):
                scan(alias[1:], depth + 1)
            else:
                expanded = shlex.split(alias)
                check_git(expanded[0], expanded[1:] + args, depth + 1)


def check_tokens(tokens, depth):
    for i, tok in enumerate(tokens):
        if os.path.basename(tok) != "git":
            continue
        j = i + 1
        while j < len(tokens) and tokens[j] not in OPERATORS and tokens[j].startswith("-"):
            opt = tokens[j]
            if opt in GLOBAL_OPTS_WITH_ARG:
                if opt == "-c" and j + 1 < len(tokens) and tokens[j + 1].startswith("alias."):
                    deny("git -c alias.*")
                j += 2
            else:
                if opt.startswith("--config-env=") or opt.startswith("-calias."):
                    deny("git config override")
                j += 1
        if j >= len(tokens) or tokens[j] in OPERATORS:
            continue
        end = j + 1
        while end < len(tokens) and tokens[end] not in OPERATORS:
            end += 1
        check_git(tokens[j], tokens[j + 1 : end], depth)
    for tok in tokens:
        if tok not in OPERATORS and re.search(r"\bgit\b|\bbfg\b", tok) and " " in tok:
            scan(tok, depth + 1)


def scan(cmd, depth=0):
    if depth > 4:
        return
    if re.search(r"\bbfg\b", cmd):
        deny("bfg")
    if re.search(r"\bgh\s+repo\s+delete\b", cmd):
        deny("gh repo delete")
    if RM_DOT_GIT.search(cmd):
        deny("removing or moving .git")
    if PROTECTED_PATHS.search(cmd) and WRITE_VERBS.search(cmd):
        deny("modifying Claude guard config")
    try:
        lexer = shlex.shlex(cmd, posix=True, punctuation_chars=";&|()")
        lexer.whitespace_split = True
        lexer.commenters = ""
        tokens = list(lexer)
    except ValueError:
        if re.search(r"\bgit\b", cmd):
            deny("unparseable command containing git")
        return
    check_tokens(tokens, depth)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    if data.get("tool_name") != "Bash":
        return
    scan(data.get("tool_input", {}).get("command", ""))


if __name__ == "__main__":
    main()
