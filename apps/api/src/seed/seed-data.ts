export interface SeedFile {
  type: 'file';
  name: string;
  subtitle: string;
  body: string[];
}

export interface SeedFolder {
  type: 'folder';
  name: string;
  children: SeedEntry[];
}

export type SeedEntry = SeedFile | SeedFolder;

const file = (name: string, subtitle: string, body: string[]): SeedFile => ({
  type: 'file',
  name,
  subtitle,
  body,
});

const folder = (name: string, children: SeedEntry[]): SeedFolder => ({
  type: 'folder',
  name,
  children,
});

export const DEMO_ROOM = {
  name: 'Project Atlas',
  description: 'Acquisition of Northwind Systems Ltd — due diligence materials',
  tree: [
    folder('01 Corporate', [
      file('Certificate of Incorporation.pdf', 'Companies House · filed 14 March 2016', [
        'Northwind Systems Limited',
        'Company number 10218847',
        'Incorporated in England and Wales on 14 March 2016.',
        '',
        'Registered office: 4 Prospect Row, Cambridge CB1 2AX',
      ]),
      file('Articles of Association.pdf', 'Adopted by special resolution, 2 June 2021', [
        'Part 1 — Interpretation and limitation of liability',
        'Part 2 — Directors',
        'Part 3 — Shares and distributions',
        'Part 4 — Decision-making by shareholders',
        '',
        'Amendments in this version relate to the Series B share class rights.',
      ]),
      file('Cap Table (as at 31 Mar 2026).pdf', 'Fully diluted, including option pool', [
        'Founders                        42.1%',
        'Series A — Kestrel Ventures     18.4%',
        'Series B — Halden Partners      21.7%',
        'Employee option pool            13.2%',
        'Advisers and angels              4.6%',
        '',
        'Total issued and outstanding: 12,480,915 shares',
      ]),
      folder('Board Minutes', [
        file('Board Minutes 2025-11-12.pdf', 'Regular quarterly meeting', [
          'Present: all directors. Quorum confirmed.',
          '',
          '1. Approval of Q3 management accounts',
          '2. Budget for FY2026',
          '3. Authorisation to open discussions with prospective acquirers',
        ]),
        file('Board Minutes 2026-02-04.pdf', 'Regular quarterly meeting', [
          'Present: all directors. Quorum confirmed.',
          '',
          '1. Appointment of advisers for the transaction',
          '2. Approval of the data room index',
          '3. Any other business',
        ]),
      ]),
    ]),

    folder('02 Financials', [
      file('Audited Accounts FY2024.pdf', 'Signed by Fenwick & Hale LLP', [
        'Revenue                        GBP 8.42m',
        'Gross profit                   GBP 6.11m',
        'Operating profit               GBP 0.94m',
        'Cash at bank                   GBP 3.28m',
        '',
        'Unqualified opinion. No going-concern emphasis.',
      ]),
      file('Audited Accounts FY2025.pdf', 'Signed by Fenwick & Hale LLP', [
        'Revenue                        GBP 11.96m',
        'Gross profit                   GBP 8.87m',
        'Operating profit               GBP 1.72m',
        'Cash at bank                   GBP 4.90m',
        '',
        'Unqualified opinion.',
      ]),
      file('Management Accounts Q1 FY2026.pdf', 'Unaudited, prepared by management', [
        'Quarter ended 31 March 2026',
        '',
        'Revenue                        GBP 3.44m   (+24% YoY)',
        'Net revenue retention          112%',
        'Headcount                      74',
      ]),
      file('Revenue by Customer.pdf', 'Top 20 accounts, trailing twelve months', [
        'Concentration: largest customer 9.1% of revenue.',
        'Top five customers together account for 27.8%.',
        '',
        'No customer is on notice of termination.',
      ]),
      folder('Tax', [
        file('Corporation Tax Return CT600 FY2025.pdf', 'Filed 12 September 2025', [
          'Taxable profit               GBP 1.61m',
          'R&D expenditure credit claimed on qualifying development costs.',
          'No open enquiries.',
        ]),
        file('VAT Returns 2025.pdf', 'Four quarters, all filed on time', [
          'Q1 2025 — filed 07 May 2025',
          'Q2 2025 — filed 06 Aug 2025',
          'Q3 2025 — filed 05 Nov 2025',
          'Q4 2025 — filed 04 Feb 2026',
        ]),
      ]),
    ]),

    folder('03 Legal', [
      folder('Material Contracts', [
        file('MSA — Ashford Retail Group.pdf', 'Signed 18 January 2024 · 3-year term', [
          'Master services agreement.',
          '',
          'Annual value: GBP 780,000',
          'Change of control: consent required, not to be unreasonably withheld.',
        ]),
        file('MSA — Caldera Logistics.pdf', 'Signed 03 October 2024 · 2-year term', [
          'Master services agreement.',
          '',
          'Annual value: GBP 512,000',
          'Change of control: notification only.',
        ]),
        file('Supplier Agreement — Initech Hosting.pdf', 'Renewed 01 January 2026', [
          'Infrastructure hosting and support.',
          '',
          'Committed spend: GBP 168,000 per year.',
          'Termination for convenience on 90 days notice.',
        ]),
      ]),
      folder('Disputes', [
        file('Litigation Summary.pdf', 'Prepared by Marlow & Finch, 20 March 2026', [
          'One matter outstanding.',
          '',
          'Former contractor claim regarding notice period.',
          'Estimated exposure: below GBP 40,000. Provision made in FY2025 accounts.',
        ]),
      ]),
      folder('NDAs', [
        file('Mutual NDA — Bidder A.pdf', 'Executed 22 February 2026', [
          'Mutual non-disclosure agreement.',
          'Term: 3 years from the date of execution.',
        ]),
        file('Mutual NDA — Bidder B.pdf', 'Executed 27 February 2026', [
          'Mutual non-disclosure agreement.',
          'Term: 3 years from the date of execution.',
        ]),
      ]),
    ]),

    folder('04 People', [
      file('Organisation Chart.pdf', 'As at 31 March 2026 · 74 employees', [
        'Engineering            31',
        'Customer success       14',
        'Sales and marketing    16',
        'Finance and operations  8',
        'Leadership              5',
      ]),
      file('Employee Share Options.pdf', 'EMI scheme summary', [
        'Options outstanding: 1,646,000',
        'Weighted average exercise price: GBP 0.94',
        'Full acceleration on a change of control for the leadership team only.',
      ]),
      folder('Key Employment Agreements', [
        file('Employment Agreement — CEO.pdf', 'Dated 01 April 2022', [
          'Notice period: 6 months.',
          'Post-termination restrictions: 12 months non-solicitation.',
        ]),
        file('Employment Agreement — CTO.pdf', 'Dated 01 April 2022', [
          'Notice period: 6 months.',
          'IP assignment confirmed in clause 14.',
        ]),
      ]),
    ]),

    folder('05 Technology & IP', [
      file('Architecture Overview.pdf', 'Prepared by the engineering team', [
        'Multi-tenant service, single Postgres cluster with per-tenant row scoping.',
        'Object storage for customer documents, signed-URL access only.',
        '',
        'Recovery point objective: 5 minutes. Recovery time objective: 1 hour.',
      ]),
      file('Trademark Register.pdf', 'Marks held, by jurisdiction', [
        'NORTHWIND — UK, class 42, registered 2017',
        'NORTHWIND — EU, class 42, registered 2019',
        'Device mark — UK, class 42, registered 2019',
      ]),
      file('Open Source Compliance Report.pdf', 'Scan dated 12 March 2026', [
        'No copyleft licences in distributed components.',
        '412 direct and transitive dependencies reviewed.',
        'Two packages flagged for version upgrade; neither is a licensing issue.',
      ]),
    ]),

    folder('06 Commercial', [
      file('Customer Pipeline Snapshot.pdf', 'As at 31 March 2026', [
        'Qualified pipeline           GBP 6.10m',
        'Weighted pipeline            GBP 2.24m',
        'Average sales cycle          71 days',
      ]),
      file('Churn Analysis FY2025.pdf', 'By cohort', [
        'Gross logo churn             6.8%',
        'Net revenue retention        112%',
        '',
        'No churn attributable to product reliability.',
      ]),
    ]),
  ] satisfies SeedEntry[],
};

export const ARCHIVE_ROOM = {
  name: 'Project Helios (closed)',
  description: 'Materials from the 2024 fundraise, kept for reference',
  tree: [
    folder('Investor Updates', [
      file('Investor Update 2024-Q3.pdf', 'Sent to holders of record', [
        'ARR crossed GBP 9m in the quarter.',
        'Two senior engineering hires completed.',
      ]),
      file('Investor Update 2024-Q4.pdf', 'Sent to holders of record', [
        'Full-year revenue ahead of plan by 4%.',
        'Series B process opened in January.',
      ]),
    ]),
    file('Series B Term Sheet (executed).pdf', 'Halden Partners · 11 February 2025', [
      'Pre-money valuation           GBP 62m',
      'Investment                    GBP 14m',
      'Liquidation preference        1x non-participating',
    ]),
  ] satisfies SeedEntry[],
};
