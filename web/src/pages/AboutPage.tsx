import { Grid, Column, Tile, Tag } from "@carbon/react";

export default function AboutPage() {
  return (
    <Grid fullWidth>
      <Column sm={4} md={8} lg={16}>
        <div className="reader-max" style={{ paddingTop: 16 }}>
          <Tile style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>How this works</div>
            <div style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.6 }}>
              This is a static GitHub Pages app. A scheduled GitHub Action fetches RSS feeds,
              scores articles, and writes <Tag type="cool-gray">data/digest.json</Tag>.
              Your browser renders the digest using IBM Carbon components (g100 dark theme).
            </div>

            <div style={{ marginTop: 16, opacity: 0.85, lineHeight: 1.6 }}>
              If you want to tune the results:
              <ul style={{ marginTop: 8 }}>
                <li>Edit <b>scripts/defaultConfig/sources.json</b> to enable/disable feeds or adjust priority/credibility.</li>
                <li>Edit <b>scripts/defaultConfig/settings.json</b> to tune weights and time budget.</li>
                <li>Edit <b>scripts/defaultConfig/industries.json</b> and <b>clients.json</b> to refine boosts.</li>
              </ul>
            </div>
          </Tile>
        </div>
      </Column>
    </Grid>
  );
}
