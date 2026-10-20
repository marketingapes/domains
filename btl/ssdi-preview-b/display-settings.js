'use strict';
window.SSDI_DISPLAY=Object.freeze({
  "brand": {
    "name": "Jeffrey Glassman Injury Lawyers",
    "short_name": "Glassman",
    "logo": "glassman-logo.svg",
    "ink": "#264861",
    "accent": "#f59e0b"
  },
  "campaign_id": "SSDI-PILOT-001",
  "questions": [
    "What is the fictional person\u2019s work status?",
    "Does the sample include work covered by Social Security?",
    "How long are the limitations expected to last?",
    "What stage is this fictional claim at?",
    "Which state belongs to the sample?",
    "Does the sample mention an existing lawyer?"
  ],
  "samples": {
    "standard": {
      "label": "Sample A",
      "duration": "Example: expected to last 12+ months",
      "work": "Example: work credits need human review",
      "represented": "No \u00b7 fictional answer"
    },
    "uncertain": {
      "label": "Sample B",
      "duration": "Example: duration needs clarification",
      "work": "Uncertain \u00b7 human review needed",
      "represented": "No \u00b7 fictional answer"
    },
    "represented": {
      "label": "Sample C",
      "duration": "Example: expected to last 12+ months",
      "work": "Example: work credits need human review",
      "represented": "Yes \u00b7 existing representation; human review"
    }
  }
});
