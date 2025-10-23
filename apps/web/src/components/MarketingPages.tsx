import type { ReactNode } from "react";
import { buildAppPath } from "../lib/basePath";

export type MarketingPageSlug =
  | "home"
  | "privacy"
  | "support"
  | "terms"
  | "features"
  | "pricing"
  | "faq"
  | "about";

export function marketingPageToPath(page: MarketingPageSlug) {
  switch (page) {
    case "features":
      return "/features";
    case "pricing":
      return "/pricing";
    case "faq":
      return "/faq";
    case "about":
      return "/about";
    case "privacy":
      return "/privacy";
    case "support":
      return "/support";
    case "terms":
      return "/terms";
    default:
      return "/";
  }
}

type MarketingPageProps = {
  onNavigate?: (page: MarketingPageSlug) => void;
};

type MarketingLinkProps = {
  page: MarketingPageSlug;
  children: ReactNode;
  onNavigate?: (page: MarketingPageSlug) => void;
  className?: string;
};

function MarketingLink({ page, children, onNavigate, className }: MarketingLinkProps) {
  const href = buildAppPath(marketingPageToPath(page));
  return (
    <a
      href={href}
      onClick={(event) => {
        if (onNavigate) {
          event.preventDefault();
          onNavigate(page);
        }
      }}
      className={className}
    >
      {children}
    </a>
  );
}

const PRIMARY_NAV: Array<{ page: MarketingPageSlug; label: string }> = [
  { page: "home", label: "Home" },
  { page: "features", label: "Features" },
  { page: "pricing", label: "Pricing" },
  { page: "faq", label: "FAQ" },
  { page: "support", label: "Support" },
];

const LEGAL_NAV: Array<{ page: MarketingPageSlug; label: string }> = [
  { page: "privacy", label: "Privacy" },
  { page: "terms", label: "Terms" },
  { page: "about", label: "About" },
];

