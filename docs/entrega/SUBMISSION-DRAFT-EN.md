# Draft for team review only

## title

Wayfinder: Clear paths to public services

## short

Wayfinder uses IBM Bob to organize and maintain public-service catalogs. Citizens find requirements and official entry points in a browser extension. Site teams audit sources, compare changes and export a usable procedures index.

## description

Public-service websites often reflect an institution's structure rather than the task a citizen needs to complete. People search through menus, while small web teams manually collect requirements, maintain links and check changes.

Wayfinder connects those two problems. Citizens use a browser extension on the official website, search in everyday language, read sourced requirements and follow highlighted links to the next step. They can ask Bob for guidance when search is insufficient. The citizen completes the actual procedure on the official service. Wayfinder does not submit forms or request credentials.

For the site team, IBM Bob organizes extracted page evidence into a catalog through bounded parallel tasks. A second Bob pass reviews selected records against their sources. The motor measures link paths, compares successive catalog readings and exports an accessible A-Z index plus structured GovernmentService data. Custom Bob IDE modes, skills and an MCP server provide a development workflow for catalog maintenance.

The prototype includes municipal examples in Argentina and catalogs from other public websites. Coverage is explicit and bounded: login-only or JavaScript-heavy content can remain missing. Model review is a second automated check, not human certification.

In a controlled 16-procedure fixture with simulated Bob, the first procedures appeared at 3.4 seconds, versus 10.4 seconds for the complete reviewed catalog. On 92 synthetic Spanish validation queries, instant search reached 69.6% top-1, compared with 66.3% for BM25. These are development benchmarks, not measured population-wide outcomes or a human labor-saving study.

We also prepared 3,750 public procedure records and ran bilingual IBM Granite retrieval experiments. Granite remains separate from production because improvements were inconsistent across language directions. The live assistant uses Bob, while instant search runs without a model call.

The deliverable combines an operational citizen interface with reproducible evidence and concrete maintenance outputs for the team responsible for the site.

## bob_usage

IBM Bob runs inside Wayfinder through Bob Shell 2.0.5, rather than appearing only as a coding credit. The Node.js motor sends bounded public-page evidence to Bob and validates the returned block and link IDs. Catalog tasks can run concurrently. A second Bob task reviews each accepted record against the evidence. The assistant uses Bob to select existing catalog records and ask clarifying questions, with server-owned links and citation checks.

The repository also defines three IBM Bob IDE modes: Catalog Coordinator, Cartographer and Technical Reviewer. Two skills audit catalogs and measure impact. A stdio MCP server exposes six read-only tools: list sites, search a procedure, inspect a record, compare changes, generate an index and audit the catalog. These IDE configurations are included as reproducible workflow assets; an unrecorded IDE session is not presented as executed evidence.

Real Bob task IDs and measurements are recorded in the handoff log and evidence files. Automated tests use simulated Bob responses for reproducibility, and those benchmarks are explicitly labeled. The runtime disables general-purpose tools for public-content calls so untrusted pages cannot issue shell or editing instructions.

We additionally used IBM Granite's multilingual 97M embedding model in separate retrieval-training experiments. It is not deployed in the citizen experience. We do not claim to use watsonx.ai or watsonx Orchestrate.

## repository

https://github.com/candepilar/wayfinder

## demo

https://andromedaweb.store/wayfinder/

## status

DRAFT FOR TEAM REVIEW. Do not submit to IBM/lablab without Franco approval.