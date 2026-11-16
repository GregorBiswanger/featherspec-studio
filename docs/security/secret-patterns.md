# Secret patterns for masking

FeatherSpec Studio masks text before it stores a run or an event (spec 0004, BR-005, PD-029). Two things are
replaced by `[masked]`: the values of credentials Studio holds, and every match of a pattern below. Masking is
**best effort**: a secret split across two events, or one that no pattern describes, is not recognised.

Studio does not read `.env` files. A test keeps this list and the code (`src/core/runtime/masking.ts`) equal;
change both in one change set. A pattern is a JavaScript regular expression.

| Name | Category | Pattern | Flags | Sample |
| --- | --- | --- | --- | --- |
| `github-token` | `provider-token` | `\bgh[pousr]_[A-Za-z0-9]{36,}` | `g` | `ghp_0123456789abcdefghijklmnopqrstuvwxyz` |
| `github-fine-grained-token` | `provider-token` | `github_pat_[A-Za-z0-9_]{22,}` | `g` | `github_pat_11ABCDEFG0123456789_abcdefghijklmnop` |
| `anthropic-key` | `provider-token` | `sk-ant-[A-Za-z0-9_-]{20,}` | `g` | `sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV` |
| `secret-key` | `provider-token` | `\bsk-[A-Za-z0-9_-]{20,}` | `g` | `sk-0123456789abcdefghijklmnop` |
| `bearer-token` | `bearer-token` | `\bBearer\s+[A-Za-z0-9._~+/=-]{16,}` | `gi` | `Bearer abcdef0123456789ABCDEF` |
| `private-key-block` | `private-key` | `-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----` | `g` | `-----BEGIN PRIVATE KEY-----MIIBVgIBADANBgkq-----END PRIVATE KEY-----` |

The samples are made up and match no real credential. Minimum lengths (not fixed lengths) keep the patterns
working for token formats that have no fixed length.
