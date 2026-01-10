# Project Instructions

## Temporary Files

Never use `/tmp` or system temp directories. Use the project-relative `.tmp/` directory instead.

Never use heredocs with python3 - they trigger permission prompts despite allowlist patterns:

```bash
# Good - write to temp file first
Write .tmp/script.py, then: python3 .tmp/script.py

# Bad - heredocs don't match permission patterns
python3 << 'EOF'
...
EOF
```

This directory is gitignored and within the sandbox allowlist.

## Skills Development

When working on skills (creating, editing, or debugging skills in this project), fetch the official Anthropic skills documentation first:

```
WebFetch: https://code.claude.com/docs/en/skills
Prompt: Extract the complete guide for creating, configuring, and best practices for Claude Code skills
```

This ensures we follow current best practices and avoid hallucinations about skill syntax and capabilities.