function MarketingLayout({
  heading,
  intro,
  children,
  onNavigate,
}: MarketingPageProps & {
  heading: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="iTimedIT" className="h-10 w-10" />
            <div>
              <p className="text-xl font-semibold text-slate-800">iTimedIT</p>
              <p className="text-sm text-slate-500">Effortless professional time tracking</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            {PRIMARY_NAV.map(({ page, label }) => (
              <MarketingLink
                key={page}
                page={page}
                onNavigate={onNavigate}
                className="hover:text-slate-900"
              >
                {label}
              </MarketingLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">{heading}</h1>
          <p className="text-lg text-slate-600">{intro}</p>
        </div>
        <div className="space-y-12 text-slate-700">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} iTimedIT by iConnectIT. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {[...PRIMARY_NAV.slice(1), ...LEGAL_NAV].map(({ page, label }) => (
              <MarketingLink
                key={`footer-${page}`}
                page={page}
                onNavigate={onNavigate}
                className="hover:text-slate-700"
              >
                {label}
              </MarketingLink>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function FeaturesPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="Features built for productive teams"
      intro="iTimedIT combines precise tracking with smart automation so your projects stay profitable and your teams stay focused."
      onNavigate={onNavigate}
    >
      <section className="grid gap-6 md:grid-cols-2">
        <FeatureCard
          title="Intelligent Time Capture"
          description="Log time with one click, switch projects without losing context, and rely on smart reminders to keep work recorded."
        />
        <FeatureCard
          title="Budget Visibility"
          description="Set billable targets, monitor burn-down in real time, and receive alerts before projects go over budget."
        />
        <FeatureCard
          title="Client-ready Reporting"
          description="Export branded summaries, invoice-ready breakdowns, and detailed audit trails your clients can trust."
        />
        <FeatureCard
          title="Team Productivity Insights"
          description="Track utilisation, spot bottlenecks, and coach your teams with dashboards designed for managers and leads."
        />
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-50 p-10 shadow-inner">
        <h2 className="text-2xl font-semibold text-slate-900">Works the way your business already does</h2>
        <p>
          From freelancers to multi-agency teams, iTimedIT adapts to your workflow. Configure project templates,
          automate approvals, and integrate with the tools you already rely on for billing and project management.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Granular permissions for contractors, managers, and clients.</li>
          <li>Dedicated workspace per organisation with consolidated reporting.</li>
          <li>Exports in CSV, PDF, and spreadsheet-friendly formats.</li>
          <li>APIs and webhooks for custom automation.</li>
        </ul>
      </section>
    </MarketingLayout>
  );
}

export function PricingPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="Simple pricing that scales with your team"
      intro="Track time for free as a solo user and upgrade when you are ready to invite your team. Every plan includes core time tracking, reporting, and secure cloud hosting."
      onNavigate={onNavigate}
    >
      <section className="grid gap-8 md:grid-cols-3">
        <PricingPlan
          name="Free"
          price="£0"
          cadence="for solo professionals"
          bulletPoints={[
            "Single user workspace",
            "Unlimited projects & clients",
            "Real-time timers & reminders",
            "Standard exports",
          ]}
          highlight={false}
        />
        <PricingPlan
          name="Team"
          price="£15"
          cadence="per user / month"
          bulletPoints={[
            "Invite unlimited teammates",
            "Shared dashboards & approvals",
            "Budget alerts & utilisation insights",
            "Priority email support",
          ]}
          highlight
        />
        <PricingPlan
          name="Enterprise"
          price="Let’s talk"
          cadence="custom"
          bulletPoints={[
            "Everything in Team",
            "Tailored onboarding & training",
            "Advanced security review",
            "Dedicated success manager",
            "Custom integrations",
          ]}
          highlight={false}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Need help picking a plan?</h2>
        <p className="mt-2 text-slate-600">
          We can recommend the best starting point based on your project volume, reporting requirements, and team size.
          Reach out via our{" "}
          <MarketingLink page="support" onNavigate={onNavigate} className="font-medium text-orange-600">
            Support page
          </MarketingLink>{" "}
          for a personalised walkthrough.
        </p>
      </section>
    </MarketingLayout>
  );
}

export function FaqPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="Frequently asked questions"
      intro="Browse the most common questions about iTimedIT. Still looking for an answer? Our support team is ready to help."
      onNavigate={onNavigate}
    >
      <section className="space-y-6">
        {FAQ_ENTRIES.map(({ question, answer }) => (
          <article key={question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{question}</h2>
            <p className="mt-3 text-slate-700">{answer}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-slate-900 p-8 text-slate-100">
        <h2 className="text-xl font-semibold">Don’t see your question?</h2>
        <p className="mt-3">
          Drop us a line at{" "}
          <a className="font-medium text-orange-300" href="mailto:kieran@iconnectit.co.uk">
            kieran@iconnectit.co.uk
          </a>{" "}
          and we will get back to you within one business day.
        </p>
        <div className="mt-4">
          <MarketingLink page="support" onNavigate={onNavigate} className="font-medium text-orange-300 underline">
            View support options
          </MarketingLink>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function AboutPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="About iTimedIT"
      intro="iTimedIT is built by iConnectIT to help service businesses stay focused on delivering impact. We combine years of consultancy experience with modern product design."
      onNavigate={onNavigate}
    >
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Our mission</h2>
        <p>
          We believe that teams should spend more time with clients and less time wrestling spreadsheets. iTimedIT was
          created after seeing agencies, contractors, and internal teams struggle to get accurate billable data. Our
          mission is to provide tooling that is effortless, transparent, and built for collaboration.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Human-first design</h3>
          <p className="mt-2 text-slate-700">
            Everything we ship is tested with real teams. From intuitive timers to colour-coded dashboards, the product
            is designed so every teammate feels confident using it on day one.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Secure infrastructure</h3>
          <p className="mt-2 text-slate-700">
            iTimedIT runs on modern cloud infrastructure with regular backups, role-based access, and monitoring. We
            treat customer data with the same care we use for our own internal systems.
          </p>
        </article>
      </section>

      <section className="space-y-3 rounded-3xl bg-slate-50 p-8">
        <h3 className="text-lg font-semibold text-slate-900">Based in the UK, supporting teams worldwide</h3>
        <p>
          Our HQ is in the United Kingdom, but iTimedIT is trusted by teams across Europe and beyond. Wherever you are,
          we are ready to help you run smarter projects.
        </p>
      </section>
    </MarketingLayout>
  );
}

export function PrivacyPolicyPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="Privacy Policy"
      intro="We respect your privacy and are committed to protecting the personal data you share with iTimedIT."
      onNavigate={onNavigate}
    >
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Information We Collect</h2>
        <p>
          We collect information that you provide when creating an account, configuring your
          workspace, inviting team members, and recording time entries. This may include your name,
          contact details, organisation information, project metadata, and usage activity within the
          product.
        </p>
        <p>
          We also gather technical data such as device identifiers, browser type, IP address, and
          diagnostic logs generated by our services. These insights help us keep iTimedIT reliable
          and secure for every customer.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">How We Use Your Data</h2>
        <p>
          Personal information is used to deliver core product functionality, authenticate user
          access, and provide customer support. We analyse anonymised usage patterns so we can ship
          improvements that make teams more productive.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide and maintain the iTimedIT platform and related integrations.</li>
          <li>Notify you about product updates, billing notices, and service announcements.</li>
          <li>Detect, prevent, and address technical issues or unauthorised access.</li>
          <li>Comply with legal obligations and enforce our terms of service.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Data Sharing &amp; Retention</h2>
        <p>
          We only share personal data with trusted subprocessors that power essential features such
          as hosting, authentication, and secure payments. Each partner signs agreements that mirror
          our privacy commitments.
        </p>
        <p>
          Your data is retained for as long as your organisation maintains an active subscription.
          When an account is cancelled, records are queued for deletion according to our retention
          schedules unless law requires otherwise.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete the
          information we hold about you. To submit a request, contact our team using the details on
          the Support page and we will respond promptly.
        </p>
        <p>
          If you believe your privacy has been impacted, please reach out immediately so we can
          investigate and resolve the issue.
        </p>
      </section>
    </MarketingLayout>
  );
}

export function SupportPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="Support"
      intro="Need a hand with iTimedIT? Our support team is ready to help you keep work on track."
      onNavigate={onNavigate}
    >
      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Email Support</h2>
          <p>
            Reach us directly at{" "}
            <a className="font-medium text-orange-600" href="mailto:kieran@iconnectit.co.uk">
              kieran@iconnectit.co.uk
            </a>{" "}
            for onboarding help, troubleshooting, or feature questions. We aim to respond within one
            business day.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Live Walkthroughs</h2>
          <p>
            Need a tailored demo for your team? Request a live walkthrough and we will coordinate a
            session to cover configuration, integrations, and best practices.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Helpful Resources</h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>Step-by-step guides for configuring workspaces and inviting teammates.</li>
          <li>Best practices for tracking billable versus non-billable time.</li>
          <li>Tips for monitoring budgets and generating client-ready reports.</li>
        </ul>
        <p>
          We continuously add to our knowledge base so you can find answers at any hour. Let us know
          if there is a topic you would like to see covered.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Incident Response</h3>
        <p>
          iTimedIT has monitoring in place to detect service issues quickly. In the unlikely event
          of downtime or degraded performance, we will publish updates to customers and work until
          full service is restored.
        </p>
      </section>
    </MarketingLayout>
  );
}

export function TermsPage({ onNavigate }: MarketingPageProps) {
  return (
    <MarketingLayout
      heading="Terms &amp; Conditions"
      intro="These terms outline the rules for using the iTimedIT platform provided by iConnectIT."
      onNavigate={onNavigate}
    >
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Using iTimedIT</h2>
        <p>
          By creating an account you confirm that you have authority to represent your organisation
          and that you will use the service in accordance with applicable laws. You agree to keep
          login credentials secure and notify us of any unauthorised access.
        </p>
        <p>
          You are responsible for the accuracy of time entries, project data, and client
          information stored within your workspace. We provide the tools; you maintain ownership of
          the content you create.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Subscriptions &amp; Billing</h2>
        <p>
          iTimedIT is offered on a subscription basis. Fees are payable in advance for each billing
          period and are non-refundable except where required by law. We may adjust pricing or plan
          features with reasonable notice.
        </p>
        <p>
          If payment cannot be processed, we will attempt to contact you. We reserve the right to
          suspend or terminate access for unpaid accounts.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Service Commitments</h2>
        <p>
          We work to keep iTimedIT available and performant. From time to time maintenance windows
          may be required; we will schedule these during low-usage periods whenever possible.
        </p>
        <p>
          The platform is provided on an “as-is” basis. While we strive for accuracy, we do not
          guarantee that the service will be uninterrupted or error-free. Our liability is limited
          to the fees paid for your current subscription term.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Closing Your Account</h2>
        <p>
          You may cancel at any time by contacting our support team. Upon cancellation, access will
          continue until the end of the billing cycle unless otherwise agreed. We recommend
          exporting reports prior to closure for your records.
        </p>
        <p>
          These terms are updated from time to time. Continued use of iTimedIT after revisions take
          effect constitutes acceptance of the new conditions.
        </p>
      </section>
    </MarketingLayout>
  );
}

const FAQ_ENTRIES: Array<{ question: string; answer: string }> = [
  {
    question: "How quickly can we get set up?",
    answer:
      "Most teams are up and running in under a day. Create your workspace, invite teammates, and start tracking time immediately. Our support team can help with data imports or onboarding sessions if needed.",
  },
  {
    question: "Does iTimedIT integrate with our existing tools?",
    answer:
      "Yes. iTimedIT offers exports for accounting platforms and APIs for custom integrations. Our roadmap includes direct connectors for the most popular billing and project management suites.",
  },
  {
    question: "Is our data secure?",
    answer:
      "Absolutely. We use encrypted storage, role-based access controls, and continuous monitoring. Privacy and compliance are central to our platform—see the Privacy Policy for full details.",
  },
  {
    question: "Can we track billable versus non-billable time?",
    answer:
      "You can customise categories per project and report on billable versus internal time instantly. Filters make it easy to surface the data you need for invoicing or retrospectives.",
  },
];

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-slate-700">{description}</p>
    </article>
  );
}

function PricingPlan({
  name,
  price,
  cadence,
  bulletPoints,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  bulletPoints: string[];
  highlight: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-3xl border p-8 shadow-sm ${
        highlight
          ? "border-orange-200 bg-orange-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">{price}</span>
        <span className="text-sm text-slate-500">{cadence}</span>
      </div>
      <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-slate-700">
        {bulletPoints.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {highlight && (
        <p className="mt-6 text-sm font-medium text-orange-600">
          Most popular with agencies growing beyond five team members.
        </p>
      )}
    </article>
  );
}
