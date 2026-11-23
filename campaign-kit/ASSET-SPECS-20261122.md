# Campaign asset export matrix

Checked November 22, 2026. This is a production design specification, not evidence of platform approval or a published campaign. Exact placement, account eligibility and provider validation still govern delivery. No image/video was created, uploaded or activated for this change.

## Reusable master exports

These are our working exports. Keep the editable original; render a separate crop for each placement rather than stretching one file.

| Master | Export | Intended use |
| --- | --- | --- |
| Square | 1200 × 1200, 1:1, JPG/PNG | Google square, OpenAI square; Meta square adaptation after placement validation |
| Feed portrait | 1440 × 1800, 4:5, JPG/PNG | Meta feed design master; export Google portrait separately at 960 × 1200 |
| Full-screen portrait | 1440 × 2560, 9:16, JPG/PNG | Meta Stories/Reels design master; placement-specific safe-zone check required |
| Google landscape | 1200 × 628, approximately 1.91:1, JPG/PNG | Google PMax landscape image |
| Web share | 1200 × 630, JPG/PNG | House Open Graph share crop; separate from Google's 1200 × 628 ad export |
| Square logo | 1200 × 1200, PNG | Google square logo and separate brand avatar adaptations |
| Wide logo | 1200 × 300, 4:1, PNG | Google landscape logo |
| Portrait video | 1080 × 1920, 9:16, MP4 | TikTok/vertical video master; 15- and 30-second cuts are our starting recommendation |
| Landscape video | 1920 × 1080, 16:9, MP4 | Google/YouTube landscape master |
| Square video | 1080 × 1080, 1:1, MP4 | Google square video adaptation |

The Meta resolutions above are internal master choices, not a claim that current Meta requirements were independently verified. Its official Ads Guide redirected to a login/temporary-block page in this audit. Do not promote third-party summaries into hard upload rules.

## Verified platform requirements and remaining checks

| Platform / placement | Verified official requirements | Working export / remaining check |
| --- | --- | --- |
| Google PMax landscape | 1.91:1; recommended 1200 × 628, minimum 600 × 314 | Use the landscape master. At least one landscape image is required by the asset-group API. |
| Google PMax square | 1:1; recommended 1200 × 1200, minimum 300 × 300 | Use square master. At least one square image is required. |
| Google PMax portrait | Optional 4:5; recommended 960 × 1200, minimum 480 × 600 | Export a dedicated 960 × 1200 crop. |
| Google PMax logos | Square: recommended 1200 × 1200, minimum 128 × 128. Optional 4:1: recommended 1200 × 300, minimum 512 × 128 | Bind logos at the campaign or asset-group level appropriate to brand-guidelines configuration. |
| Google PMax video | Optional YouTube video; horizontal, square or vertical; API minimum duration 10 seconds | Use 15-/30-second cuts; Google recommends 10–60-second assets. Supplying no video can allow automatic generation. |
| TikTok auction Non-Spark | 9:16 ≥540 × 960; 16:9 ≥960 × 540; 1:1 ≥640 × 640. Up to 10 minutes, ≤500 MB, bitrate ≥516 kbps. MP4/MOV/MPEG/3GP/AVI | Prefer 1080 × 1920 MP4. Apply the official safe-zone template for the exact caption/anchor format. |
| TikTok reservation / Reach & Frequency, Non-Spark and Spark Push | Same three dimension floors; 5–60 seconds, recommended 9–15 seconds; ≤500 MB; bitrate ≥2500 kbps; MP4/MOV/MPEG/3GP | A 15-second portrait cut fits this duration guidance. Do not apply the auction 10-minute allowance here. |
| OpenAI Ads Manager bulk image | PNG/JPG, square, no larger than 1200 × 1200; direct publicly accessible image URL | Use 1200 × 1200 JPG/PNG. No video size is asserted. |
| OpenAI Ads API image | JPEG/PNG/WebP, at least 640 × 640; upload returns a file ID used by the ad | The same 1200-square JPG/PNG is the conservative shared export. API and bulk-upload constraints are separate surfaces. |
| Meta Feed, Stories, Reels | Current exact limits were not retrieved from the Ads Guide; official API supports placement-level media validation | Use the masters above for design, then validate the actual objective/placement and uploaded asset before creation. Mark Meta specs NEEDS VERIFICATION. |

Google's image-help page specifies JPG/PNG, a 5 MB maximum and keeping key content in the center 80%. Its API table expresses the cap as 5120 KB and also lists GIF; use JPG/PNG for a shared workflow. Aspect ratio is checked when linking an asset to its field type, so a successful upload alone does not prove suitability. Keep Google-derived limits within this Google scope.

TikTok Spark Pull has different rules tied to an already-published organic post. The non-Spark rows above are not a substitute for Spark authorization or format validation.

## Web-image and metadata contract

Use an explicit HTTPS canonical URL, matching `og:url`, absolute `og:image`, descriptive title and description, and a Twitter card. Open Graph defines title, type, image and URL as its basic required properties; dimensions and image alt text are additional fields. The generator emits measured image dimensions only when a local file can actually be inspected.

1200 × 630 is our share-image export convention, not a universal web or ad rule. Existing Bard PowerPort's 1300 × 650 share reference remains an asset mismatch in the existing manifest; this patch does not silently crop it or claim it was optimized. The provider-review preview uses the existing BTL brand share image, not a newly produced campaign creative.

House performance targets, separate from platform caps: aim for ≤300 KB for share images and ≤250 KB per responsive hero candidate when visual quality permits. Prefer appropriately sized WebP/AVIF for page photography with a suitable fallback; retain JPG/PNG exports for ad surfaces that require them. Inspect at mobile size, set layout dimensions, and keep lazy loading on below-the-fold images. This change does not perform image conversion or compression.

## Primary sources

- [Google PMax image specifications](https://support.google.com/google-ads/answer/14530211?hl=en)
- [Google Ads API asset requirements](https://developers.google.com/google-ads/api/performance-max/asset-requirements)
- [Google PMax asset-group best practices](https://support.google.com/google-ads/answer/14528220?hl=en)
- [TikTok auction in-feed specifications, updated June 2026](https://ads.tiktok.com/resources/help/article/tiktok-auction-in-feed-ads?lang=en)
- [TikTok reservation / Reach & Frequency specifications](https://ads.us.tiktok.com/resources/help/article/tiktok-reservation-in-feed-ads-reach-frequency)
- [OpenAI Ads Manager launch / bulk-upload guide](https://help.openai.com/en/articles/20001209-launch-campaigns)
- [OpenAI Ads API campaign-management guide](https://developers.openai.com/ads/campaign-management)
- [Meta media-level placement validation](https://developers.facebook.com/docs/business-management-apis/business-creative-asset-management/guides/media-level-ad-format-validation/)
- [Meta Feed image guide — content unavailable in this audit](https://www.facebook.com/business/ads-guide/update/image/facebook-feed)
- [Meta Stories image guide — content unavailable in this audit](https://www.facebook.com/business/ads-guide/update/image/instagram-story)
- [Open Graph specification](https://ogp.me/)
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
