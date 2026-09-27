# Narration for review

## 1. Wayfinder

This is Wayfinder, built by Candela and Franco. A citizen wants to complete a procedure, not understand how a government website is organized. At the same time, the team maintaining that website has to keep requirements, entry points and guidance accurate. We connect those needs: a browser guide for citizens, backed by a catalog maintenance workflow that uses IBM Bob.

## 2. The maintenance problem

The problem begins with scattered information. Requirements live on one page, the application link on another, and menus reflect the institution rather than the person asking for help. Maintaining a useful guide becomes repetitive work. Wayfinder reads a bounded set of public pages and organizes the evidence into records the citizen and the development team can both use.

## 3. A citizen’s next step

Here is a real query from our public demonstration: I need to renew my driving licence. Where do I start? Bob selects an existing procedure record. The interface presents the source and the supporting text. If we did not identify a direct application link, it says so. The extension adds guidance over the open website, including link highlighting, a checklist and the ability to continue a previous journey.

## 4. The site team’s workflow

For the site team, the workflow starts with public page evidence. The motor divides that evidence into bounded Bob tasks, which can run concurrently. A second Bob pass reviews selected records against their sources. Successive readings can reveal changed requirements and missing entry points. The team can export an accessible procedures index and structured data, turning the audit into something concrete it can publish.

## 5. What IBM Bob actually does

Bob is part of the running product. It organizes catalogs and selects existing records for conversational guidance. The server validates identifiers and keeps links under application control. In one real test, Bob included an uncited number. We kept the citation guard and removed the unsupported summary while preserving valid evidence. The repository also includes coordinator, cartographer and reviewer modes, skills and six MCP tools. Configuration files are not presented as proof of an unrecorded IDE session.

## 6. Measured results

We measured instant search on the same ninety-two synthetic Spanish validation questions and thirty-five hundred and twelve documents. Wayfinder reached sixty-nine point six percent top-one, compared with sixty-six point three for BM25. In a separate controlled sixteen-procedure fixture, initial results appeared at three point four seconds and the full reviewed catalog at ten point four seconds. That timing uses simulated Bob. These are development measurements, not population-wide accuracy or proven human labor savings.

## 7. Granite research

We also explored a small multilingual IBM Granite retrieval model using thirty-seven hundred and fifty public procedure records and English and Spanish examples. It remains separate from production. Later training did not improve our validation results, so we preserved the previous candidate rather than claiming a breakthrough. The live product continues to use instant search and Bob. Independent citizen queries and a deployment benchmark are the next gates for that research.

## 8. A working prototype to try

The prototype is online and the repository is public. You can try the web demonstration or install the extension in developer mode. Our next step is to test complete citizen journeys and measure maintenance work with real site teams. Wayfinder guides people to official services, and gives the team responsible for those services a way to inspect and maintain the information. Thank you.