import { ButtonLink, PageIntro } from "@/components/ui";
export default function NotFound() {
  return (
    <div className="page-wrap narrow-page">
      <PageIntro eyebrow="404 · PAGE NOT FOUND" title="This page is not here.">
        <p>
          The link may have changed, or the article may not be published. Find
          your way back to SiteFit.
        </p>
      </PageIntro>
      <div className="button-row">
        <ButtonLink href="/">Back to Home</ButtonLink>
        <ButtonLink href="/blog" secondary>
          Read the Journal
        </ButtonLink>
      </div>
    </div>
  );
}
