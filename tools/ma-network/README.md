# Marketing Apes Network footer

Every network site carries one footer line, "<hostname> is part of the Marketing Apes Network",
linking to https://marketingapes.com/marketing-apes-network/ (absolute URL).

- `apply_footer.py <folder> <hostname> ...` adds the line to hand-built pages. It is idempotent
  (pages with the `<!-- ma-network-footer -->` marker are skipped), so run it again after adding pages.
- The AdSense generators in `tools/adsense-builders/` emit the same line in their footer template,
  so a rebuild keeps it.
- Preview, campaign, client, review and portal folders, and redirect pages, are skipped on purpose.
