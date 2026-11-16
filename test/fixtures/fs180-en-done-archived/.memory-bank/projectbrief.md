# Project Brief

## Mission

**Tip Splitter** — a tiny HTTP service that splits a restaurant bill fairly across several
people. It takes bill amount, tip percentage and number of people, and returns the amount
per person and the total tip.

## Primary users

A group of guests at a restaurant table who want to know within seconds what everyone owes.

## Success criteria

- Given bill amount, tip percentage and number of people, the service returns the amount per
  person and the total tip.
- The split is fair: the per-person amounts add up to the billed total including tip, with no
  money lost or invented by rounding.
- Invalid input (missing, non-numeric, negative, zero people) is rejected with a clear error
  instead of a wrong number.
- An answer arrives in seconds at the table: a single request, no setup, no account.
- The calculation core is covered by unit tests and stays free of HTTP concerns.
