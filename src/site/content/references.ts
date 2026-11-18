/**
 * Research references cited on public pages. One registry so the same study is always cited the same
 * way. `url` points to the publisher, an author copy, or an official summary. Sources marked in
 * docs/REFERENCE_RESEARCH.md were read during research; the others are standard references whose
 * citation details were checked against search results on 2026-11-17 (see docs/CONTENT_QUALITY.md).
 */
export interface Reference {
  key: string;
  /** In-text citation, e.g. "Siegler & Ramani, 2008". */
  short: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  url: string;
}

const R = (key: string, short: string, authors: string, year: number, title: string, venue: string, url: string): Reference => ({ key, short, authors, year, title, venue, url });

export const REFERENCES = {
  gelman1978: R("gelman1978", "Gelman & Gallistel, 1978", "Gelman, R. & Gallistel, C. R.", 1978, "The Child's Understanding of Number", "Harvard University Press", "https://www.hup.harvard.edu/books/9780674116375"),
  lecorre2007: R("lecorre2007", "Le Corre & Carey, 2007", "Le Corre, M. & Carey, S.", 2007, "One, two, three, four, nothing more: An investigation of the conceptual sources of the verbal counting principles", "Cognition, 105, 395–438", "https://doi.org/10.1016/j.cognition.2006.10.005"),
  clements1999: R("clements1999", "Clements, 1999", "Clements, D. H.", 1999, "Subitizing: What is it? Why teach it?", "Teaching Children Mathematics, 5(7), 400–405", "https://doi.org/10.5951/TCM.5.7.0400"),
  siegler2008: R("siegler2008", "Siegler & Ramani, 2008", "Siegler, R. S. & Ramani, G. B.", 2008, "Playing linear numerical board games promotes low-income children's numerical development", "Developmental Science, 11(5), 655–661", "https://pubmed.ncbi.nlm.nih.gov/18801120/"),
  siegler2004: R("siegler2004", "Siegler & Booth, 2004", "Siegler, R. S. & Booth, J. L.", 2004, "Development of numerical estimation in young children", "Child Development, 75(2), 428–444", "https://doi.org/10.1111/j.1467-8624.2004.00684.x"),
  hirshpasek2015: R("hirshpasek2015", "Hirsh-Pasek et al., 2015", "Hirsh-Pasek, K. et al.", 2015, "Putting education in “educational” apps: Lessons from the science of learning", "Psychological Science in the Public Interest, 16(1), 3–34", "https://www.psychologicalscience.org/publications/educational-apps.html"),
  fisher2014: R("fisher2014", "Fisher, Godwin & Seltman, 2014", "Fisher, A. V., Godwin, K. E. & Seltman, H.", 2014, "Visual environment, attention allocation, and learning in young children: When too much of a good thing may be bad", "Psychological Science, 25(7), 1362–1370", "https://doi.org/10.1177/0956797614533801"),
  fyfe2015: R("fyfe2015", "Fyfe & Rittle-Johnson, 2016", "Fyfe, E. R. & Rittle-Johnson, B.", 2016, "Feedback both helps and hinders learning: The causal role of prior knowledge", "Journal of Educational Psychology, 108(1), 82–97 (online 2015)", "https://news.vanderbilt.edu/files/FyfeRittleJohnson2015_JEP.pdf"),
  sweller2019: R("sweller2019", "Sweller, van Merriënboer & Paas, 2019", "Sweller, J., van Merriënboer, J. J. G. & Paas, F.", 2019, "Cognitive architecture and instructional design: 20 years later", "Educational Psychology Review, 31(2), 261–292", "https://doi.org/10.1007/s10648-019-09465-5"),
  fazio2019: R("fazio2019", "Fazio & Marsh, 2019", "Fazio, L. K. & Marsh, E. J.", 2019, "Retrieval-based learning in children", "Current Directions in Psychological Science, 28(2), 111–116", "https://doi.org/10.1177/0963721418806673"),
  vlach2012: R("vlach2012", "Vlach & Sandhofer, 2012", "Vlach, H. A. & Sandhofer, C. M.", 2012, "Distributing learning over time: The spacing effect in children's acquisition and generalization of science concepts", "Child Development, 83(4), 1137–1144", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3399982"),
  cepeda2006: R("cepeda2006", "Cepeda et al., 2006", "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T. & Rohrer, D.", 2006, "Distributed practice in verbal recall tasks: A review and quantitative synthesis", "Psychological Bulletin, 132(3), 354–380", "https://doi.org/10.1037/0033-2909.132.3.354"),
  cimpian2007: R("cimpian2007", "Cimpian et al., 2007", "Cimpian, A., Arce, H. C., Markman, E. M. & Dweck, C. S.", 2007, "Subtle linguistic cues affect children's motivation", "Psychological Science, 18(4), 314–316", "https://doi.org/10.1111/j.1467-9280.2007.01896.x"),
  macnamara2023: R("macnamara2023", "Macnamara & Burgoyne, 2023", "Macnamara, B. N. & Burgoyne, A. P.", 2023, "Do growth mindset interventions impact students' academic achievement? A systematic review and meta-analysis", "Psychological Bulletin, 149(3–4), 133–173", "https://doi.org/10.1037/bul0000352"),
  deci1999: R("deci1999", "Deci, Koestner & Ryan, 1999", "Deci, E. L., Koestner, R. & Ryan, R. M.", 1999, "A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation", "Psychological Bulletin, 125(6), 627–668", "https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf"),
  meyer2019: R("meyer2019", "Meyer et al., 2019", "Meyer, M., Adkins, V., Yuan, N., Weeks, H. M., Chang, Y.-J. & Radesky, J.", 2019, "Advertising in young children's apps: A content analysis", "Journal of Developmental & Behavioral Pediatrics, 40(1), 32–39", "https://doi.org/10.1097/DBP.0000000000000622"),
  frydman1988: R("frydman1988", "Frydman & Bryant, 1988", "Frydman, O. & Bryant, P.", 1988, "Sharing and the understanding of number equivalence by young children", "Cognitive Development, 3(4), 323–339", "https://www.sciencedirect.com/journal/cognitive-development/vol/3/issue/4"),
  lally2010: R("lally2010", "Lally et al., 2010", "Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W. & Wardle, J.", 2010, "How are habits formed: Modelling habit formation in the real world", "European Journal of Social Psychology, 40(6), 998–1009", "https://doi.org/10.1002/ejsp.674"),
  aap2016: R("aap2016", "American Academy of Pediatrics, 2016", "American Academy of Pediatrics, Council on Communications and Media", 2016, "Media and young minds", "Pediatrics, 138(5), e20162591", "https://doi.org/10.1542/peds.2016-2591"),
  who2019: R("who2019", "World Health Organization, 2019", "World Health Organization", 2019, "Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age", "WHO", "https://www.ncbi.nlm.nih.gov/books/NBK541173/"),
  ccss: R("ccss", "Common Core State Standards, 2010", "National Governors Association Center for Best Practices & Council of Chief State School Officers", 2010, "Common Core State Standards for Mathematics", "NGA Center & CCSSO", "https://www.thecorestandards.org/Math/"),
} satisfies Record<string, Reference>;

export type RefKey = keyof typeof REFERENCES;

export const cite = (k: RefKey) => REFERENCES[k].short;
